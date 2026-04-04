export type OpportunityType = "arbitrage" | "liquidation_arb" | "jit_liquidity" | "sandwich_defense";

export interface ArbPath {
  tokenIn: string;
  tokenOut: string;
  mintIn: string;
  mintOut: string;
  dexA: string;
  dexB: string;
  priceA: number;
  priceB: number;
  spreadPct: number;
  estimatedProfitUsd: number;
}

export interface MEVOpportunity {
  id: string;
  type: OpportunityType;
  path?: ArbPath;
  estimatedProfitUsd: number;
  gasEstimateUsd: number;
  netProfitUsd: number;
  confidence: number;
  timeWindowMs: number;
  rationale: string;
  detectedAt: number;
}
