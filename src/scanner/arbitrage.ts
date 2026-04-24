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
  amountAtomic: number
): Promise<JupiterQuote | null> {
  try {
    const url =
      `https://quote-api.jup.ag/v6/quote` +
      `?inputMint=${inputMint}` +
      `&outputMint=${outputMint}` +
      `&amount=${amountAtomic}` +
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
const USDC_DECIMALS = 1_000_000;

const SCAN_PAIRS: Array<{
  tokenMint: string;
  tokenName: string;
  tokenDecimals: number;
}> = [
  { tokenMint: SOL_MINT, tokenName: "SOL", tokenDecimals: 9 },
  { tokenMint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", tokenName: "JUP", tokenDecimals: 6 },
  { tokenMint: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL", tokenName: "JTO", tokenDecimals: 9 },
  { tokenMint: "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux", tokenName: "HNT", tokenDecimals: 8 },
];

// Use one consistent USDC notional so scanner output is comparable across tokens.
const TRADE_SIZE_USD = 10_000;

function dominantVenue(quote: JupiterQuote): string {
  return quote.routePlan[0]?.swapInfo?.label ?? "Unknown route";
}

export function rankOpportunities(opportunities: MEVOpportunity[]): MEVOpportunity[] {
  return [...opportunities].sort((left, right) => right.netProfitUsd - left.netProfitUsd);
}

function classifyVerdict(
  config: Config,
  netProfitUsd: number,
  confidence: number
): MEVOpportunity["verdict"] {
  if (netProfitUsd >= config.MIN_PROFIT_USD * 2 && confidence >= 0.8) {
    return "act";
  }
  if (netProfitUsd >= config.MIN_PROFIT_USD && confidence >= config.MIN_CONFIDENCE) {
    return "watch";
  }
  return "skip";
}

export async function scanArbitrageOpportunities(
  config: Config
): Promise<MEVOpportunity[]> {
  const opportunities: MEVOpportunity[] = [];
  const usdcInput = TRADE_SIZE_USD * USDC_DECIMALS;

  for (const pair of SCAN_PAIRS) {
    try {
      const entryQuote = await getQuote(USDC_MINT, pair.tokenMint, usdcInput);
      if (!entryQuote) continue;

      const reverseInput = Number(entryQuote.outAmount);
      if (!Number.isFinite(reverseInput) || reverseInput <= 0) continue;

      const exitQuote = await getQuote(pair.tokenMint, USDC_MINT, reverseInput);
      if (!exitQuote) continue;

      const tokenAmount = Number(entryQuote.outAmount) / 10 ** pair.tokenDecimals;
      const returnedUsdc = Number(exitQuote.outAmount) / USDC_DECIMALS;
      if (!Number.isFinite(tokenAmount) || !Number.isFinite(returnedUsdc) || tokenAmount <= 0) {
        continue;
      }

      const entryPriceUsd = TRADE_SIZE_USD / tokenAmount;
      const exitPriceUsd = returnedUsdc / tokenAmount;
      const grossEdgeUsd = returnedUsdc - TRADE_SIZE_USD;
      const spreadPct = (grossEdgeUsd / TRADE_SIZE_USD) * 100;

      const routeImpactPct =
        parseFloat(entryQuote.priceImpactPct || "0") +
        parseFloat(exitQuote.priceImpactPct || "0");
      const gasEstimateUsd = 0.05 + TRADE_SIZE_USD * (routeImpactPct / 100);
      const estimatedProfitUsd = grossEdgeUsd;
      const netProfitUsd = estimatedProfitUsd - gasEstimateUsd;

      if (netProfitUsd < config.MIN_PROFIT_USD) continue;

      const entryVenue = dominantVenue(entryQuote);
      const exitVenue = dominantVenue(exitQuote);
      const confidence = Math.max(
        0.2,
        Math.min(0.95, Math.abs(spreadPct) * 1.5 - routeImpactPct)
      );
      const verdict = classifyVerdict(config, netProfitUsd, confidence);

      const path: ArbPath = {
        tokenIn: "USDC",
        tokenOut: pair.tokenName,
        mintIn: USDC_MINT,
        mintOut: pair.tokenMint,
        dexA: entryVenue,
        dexB: exitVenue,
        priceA: entryPriceUsd,
        priceB: exitPriceUsd,
        spreadPct,
        estimatedProfitUsd,
      };

      const opp: MEVOpportunity = {
        id: `route-${pair.tokenName}-${entryVenue.replace(/\s+/g, "-").toLowerCase()}-${exitVenue.replace(/\s+/g, "-").toLowerCase()}`,
        type: "arbitrage",
        verdict,
        path,
        estimatedProfitUsd,
        gasEstimateUsd,
        netProfitUsd,
        confidence,
        timeWindowMs: 2000,
        rationale: `${pair.tokenName} round-trip via Jupiter returned $${returnedUsdc.toFixed(2)} from a $${TRADE_SIZE_USD} USDC route. Entry venue ${entryVenue}, unwind venue ${exitVenue}, route impact ${routeImpactPct.toFixed(2)}%.`,
        detectedAt: Date.now(),
      };

      opportunities.push(opp);
      logger.info(
        `Route dislocation: ${pair.tokenName}/USDC net=$${netProfitUsd.toFixed(2)} verdict=${verdict}`
      );
    } catch (err) {
      logger.debug(`Error scanning ${pair.tokenName}/USDC:`, err);
    }
  }

  return rankOpportunities(opportunities);
}
