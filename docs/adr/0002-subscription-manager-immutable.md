# ADR-0002: `SubscriptionManager.sol` immutable in v1 (no proxy) + `Pausable`

- **Status:** Accepted (master plan E1: "Out of scope for v1 (the right calls): … an upgradeable proxy"; recorded on 2026-07-26)

## Decision

`SubscriptionManager.sol` is **immutable**: no UUPS or transparent proxy, no initializers. The kill-switch is `Pausable` (it only blocks sales; reads never) plus `Ownable2Step` with a **Safe multisig** owner on mainnet. Fixing a bug means deploying a V2 with a migration that honors the old contract's `subscriptions`/`creditsPurchased` (the A4 runbook).

## Rationale

1. **Master plan**: the smallest possible audit surface for a contract that holds real money; the state is simple (1 slot per subscriber plus a credit counter), so migration is cheap.
2. `[W5P2]`: immutability > upgradability as the industry default for contracts that hold value. Uniswap ships V2→V3→V4 as **new deployments**, not in-place upgrades, and proxy machinery is itself a historical source of losses (Parity).
3. `[W10E1]`: USDT runs solc 0.4.17 bytecode holding ~US$ 110 bn. The market accepts old immutable code because **migration risk > new features**; users trust more what cannot change underneath them.

## Consequences

- No `UPGRADER_ROLE`, no storage gaps, no storage-layout CI.
- The A4 rollback runbook (the `pause()` playbook, contract migration, manual refunds through `withdraw`) is the complete answer to "and what if there is a bug?".
