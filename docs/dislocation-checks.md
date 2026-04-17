# Dislocation Checks

Rift watches route dislocations and liquidation opportunities, so it should reject setups that only exist on paper.

## Confirm before escalation

- The route gap persists across more than one observation.
- Available liquidity can support a meaningful size.
- The closing leg is realistic under current conditions.

## Reject when

- The opportunity depends on stale routing data.
- One leg has no believable exit path.
- The spread exists only at a dust size.

## Why

A smaller set of credible dislocations is more useful than a noisy feed of impossible ones.
