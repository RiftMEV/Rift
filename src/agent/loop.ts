import Anthropic from "@anthropic-ai/sdk";
import type { MEVOpportunity } from "../core/types.js";
import type { Config } from "../core/config.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";
import { scanArbitrageOpportunities } from "../scanner/arbitrage.js";
import { scanLiquidationOpportunities } from "../scanner/liquidation.js";
import { logger } from "../core/logger.js";

function mergeUniqueOpportunities(
  existing: MEVOpportunity[],
  incoming: MEVOpportunity[]
): void {
  const seen = new Set(existing.map((opp) => opp.id));
  for (const opp of incoming) {
    if (seen.has(opp.id)) continue;
    existing.push(opp);
    seen.add(opp.id);
  }
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "scan_arbitrage",
    description: "Scan Jupiter for route dislocations on Solana using a USDC round-trip.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "scan_liquidations",
    description: "Scan MarginFi for accounts approaching liquidation thresholds.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "rank_opportunities",
    description: "Sort detected opportunities by net profit descending, filtered by minimum confidence.",
    input_schema: {
      type: "object" as const,
      properties: {
        min_confidence: { type: "number", description: "Minimum confidence threshold 0-1" },
        min_profit_usd: { type: "number", description: "Minimum net profit in USD" },
      },
      required: [],
    },
  },
  {
    name: "format_report",
    description: "Format all current opportunities into a structured JSON report.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
];

export async function runAgentLoop(
  config: Config,
  seedOpportunities: MEVOpportunity[]
): Promise<void> {
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const allOpportunities = [...seedOpportunities];
  logger.info(`Starting Rift agent review for ${allOpportunities.length} seeded opportunities...`);

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildUserPrompt(allOpportunities) },
  ];

  let iterations = 0;
  const MAX_ITER = 8;

  while (iterations < MAX_ITER) {
    iterations++;
    logger.debug(`Agent iteration ${iterations}`);

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: buildSystemPrompt(),
      tools: TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
      for (const block of textBlocks) {
        console.log(`\n${block.text}`);
      }
      break;
    }

    if (response.stop_reason !== "tool_use") break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      let result: string;

      if (block.name === "scan_arbitrage") {
        const opps = await scanArbitrageOpportunities(config);
        mergeUniqueOpportunities(allOpportunities, opps);
        result = JSON.stringify({ found: opps.length, opportunities: opps });
      } else if (block.name === "scan_liquidations") {
        const opps = await scanLiquidationOpportunities(config);
        mergeUniqueOpportunities(allOpportunities, opps);
        result = JSON.stringify({ found: opps.length, opportunities: opps });
      } else if (block.name === "rank_opportunities") {
        const input = block.input as { min_confidence?: number; min_profit_usd?: number };
        const minConf = input.min_confidence ?? config.MIN_CONFIDENCE;
        const minProfit = input.min_profit_usd ?? config.MIN_PROFIT_USD;
        const ranked = [...allOpportunities]
          .filter((o) => o.confidence >= minConf && o.netProfitUsd >= minProfit)
          .sort((a, b) => b.netProfitUsd - a.netProfitUsd);
        result = JSON.stringify(ranked);
      } else if (block.name === "format_report") {
        const ranked = [...allOpportunities].sort((a, b) => b.netProfitUsd - a.netProfitUsd);
        const report = {
          timestamp: new Date().toISOString(),
          totalOpportunities: allOpportunities.length,
          byType: {
            arbitrage: allOpportunities.filter((o) => o.type === "arbitrage").length,
            liquidation_arb: allOpportunities.filter((o) => o.type === "liquidation_arb").length,
          },
          byVerdict: {
            act: allOpportunities.filter((o) => o.verdict === "act").length,
            watch: allOpportunities.filter((o) => o.verdict === "watch").length,
            skip: allOpportunities.filter((o) => o.verdict === "skip").length,
          },
          topOpportunities: ranked.slice(0, 5),
        };
        result = JSON.stringify(report, null, 2);
      } else {
        result = JSON.stringify({ error: `Unknown tool: ${block.name}` });
      }

      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      logger.debug(`Tool ${block.name} completed`);
    }

    messages.push({ role: "user", content: toolResults });
  }
}
