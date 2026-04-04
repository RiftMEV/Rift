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

  const accounts = await fetchAtRiskAccounts();

  for (const account of accounts) {
    if (account.healthFactor > 1.05) continue;

    const discountPct = (1 - account.healthFactor) * 100;
    const estimatedProfitUsd = (discountPct / 100) * account.maxLiquidatableUsd;
    const gasEstimateUsd = 0.1;
    const netProfitUsd = estimatedProfitUsd - gasEstimateUsd;

    if (netProfitUsd < config.MIN_PROFIT_USD) continue;

    const confidence = account.healthFactor < 1.0 ? 0.9 : 0.6;

    const opp: MEVOpportunity = {
      id: `liq-${account.address.slice(0, 8)}-${Date.now()}`,
      type: "liquidation_arb",
      estimatedProfitUsd,
      gasEstimateUsd,
      netProfitUsd,
      confidence,
      timeWindowMs: 5000,
      rationale: `Account ${account.address.slice(0, 8)}... has health factor ${account.healthFactor.toFixed(3)}. Max liquidatable: $${account.maxLiquidatableUsd.toFixed(0)}. Estimated discount: ${discountPct.toFixed(2)}%.`,
      detectedAt: Date.now(),
    };

    opportunities.push(opp);
    logger.info(
      `Liquidation found: ${account.address.slice(0, 8)}... HF=${account.healthFactor.toFixed(3)} profit=$${netProfitUsd.toFixed(2)}`
    );
  }

  return opportunities;
}
