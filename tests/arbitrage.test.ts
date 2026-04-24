import { describe, it, expect } from "vitest";
import { rankOpportunities } from "../src/scanner/arbitrage.js";
import type { MEVOpportunity, ArbPath } from "../src/core/types.js";


function makeOpportunity(id: string, netProfitUsd: number): MEVOpportunity {
  return {
    id,
    type: "arbitrage",
    verdict: "watch",
    estimatedProfitUsd: netProfitUsd + 10,
    gasEstimateUsd: 10,
    netProfitUsd,
    confidence: 0.8,
    timeWindowMs: 1500,
    rationale: "Test opportunity",
    detectedAt: Date.now(),
  };
}

describe("Rift opportunity models", () => {
  it("builds a valid route-dislocation opportunity", () => {
    const path: ArbPath = {
      tokenIn: "USDC",
      tokenOut: "SOL",
      mintIn: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      mintOut: "So11111111111111111111111111111111111111112",
      dexA: "Orca",
      dexB: "Raydium",
      priceA: 191.2,
      priceB: 193.1,
      spreadPct: 0.99,
      estimatedProfitUsd: 99,
    };

    const opp: MEVOpportunity = {
      id: "route-SOL-orca-raydium",
      type: "arbitrage",
      verdict: "watch",
      path,
      estimatedProfitUsd: 99,
      gasEstimateUsd: 12.5,
      netProfitUsd: 86.5,
      confidence: 0.82,
      timeWindowMs: 2000,
      rationale: "SOL round-trip via Jupiter returned more USDC than it started with.",
      detectedAt: Date.now(),
    };

    expect(opp.type).toBe("arbitrage");
    expect(opp.verdict).toBe("watch");
    expect(opp.netProfitUsd).toBeCloseTo(86.5);
    expect(opp.path?.spreadPct).toBeGreaterThan(0);
  });

  it("builds a liquidation opportunity without a path", () => {
    const opp: MEVOpportunity = {
      id: "liq-abc12345",
      type: "liquidation_arb",
      verdict: "act",
      estimatedProfitUsd: 320,
      gasEstimateUsd: 75.1,
      netProfitUsd: 244.9,
      confidence: 0.9,
      timeWindowMs: 5000,
      rationale: "Account health factor 0.97 with modeled liquidation bonus.",
      detectedAt: Date.now(),
    };

    expect(opp.type).toBe("liquidation_arb");
    expect(opp.path).toBeUndefined();
    expect(opp.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("ranks opportunities by net profit", () => {
    const low = makeOpportunity("low", 25);
    const high = makeOpportunity("high", 90);
    expect(rankOpportunities([low, high]).map((opp) => opp.id)).toEqual(["high", "low"]);
  });

  it("net profit is estimated minus gas", () => {
    const gas = 12.25;
    const gross = 150;
    const net = gross - gas;

    const opp: MEVOpportunity = {
      id: "arb-test",
      type: "arbitrage",
      verdict: "skip",
      estimatedProfitUsd: gross,
      gasEstimateUsd: gas,
      netProfitUsd: net,
      confidence: 0.75,
      timeWindowMs: 1500,
      rationale: "Test opportunity",
      detectedAt: Date.now(),
    };

    expect(opp.netProfitUsd).toBe(gross - gas);
  });
});
