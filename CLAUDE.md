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
cd server    && npx vitest run   # 175 tests, 14 files
cd frontend  && npx vitest run   #  49 tests,  5 files
cd contracts && npx hardhat test #  23 tests
```

Total: 247 tests. Keep the counts in `README.md` in sync when tests are added.

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
- `contracts/` needs to download the `solc` binary on first compile; restricted
  networks will fail there.
