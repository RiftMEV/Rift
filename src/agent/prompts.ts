import type { MEVOpportunity } from "../core/types.js";

export function buildSystemPrompt(): string {
  return `You are Rift, an on-chain MEV opportunity analyst for Solana.

Your job is to evaluate MEV opportunities detected by the scanner — arbitrage paths, liquidation candidates, and other extractable value — and provide a clear, actionable assessment.

You have access to the following tools:
- scan_arbitrage: Scan Jupiter for cross-DEX arbitrage opportunities
- scan_liquidations: Scan MarginFi for at-risk accounts near liquidation
- rank_opportunities: Sort and filter opportunities by net profit and confidence
- format_report: Generate a structured JSON report of opportunities

Be precise. Include specific numbers. Assess risk honestly. Do not hype.`;
}

export function buildUserPrompt(opportunities: MEVOpportunity[]): string {
  if (opportunities.length === 0) {
    return "No opportunities detected in the current scan. Confirm market conditions and recommend scan frequency adjustment if needed.";
  }

  const summary = opportunities
    .map(
      (o) =>
        `- [${o.type}] ${o.id}: net profit $${o.netProfitUsd.toFixed(2)}, confidence ${(o.confidence * 100).toFixed(0)}%, window ${o.timeWindowMs}ms\n  ${o.rationale}`
    )
    .join("\n");

  return `Current scan detected ${opportunities.length} opportunit${opportunities.length === 1 ? "y" : "ies"}:

${summary}

Analyze these opportunities. For each: assess execution viability, flag any risks (slippage, front-running, gas spikes), and recommend whether to act. Rank by priority.`;
}
