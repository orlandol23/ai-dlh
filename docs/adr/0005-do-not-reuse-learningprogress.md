# ADR-0005: do not reuse `LearningProgress.sol` in C4

- **Status:** Accepted (master plan, factual corrections plus E0/C4; recorded on 2026-07-26)

## Decision

The current contract (`contracts/contracts/LearningProgress.sol`, on Sepolia) keeps serving the free tier as it is, but it is **not the base** for the premium certificate: C4 starts as a new `LearningCertificate.sol` (ERC-5192 soulbound), minting to the **user's proven wallet**.

## Rationale

Three structural defects in the current contract, all of them anti-patterns named in `[W5P2]`:
1. It writes everything under `msg.sender`, which is the **backend's custodial wallet**, not the user's, so the "certificate" does not belong to the person who studied.
2. `string` in storage (expensive and unnecessary: `topicHash bytes32` plus off-chain metadata solves it).
3. An **unbounded** `Completion[]` per user. Growth with no ceiling is the recipe for the DoS and gas problem described in the course (pull-over-push and bounded structures).

ADR-0004 defines the replacement's layout.
