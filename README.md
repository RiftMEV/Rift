<div align="center">

# Rift

**MEV opportunity radar for Solana.**
Rift watches Jupiter route dislocations and distressed credit events, then filters them down to the opportunities that still look viable after execution friction and timing risk.

[![Build](https://img.shields.io/github/actions/workflow/status/RiftMEV/Rift/ci.yml?branch=master&style=flat-square&label=Build)](https://github.com/RiftMEV/Rift/actions)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
[![Built with Claude Agent SDK](https://img.shields.io/badge/Built%20with-Claude%20Agent%20SDK-2dd4bf?style=flat-square)](https://docs.anthropic.com/en/docs/agents-and-tools/claude-agent-sdk)

</div>

---

Most people hear "MEV" and assume the game is already closed. Custom infra, privileged order flow, and bots racing each other in a world that looks impossible to read from the outside.

That view misses a simpler layer of the market. Solana still produces short-lived spreads, liquidation-linked opportunities, and execution windows that are visible if someone is scanning the right sources with the right filters. Rift is built for that visible layer.

It watches route-dislocation and liquidation surfaces, estimates whether the math still survives after friction, and prints a ranked opportunity board that behaves more like an execution radar than a generic scanner.

`SCAN -> FILTER -> PRICE EDGE -> DECIDE -> REPORT`

---

Why Rift Exists • At a Glance • Opportunity Classes • How Rift Filters Noise • Scanner Loop • Example Output • Execution Reality • Risk Controls • Quick Start

## Why Rift Exists

There is a huge difference between seeing a spread and seeing a tradeable spread.

That gap is where most weak MEV products break down. They show a price difference, label it "arb," and ignore the part that actually matters:

- does the spread survive fees
- does it survive slippage
- does it survive timing delay
- does the route still exist by the time anyone acts

Rift is built around that more honest version of the problem. It is not trying to sound like validator-only infra. It is trying to surface the visible part of the market where execution quality still determines whether an opportunity is real.

## At a Glance

- `Use case`: scanning visible Solana MEV surfaces for Jupiter route dislocations and distressed-account follow-through
- `Primary input`: DEX route pricing, liquidation state, estimated net edge, and viability analysis
- `Primary failure mode`: promoting optical spreads that disappear once execution cost is counted
- `Best for`: operators who want a ranked board of opportunities instead of raw route snapshots

## Opportunity Classes

| Class | What Rift is looking for | Why it matters |
|-------|--------------------------|----------------|
| `route_dislocation` | a USDC round-trip on Jupiter returns more than it should after route friction | visible route imbalance that may still be extractable |
| `liquidation_follow_through` | distressed accounts where the liquidation state creates secondary opportunity | edge tied to credit stress rather than pure spot routing |
| `fast window` | short-lived route or market dislocation that needs immediate ranking | useful because it decays quickly |

The point is not to cover every MEV strategy. The point is to cover the part of the landscape where a public scanner can still be useful.

## How Rift Filters Noise

Most raw opportunities should die in the filtering layer. That is a feature.

Rift is meant to demote:

- tiny spreads that vanish once cost is included
- routes that look profitable only because one quote is stale
- liquidation-linked ideas that are visible but already crowded
- situations where the edge exists mathematically but not operationally

This makes the board more believable to normal readers too. A scanner that shows fewer, cleaner opportunities looks much more real than one that floods the page with fantasy edge.

## Scanner Loop

Rift follows a simple but strict sequence:

1. scan routeable market surfaces for route dislocation
2. scan monitored credit surfaces for liquidation-linked setups
3. estimate gross and net edge after known friction
4. assign a deterministic scanner verdict of `act`, `watch`, or `skip`
5. run the best candidates through the decision layer
6. print a ranked board with the scanner verdict and the review note side by side

That last step matters. The repo is not strongest when it says "something might exist." It is strongest when it says which setup deserves attention first and why.

## What A Good Rift Hit Looks Like

The strongest opportunities usually share the same properties:

- the spread is visible and not trivial
- the route still looks executable after cost
- the timing window is not already collapsing
- the verdict explains why the setup survives, not just that the spread is large

In other words, the math should still hold after the market is treated like a market instead of a spreadsheet.

## Example Output

```text
RIFT // OPPORTUNITY BOARD

type              route_dislocation
pair              SOL/USDC
gross spread      0.62%
net edge          0.31%
verdict           act
confidence        high

operator note: route still clears cost and has not compressed yet.
```

## Execution Reality

Rift becomes much easier to understand when it is framed as a ranking system, not a guarantee engine.

It does not promise that every promoted setup is yours to capture. That would be unserious. What it does promise is a cleaner answer to the question:

"Which of the visible MEV-style setups still look alive right now?"

That makes the product useful even for people who are not deep MEV specialists. The logic is familiar:

- find a visible edge
- strip out the fake ones
- rank what survives

## What Makes Rift More Interesting Than A Generic Scanner

- it cares about net edge instead of raw spread
- it combines route-based and distress-based opportunity surfaces
- it gives a verdict instead of a dump of prices
- it is built to help an operator prioritize, not just observe

That combination makes the README much stronger for launch because the product value is obvious in one pass.

## Risk Controls

- `net-edge filter`: downgrades spreads that fail after cost
- `viability review`: runs a second pass over the same seeded opportunity set before an opportunity is treated as actionable
- `opportunity ranking`: prevents the board from collapsing into a flood of equal-looking hits
- `surface limits`: keeps the scanner focused on visible, repeatable MEV categories rather than pretending to cover every private edge

Rift should be judged on whether it promotes believable opportunities, not whether it can generate the largest raw list.

## Quick Start

```bash
git clone https://github.com/RiftMEV/Rift
cd Rift
bun install
cp .env.example .env
bun run dev
```

## License

MIT

---

*the spread is only real if it survives the trip.*
