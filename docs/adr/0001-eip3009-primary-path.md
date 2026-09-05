# ADR-0001: EIP-3009 `receiveWithAuthorization` as the primary billing path

- **Status:** Accepted (master plan E1; recorded on 2026-07-26)

## Decision

`subscribeWithAuthorization`/`purchaseCreditsWithAuthorization` through **EIP-3009 `receiveWithAuthorization`** are the primary path (single-call, 1 tx); EIP-2612 permit is the fallback (with `try/catch` plus an allowance check); `approve+subscribe` is the final fallback. **RULE RB4:** every signed path credits the **signer** (`from`/`owner`), never `msg.sender`. A relayer test is mandatory.

## Rationale

- `receiveWithAuthorization` requires `to == address(this)`: only the contract submits the authorization, which makes it immune to front-running and to nonce griefing (a random 32-byte nonce; better multi-tab UX). Native Base USDC accepts ERC-1271 (so it works with Coinbase Smart Wallet).
- `[W5P2]` validates the signature design: deadline + anti-replay nonce + domain binding (EIP-712, with the domain read from the contract, never hardcoded; a fork test against the real USDC).
- `[W2]` establishes the attack class (a public mempool means permit can be front-run).

## Cross-reference (portfolio consistency)

The sibling repo `stablerails` decided the **opposite** (EIP-2612 in v1, 3009 additive, its ADR-0003): a different context (a B2B rail with its own relayer and the B8 pattern, versus a multi-tab consumer checkout here). The same USDC primitives, two decisions argued from each product's threat model. A contrast ready for an interview.
