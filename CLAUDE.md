# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commit and PR conventions

Commits are authored as `Orlando Fernandes
<27815856+orlandol23@users.noreply.github.com>`, set by `env` in
`.claude/settings.json`. Confirm it landed with
`git log -1 --format='%an <%ae>'`; if another identity got in, amend with
`--reset-author` instead of leaving it in the history.

Nothing in a commit message or a pull request body may name the tool or the
session that wrote it: no `Co-Authored-By:` trailer, no `Claude-Session:`
trailer, no "Generated with/by Claude Code" footer, and no `claude.ai/code`
link. Describe the change, not how it was produced.

PR bodies may be written in Portuguese. They are read by the repository owner,
not by visitors browsing the code.

## Language

The README is the reference, and it is in English. So is everything else a
visitor reads on GitHub: documentation, code comments, test names, commit
messages and PR titles.

Product content stays in its own language and a language pass never touches it:
`frontend/public/locales/**`, the six locales a user reads on screen, and the
copy examples under `frontend/design-system/`, which exist to document the
app's Portuguese voice.

`contracts/contracts/LearningProgress.sol` keeps its Portuguese NatSpec on
purpose. The deployed contract is verified on Sepolia, and solc hashes the
source, comments included, into the metadata it embeds in the bytecode. Editing
one comment makes this repository stop reproducing the verified build. Translate
it only as part of a redeploy that is happening for some other reason.

## Layout

npm workspaces monorepo with three packages:

| Workspace   | Stack                                              |
| ----------- | -------------------------------------------------- |
| `frontend/` | React 18, Vite, TypeScript, Zustand, tRPC client    |
| `server/`   | Node 20, Express, tRPC v10, Drizzle ORM, PostgreSQL |
| `contracts/`| Solidity 0.8.20, Hardhat, OpenZeppelin v5, ethers v6|

## Install

```bash
npm install
```

Requires Node 20+.

## Tests

Run each workspace directly — the root `npm test` covers only contracts and
backend:

```bash
cd server    && npx vitest run   # 194 tests, 15 files
cd frontend  && npx vitest run   #  49 tests,  5 files
cd contracts && npx hardhat test #  23 tests
```

Total: 266 tests. Keep the counts in `README.md` in sync when tests are added.

## Lint and build

```bash
npm run lint     # frontend + backend
npm run build    # frontend + backend
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build for
frontend and backend, and compile + tests for contracts (there is no contracts
lint step), on every push and pull request.

## Notes

- The backend validates its environment on boot and exits if anything required
  is missing. Local runs (`npm run dev`) need the variables in `.env.example`;
  the test suites do not — they mock the env module.
- Every write the blockchain queue makes after claiming a row is fenced by the
  `blockchain_lock_token` that claim minted (`heldBy`), never by
  `blockchain_status = 'processing'` alone. A row whose stale lock another
  worker reclaimed is still `processing`, so a status-only guard lets a
  superseded worker overwrite the current holder. A fenced write that matches
  nothing is reported, not assumed to have applied; in the journal it throws
  `LockLostError` (defined in `services/queue-errors.ts`, shared with
  web3.service so its error mapper can pass it through), which
  `handleSendFailure` must keep treating as "this row is not mine" rather than
  as a send failure to retry.
- The initial send is three calls, in this order: `prepareCompletion` (signs,
  locally, and sends nothing), the journal write, then `broadcastCompletion`.
  Do not collapse them back into one `contract.recordCompletion(...)`. A signed
  transaction already carries its final hash, and writing that hash down before
  the node can see it is the only reason a lost acknowledgement (socket reset,
  RPC timeout, gateway 502) is recoverable: the node may have accepted a
  transaction, and the row already names it. Learn the hash from the
  acknowledgement instead and the retry signs a fresh nonce and records the
  completion twice.
- The replace-by-fee replacement follows the same order inside web3.service:
  `replaceWithFeeBump` signs the fee-bumped transaction locally
  (`prepareReplacement`), reports the new hash through `onReplacement` BEFORE
  broadcasting, and only then calls `provider.broadcastTransaction(raw)`. It
  must never go back to `wallet.sendTransaction(...)`, which signs and
  broadcasts in one call: journaled-after-the-acknowledgement reopens the lost
  ack window for replacements, and the retry then reports the journaled nonce
  as consumed by an unknown transaction. If the `onReplacement` write reports
  the lock lost, the replacement is not broadcast — a nonce this worker no
  longer holds must not be spent, and `toDomainError` must keep passing
  `LockLostError` through instead of wrapping it as "Blockchain error".
- Recovery identifies an already-transmitted replacement by receipt: every
  hash in the journal is checked (`getTransactionReceipt`), and the first one
  that mined decides the outcome — status 1 confirms, status 0 parks the
  record as permanently failed. A fee bump that mined therefore confirms a
  record whose original never did, exactly like the initial-send case.
- `services/web3.service.signing.test.ts` mocks nothing below our own code: a
  real `ethers.Wallet` signs against a fake JSON-RPC server so the ordering is
  checked against the real library. Keep it that way — the mocked tests in
  `web3.service.test.ts` would happily agree with a broken `signTransaction`
  after an ethers upgrade.
- `recoverCompletion` still accepts a journal with a nonce and no hashes, for
  rows written by older builds or a `blockchain_sent_hashes` that failed to
  parse, and must keep splitting it on the account nonce: equal means nothing
  was sent, past means the record parks for a human. Never resend on a fresh
  nonce there.
- `contracts/` needs to download the `solc` binary on first compile; restricted
  networks will fail there.

## Plans and audits

- The plan is `docs/MASTER_PLAN.md`, with the ADRs under `docs/adr/`. Nothing in
  it is ticked by intention: a box closes in the PR that closes it, with the PR
  linked.
- `docs/AUDIT-2026-09.md` is the September 2026 security and architecture
  audit with the status of every finding. A status changes only in the PR that
  changes the code. Later reviews go in a new dated file, never merged into it.
