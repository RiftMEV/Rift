<div align="center">

# Rift

**On-chain MEV opportunity scanner for Solana.**
Detects cross-DEX arbitrage and liquidation candidates every 3 seconds. Runs them through Claude to assess viability before you act.

[![Build](https://img.shields.io/github/actions/workflow/status/RiftMEV/Rift/ci.yml?branch=main&style=flat-square&label=Build)](https://github.com/RiftMEV/Rift/actions)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
[![Built with Claude Agent SDK](https://img.shields.io/badge/Built%20with-Claude%20Agent%20SDK-2dd4bf?style=flat-square)](https://docs.anthropic.com/en/docs/agents-and-tools/claude-agent-sdk)

</div>

---

MEV isn't just for bots with custom validators. There's a layer of opportunity visible to anyone watching closely — price spreads between DEXes, accounts teetering on liquidation thresholds, short windows where the math clearly works. `Rift` scans for all of it. Every 3 seconds it queries Jupiter and MarginFi, computes net profit after gas, and passes the best opportunities to Claude for a plain-language verdict: act, skip, or watch.

```
SCAN → FILTER → EVALUATE → RANK → REPORT
```

---

## Arbitrage Path

![Rift Paths](assets/preview-paths.svg)

---

## Opportunity Scanner

![Rift Scanner](assets/preview-scanner.svg)

---

## Opportunity Types

| Type | Source | Trigger |
|------|--------|---------|
| **arbitrage** | Jupiter V6 | Price spread > 0.3% across DEX routes |
| **liquidation_arb** | MarginFi | Health factor < 1.05 |
| **jit_liquidity** | Custom | Detected large pending swap |
| **sandwich_defense** | Custom | Identify sandwichable transactions |

---

## Quick Start

```bash
git clone https://github.com/RiftMEV/Rift
cd Rift && bun install
cp .env.example .env
bun run dev
```

---

## License

MIT

---

*the spread is always there.*
