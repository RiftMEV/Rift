import { describe, it, expect } from "vitest";
import type { MEVOpportunity, ArbPath } from "../src/core/types.js";

describe("MEVOpportunity types", () => {
  it("constructs a valid arbitrage opportunity", () => {
    const path: ArbPath = {
      tokenIn: "SOL",
      tokenOut: "USDC",
      mintIn: "So11111111111111111111111111111111111111112",
      mintOut: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      dexA: "Orca",
      dexB: "Raydium",
      priceA: 0.00513,
      priceB: 0.00519,
      spreadPct: 1.17,
      estimatedProfitUsd: 117,
    };

    const opp: MEVOpportunity = {
      id: "arb-SOL-USDC-1234567890",
      type: "arbitrage",
      path,
      estimatedProfitUsd: 117,
      gasEstimateUsd: 0.05,
      netProfitUsd: 116.95,
      confidence: 0.82,
      timeWindowMs: 2000,
      rationale: "SOL/USDC 1.17% spread between Orca and Raydium",
      detectedAt: Date.now(),
    };

    expect(opp.type).toBe("arbitrage");
    expect(opp.netProfitUsd).toBeCloseTo(116.95);
    expect(opp.path?.spreadPct).toBeGreaterThan(0);
  });

  it("constructs a liquidation opportunity without a path", () => {
    const opp: MEVOpportunity = {
      id: "liq-abc12345-1234567890",
      type: "liquidation_arb",
      estimatedProfitUsd: 320,
      gasEstimateUsd: 0.1,
      netProfitUsd: 319.9,
      confidence: 0.9,
      timeWindowMs: 5000,
      rationale: "Account health factor 0.97 — near liquidation",
      detectedAt: Date.now(),
    };

    expect(opp.type).toBe("liquidation_arb");
    expect(opp.path).toBeUndefined();
    expect(opp.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("net profit is estimated minus gas", () => {
    const gas = 0.05;
    const gross = 150;
    const net = gross - gas;

    const opp: MEVOpportunity = {
      id: "arb-test",
      type: "arbitrage",
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
