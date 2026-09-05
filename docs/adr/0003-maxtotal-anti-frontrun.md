# ADR-0003: `maxTotal` anti-front-run on every purchase function

- **Status:** Accepted (master plan E1; recorded on 2026-07-26)

## Decision

Every purchase function (`subscribe*`, `purchaseCredits*`) takes a `maxTotal` and does `require(total <= maxTotal)`. There is no timelock on `setPrice`; transparency comes from the **complete set of events** (`PlanUpdated`, `PricePerCreditUpdated` and the rest), which is cheap and sufficient for this stage.

## Rationale

- Attack class `[W2]`: the user's tx is visible in the mempool, and an owner `setPrice` (or an ordering reorg) between the user's signature and the tx being included could charge more than the user saw in the UI. `maxTotal` moves the ceiling into the user's own signature, so the worst case becomes a revert, never a larger charge.
- `[W5P1]` demonstrated the mechanism live (the Bob/Alice front-running demo).
- It complements the UI rule (E5): **show the signed amount clearly** (anti-phishing, the T4-equivalent threat).
