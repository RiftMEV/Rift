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
  let inFlight = false;
  let skippedScans = 0;

  logger.info("Rift MEV Scanner starting...");
  logger.info(`Min profit: $${config.MIN_PROFIT_USD} | Min confidence: ${config.MIN_CONFIDENCE}`);

  async function scan(): Promise<void> {
    if (inFlight) {
      skippedScans++;
      logger.warn("Skipping scan because the previous cycle is still running", { skippedScans });
      return;
    }

    inFlight = true;
    const start = Date.now();

    try {
      const [arbResult, liqResult] = await Promise.allSettled([
        scanArbitrageOpportunities(config),
        scanLiquidationOpportunities(config),
      ]);

      const arbOpps = arbResult.status === "fulfilled" ? arbResult.value : [];
      const liqOpps = liqResult.status === "fulfilled" ? liqResult.value : [];

      if (arbResult.status === "rejected") {
        logger.error("Arbitrage scan failed", {
          error: arbResult.reason instanceof Error ? arbResult.reason.message : String(arbResult.reason),
        });
      }

      if (liqResult.status === "rejected") {
        logger.error("Liquidation scan failed", {
          error: liqResult.reason instanceof Error ? liqResult.reason.message : String(liqResult.reason),
        });
      }

      const all = [...arbOpps, ...liqOpps].sort((a, b) => b.netProfitUsd - a.netProfitUsd);

      for (const opp of all) {
        printOpportunity(opp);
      }

      const durationMs = Date.now() - start;
      printScanSummary(all, durationMs);

      if (durationMs > config.SCAN_INTERVAL_MS) {
        logger.warn("Rift scan exceeded configured interval", {
          durationMs,
          intervalMs: config.SCAN_INTERVAL_MS,
        });
      }

      if (all.length === 0) {
        logger.info("No route-dislocation opportunities met the profit threshold this cycle");
        return;
      }

      await runAgentLoop(config, all);
    } catch (err) {
      logger.error("Scan error:", err);
    } finally {
      inFlight = false;
    }
  }

  await scan();

  setInterval(() => {
    void scan();
  }, config.SCAN_INTERVAL_MS);
  logger.info(`Scanning every ${config.SCAN_INTERVAL_MS}ms...`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
