# ADR-0004: deliberate storage packing

- **Status:** Accepted (master plan E1 plus the gas budget; recorded on 2026-07-26)

## Decision

- `struct Subscription { uint64 expiresAt; uint8 planId; }`: **1 slot** (1 warm SSTORE per renewal).
- ERC-5192 certificate (C4): packed storage (`score uint16` + `timestamp uint64` + `topicHash bytes32`), metadata through `tokenURI`, history through indexed events, **no `ERC721Enumerable`**. Target ~100–140k gas per mint.
- General rule: optimize **after** it is correct; gas targets are validated by the C1b regression gate, not assumed.

## Rationale

`[QA-JT]`: slots are 32 bytes, and packing reduces SSTOREs and SLOADs, which is the highest-leverage optimization in contracts that write often; `indexed` belongs on events (cheap off-chain history instead of on-chain arrays).
