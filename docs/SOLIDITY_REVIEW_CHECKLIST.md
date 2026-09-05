# Solidity review checklist (a gate derived from the course)

> Source: Bootcamp Borderless `[W5P1]` `[W5P2]` `[QA-JT]` (tag map: `docs/adr/README.md`). It applies to **every contract PR** (A4, C4a, C5, D2 and so on): the reviewer walks the list, and any deviation gets an inline triage comment, never a silent pass. It complements the "Owner's manual verification checklist" in E1, it does not replace it.

1. **CEI**: checks → effects → interactions, in every state-changing function, without exception.
2. **`nonReentrant`** on any function that sends ETH or a token (belt and braces, even with CEI; in `SubscriptionManager` the E1 decision to drop ReentrancyGuard is valid because USDC has no hooks, and that waiver must be written down in the PR).
3. **Pull over push**: never transfer in a loop to arbitrary addresses; recipients withdraw.
4. **`abi.encode` (not `encodePacked`)** when hashing 2 or more dynamic fields (a collision class).
5. **Signatures**: deadline + nonce + domain binding (EIP-712, with the domain read from the contract); replay tested.
6. **Zero arbitrary `call` or multicall**; every external input validated at the boundary.
7. **`SafeERC20` always; `decimals()` read, never assumed** (USDC = 6, the "factor of a trillion" bug).
8. **`Ownable2Step`**; the owner is a multisig (Safe) wherever there is real value.
9. **Oracles**: staleness + heartbeat + the feed's `decimals` checked per feed (Chainlink = 8).
10. **Deliberate storage packing** (32-byte slots); optimize **after** it is correct (ADR-0004).
11. **Upgradability only with a written justification; the default is immutable** (ADR-0002).
12. **Randomness** never from block vars; VRF or commit-reveal if it is ever needed.
13. **Slither (plus the gas gate) in CI before the merge** (C1b); high and medium clean, or triaged inline.
