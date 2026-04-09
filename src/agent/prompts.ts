import type { MEVOpportunity } from "../core/types.js";

export function buildSystemPrompt(): string {
  return `You are Rift, an on-chain opportunity analyst for Solana.

Your job is to evaluate visible opportunity surfaces detected by the scanner - Jupiter route dislocations and liquidation candidates - and provide a clear, actionable assessment.

You have access to the following tools:
- scan_arbitrage: Scan Jupiter for route dislocations using a USDC round-trip
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
      (opportunity) =>
        `- [${opportunity.type}] ${opportunity.id}: scanner verdict ${opportunity.verdict}, net profit $${opportunity.netProfitUsd.toFixed(2)}, confidence ${(opportunity.confidence * 100).toFixed(0)}%, window ${opportunity.timeWindowMs}ms\n  ${opportunity.rationale}`
    )
    .join("\n");

  return `Current scan detected ${opportunities.length} opportunit${opportunities.length === 1 ? "y" : "ies"}:

${summary}

Analyze these opportunities. For each: assess execution viability, flag any risks (slippage, route crowding, timing decay), and confirm whether the scanner verdict should stay act / watch / skip. Rank by priority.`;
}
