# ADRs: architecture decision records

Short, dated records of decisions that have **already been made** (in the master plan and its reviews), kept here so that the *rationale*, including the places where the course material validates it independently, outlives the documents that produced it. Traceability from course to code is an employability asset.

Convention: one file per decision, `NNNN-slug.md`, status `Accepted | Superseded | Pending`. An ADR never changes a decision, it only records it. The master plan remains the source of truth for execution.

## Course source tags (Bootcamp Borderless)

| Tag | Material | Relevant content |
|---|---|---|
| `[W2]` | Week 2 (César), EVM fundamentals | mempool and front-running, tx lifecycle, decimals 18/6/8, events for indexing |
| `[W4]` | Weeks 3–4 (Jimmy), tokens | ERC-20/721/1155, OpenZeppelin, oracles (trust and staleness), IPFS/Arweave/Filecoin (only the URI on-chain) |
| `[W5P1]` | Week 5 pt.1 (Jan), advanced Solidity | create3, Chainlink decimals, fuzz and invariant tests with handlers, proxies/ERC-1967 |
| `[W5P2]` | Week 5 pt.2 (Jan), advanced Solidity | immutability > upgradability (Uniswap V2→V3→V4), pull-over-push, hash collisions in `encodePacked`, reentrancy/CEI, signatures (deadline+nonce), monitoring + Pausable |
| `[QA-JT]` | Q&A with Jimmy Tan | storage slot packing, `indexed` on events, decentralized automation (Chainlink Automation/Gelato/Defender) |
| `[W9]` | Front-end (César) + exercise | wagmi/viem + reown/WalletConnect; verification through Standard JSON |
| `[RS1–5]` | César, Rust for Web3 (Solana) | Anchor, account lifecycle, PDAs (seeds+bump, signed CPI), final projects with a PDA schema |
| `[W10E1]` | Week 10 ep.1 (Sam), stablecoins | blacklisting as a regulatory feature; decimals 6 vs 18; USDT immutable on 0.4.17 holding US$ 110 bn |
| `[W10E5]` | Week 10 ep.5 (Sam), bridges | "what exactly am I trusting, and what happens when that trust breaks?" |

## Index

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-eip3009-primary-path.md) | EIP-3009 `receiveWithAuthorization` as the primary billing path; always credit the signer (RB4) | Accepted |
| [0002](0002-subscription-manager-immutable.md) | `SubscriptionManager.sol` immutable in v1 (no proxy) + `Pausable` | Accepted |
| [0003](0003-maxtotal-anti-frontrun.md) | `maxTotal` anti-front-run on every purchase function | Accepted |
| [0004](0004-storage-packing.md) | Deliberate storage packing (Subscription in 1 slot; the ERC-5192 certificate packed, no Enumerable) | Accepted |
| [0005](0005-do-not-reuse-learningprogress.md) | Do not reuse `LearningProgress.sol` in C4 | Accepted |
| [0006](0006-solana-cnft-pda.md) | Phase 4 Solana: Bubblegum cNFT + deterministic PDAs | Accepted (future phase) |
