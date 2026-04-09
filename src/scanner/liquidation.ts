import type { MEVOpportunity } from "../core/types.js";
import type { Config } from "../core/config.js";
import { logger } from "../core/logger.js";

interface MarginFiAccount {
  address: string;
  healthFactor: number;
  debtUsd: number;
  collateralUsd: number;
  maxLiquidatableUsd: number;
}

async function fetchAtRiskAccounts(): Promise<MarginFiAccount[]> {
  try {
    const res = await fetch(
      "https://marginfi-api.mngo.cloud/v0/liquidatable_accounts"
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      accounts?: MarginFiAccount[];
    };
    return data.accounts ?? [];
  } catch {
    return [];
  }
}

export async function scanLiquidationOpportunities(
  config: Config
): Promise<MEVOpportunity[]> {
  const opportunities: MEVOpportunity[] = [];
  const LIQUIDATION_BONUS_PCT = 0.05;
  const UNWIND_SLIPPAGE_PCT = 0.015;

  const accounts = await fetchAtRiskAccounts();

  for (const account of accounts) {
    if (account.healthFactor > 1.05) continue;

    const closeableUsd = Math.min(account.maxLiquidatableUsd, account.debtUsd);
    if (closeableUsd <= 0) continue;

    const healthGap = Math.max(0, 1 - account.healthFactor);
    const modeledBonusPct = Math.min(
      LIQUIDATION_BONUS_PCT,
      LIQUIDATION_BONUS_PCT * (0.5 + healthGap * 10)
    );
    const liquidationBonusUsd = closeableUsd * modeledBonusPct;
    const unwindCostUsd = closeableUsd * UNWIND_SLIPPAGE_PCT;
    const estimatedProfitUsd = liquidationBonusUsd;
    const gasEstimateUsd = 0.1 + unwindCostUsd;
    const netProfitUsd = estimatedProfitUsd - gasEstimateUsd;

    if (netProfitUsd < config.MIN_PROFIT_USD) continue;

    const confidence = account.healthFactor < 1.0 ? 0.9 : 0.6;
    const verdict: MEVOpportunity["verdict"] =
      netProfitUsd >= config.MIN_PROFIT_USD * 2 && confidence >= 0.8
        ? "act"
        : confidence >= config.MIN_CONFIDENCE
          ? "watch"
          : "skip";

    const opp: MEVOpportunity = {
      id: `liq-${account.address.slice(0, 8)}`,
      type: "liquidation_arb",
      verdict,
      estimatedProfitUsd,
      gasEstimateUsd,
      netProfitUsd,
      confidence,
      timeWindowMs: 5000,
      rationale: `Account ${account.address.slice(0, 8)}... has health factor ${account.healthFactor.toFixed(3)}. Modeled liquidation bonus ${(modeledBonusPct * 100).toFixed(2)}% on $${closeableUsd.toFixed(0)} closeable debt, less unwind cost of $${unwindCostUsd.toFixed(2)}.`,
      detectedAt: Date.now(),
    };

    opportunities.push(opp);
    logger.info(
      `Liquidation watch: ${account.address.slice(0, 8)}... HF=${account.healthFactor.toFixed(3)} net=$${netProfitUsd.toFixed(2)} verdict=${verdict}`
    );
  }

  return opportunities;
}
