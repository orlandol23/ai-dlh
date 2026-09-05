# ADR-0006: Phase 4 Solana, Bubblegum cNFT + deterministic PDAs

- **Status:** Accepted as a future phase (master plan Phase 4/D2; recorded on 2026-07-26)

## Decision

Certificates on Solana will be **cNFTs through Bubblegum** (~US$ 0.0001/mint, ~100× cheaper than Base), with our own **Anchor/Rust** program. Addresses are derived by **PDA** with seeds `[b"cert", user_pubkey, module_id]`.

## Rationale

- `[RS2–4]`: PDAs give a **deterministic** address (replacing the mapping) and guarantee **1 record per (user, module) for free**. The same invariant that today needs a partial index in Postgres and an on-chain guard on the EVM falls out of Solana's account model by construction. A PDA (off-curve, signed CPI) also serves as the **tree authority** for the Bubblegum tree.
- The course's final-project skeleton (Part 05: account model + instruction map + authority rules) is the template for the 1-day spike recorded in the master plan (item CU-8).
- The timing is unchanged: **not before Phase 4**, because it would double the test and ops surface with no volume to justify it (the plan's original decision, unaltered).
