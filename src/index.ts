import { loadConfig } from "./core/config.js";
import { setLogLevel } from "./core/logger.js";
import { runAgentLoop } from "./agent/loop.js";
import { scanArbitrageOpportunities } from "./scanner/arbitrage.js";
import { scanLiquidationOpportunities } from "./scanner/liquidation.js";
import { printOpportunity, printScanSummary } from "./output/printer.js";
import { logger } from "./core/logger.js";

async function main(): Promise<void> {
  const config = loadConfig();
  setLogLevel(config.LOG_LEVEL);

  logger.info("Rift MEV Scanner starting...");
  logger.info(`Min profit: $${config.MIN_PROFIT_USD} | Min confidence: ${config.MIN_CONFIDENCE}`);

  async function scan(): Promise<void> {
    const start = Date.now();
    const [arbOpps, liqOpps] = await Promise.all([
      scanArbitrageOpportunities(config),
      scanLiquidationOpportunities(config),
    ]);

    const all = [...arbOpps, ...liqOpps].sort((a, b) => b.netProfitUsd - a.netProfitUsd);

    for (const opp of all) {
      printOpportunity(opp);
    }

    printScanSummary(all, Date.now() - start);

    if (all.length > 0) {
      await runAgentLoop(config);
    }
  }

  await scan();

  setInterval(scan, config.SCAN_INTERVAL_MS);
  logger.info(`Scanning every ${config.SCAN_INTERVAL_MS}ms...`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
