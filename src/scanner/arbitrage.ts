import type { ArbPath, MEVOpportunity } from "../core/types.js";
import type { Config } from "../core/config.js";
import { logger } from "../core/logger.js";

interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: Array<{ swapInfo: { ammKey: string; label: string } }>;
}

async function getQuote(
  inputMint: string,
  outputMint: string,
  amountLamports: number
): Promise<JupiterQuote | null> {
  try {
    const url =
      `https://quote-api.jup.ag/v6/quote` +
      `?inputMint=${inputMint}` +
      `&outputMint=${outputMint}` +
      `&amount=${amountLamports}` +
      `&slippageBps=50`;

    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as JupiterQuote;
  } catch {
    return null;
  }
}

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const SCAN_PAIRS: Array<{ tokenA: string; tokenB: string; nameA: string; nameB: string }> = [
  { tokenA: SOL_MINT, tokenB: USDC_MINT, nameA: "SOL", nameB: "USDC" },
  {
    tokenA: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    tokenB: USDC_MINT,
    nameA: "JUP",
    nameB: "USDC",
  },
  {
    tokenA: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    tokenB: USDC_MINT,
    nameA: "JTO",
    nameB: "USDC",
  },
  {
    tokenA: "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux",
    tokenB: USDC_MINT,
    nameA: "HNT",
    nameB: "USDC",
  },
];

const TRADE_SIZE_USD = 10_000;

export async function scanArbitrageOpportunities(
  config: Config
): Promise<MEVOpportunity[]> {
  const opportunities: MEVOpportunity[] = [];

  for (const pair of SCAN_PAIRS) {
    try {
      const lamports = TRADE_SIZE_USD * 1_000_000;

      const [forwardQuote, reverseQuote] = await Promise.all([
        getQuote(pair.tokenA, pair.tokenB, lamports),
        getQuote(pair.tokenB, pair.tokenA, lamports),
      ]);

      if (!forwardQuote || !reverseQuote) continue;

      const priceA =
        parseFloat(forwardQuote.outAmount) / parseFloat(forwardQuote.inAmount);
      const priceB =
        parseFloat(reverseQuote.outAmount) / parseFloat(reverseQuote.inAmount);

      const spread = Math.abs(priceA - priceB);
      const spreadPct = (spread / Math.min(priceA, priceB)) * 100;

      if (spreadPct < 0.3) continue;

      const estimatedProfitUsd = (spreadPct / 100) * TRADE_SIZE_USD;
      const gasEstimateUsd = 0.05;
      const netProfitUsd = estimatedProfitUsd - gasEstimateUsd;

      if (netProfitUsd < config.MIN_PROFIT_USD) continue;

      const dexA =
        forwardQuote.routePlan[0]?.swapInfo?.label ?? "Unknown DEX";
      const dexB =
        reverseQuote.routePlan[0]?.swapInfo?.label ?? "Unknown DEX";

      const path: ArbPath = {
        tokenIn: pair.nameA,
        tokenOut: pair.nameB,
        mintIn: pair.tokenA,
        mintOut: pair.tokenB,
        dexA,
        dexB,
        priceA,
        priceB,
        spreadPct,
        estimatedProfitUsd,
      };

      const opp: MEVOpportunity = {
        id: `arb-${pair.nameA}-${pair.nameB}-${Date.now()}`,
        type: "arbitrage",
        path,
        estimatedProfitUsd,
        gasEstimateUsd,
        netProfitUsd,
        confidence: Math.min(0.95, spreadPct / 2),
        timeWindowMs: 2000,
        rationale: `${pair.nameA}/${pair.nameB} spread of ${spreadPct.toFixed(2)}% between ${dexA} and ${dexB}. Estimated net profit: $${netProfitUsd.toFixed(2)} on $${TRADE_SIZE_USD} trade.`,
        detectedAt: Date.now(),
      };

      opportunities.push(opp);
      logger.info(`Arb found: ${pair.nameA}/${pair.nameB} spread=${spreadPct.toFixed(2)}% profit=$${netProfitUsd.toFixed(2)}`);
    } catch (err) {
      logger.debug(`Error scanning ${pair.nameA}/${pair.nameB}:`, err);
    }
  }

  return opportunities;
}
