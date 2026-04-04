import type { MEVOpportunity } from "../core/types.js";

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function confidenceBar(c: number): string {
  const filled = Math.round(c * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

export function printOpportunity(opp: MEVOpportunity): void {
  const line = "─".repeat(60);
  console.log(`\n${line}`);
  console.log(`  TYPE       ${opp.type.toUpperCase().replace(/_/g, " ")}`);
  console.log(`  ID         ${opp.id}`);

  if (opp.path) {
    console.log(`  ROUTE      ${opp.path.tokenIn} → ${opp.path.dexA} → ${opp.path.tokenOut} → ${opp.path.dexB}`);
    console.log(`  SPREAD     ${opp.path.spreadPct.toFixed(3)}%`);
  }

  console.log(`  PROFIT     ${formatUsd(opp.estimatedProfitUsd)}  (net: ${formatUsd(opp.netProfitUsd)})`);
  console.log(`  GAS        ${formatUsd(opp.gasEstimateUsd)}`);
  console.log(`  WINDOW     ${opp.timeWindowMs}ms`);
  console.log(`  CONFIDENCE [${confidenceBar(opp.confidence)}] ${(opp.confidence * 100).toFixed(0)}%`);
  console.log(`  RATIONALE  ${opp.rationale}`);
  console.log(line);
}

export function printScanSummary(opps: MEVOpportunity[], elapsedMs: number): void {
  const totalProfit = opps.reduce((s, o) => s + o.netProfitUsd, 0);
  console.log(`\n  Scan complete — ${opps.length} opportunit${opps.length === 1 ? "y" : "ies"} found in ${elapsedMs}ms`);
  if (opps.length > 0) {
    console.log(`  Total potential profit: ${formatUsd(totalProfit)}`);
  }
}
