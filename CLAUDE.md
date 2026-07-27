# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commit and PR conventions

Do not include Co-Authored-By or "Generated with Claude Code" lines in commit
messages or PR descriptions.

Commits are authored as `Orlando Fernandes
<27815856+orlandol23@users.noreply.github.com>` (configured in
`.claude/settings.json`).

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
cd server    && npx vitest run   # 134 tests, 12 files
cd frontend  && npx vitest run   #  49 tests,  5 files
cd contracts && npx hardhat test #  23 tests
```

Total: 206 tests. Keep the counts in `README.md` in sync when tests are added.

## Lint and build

```bash
npm run lint     # frontend + backend
npm run build    # frontend + backend
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build for all
three workspaces on every push and pull request.

## Notes

- The backend validates its environment on boot and exits if anything required
  is missing, so tests and local runs need the variables in `.env.example`.
- `contracts/` needs to download the `solc` binary on first compile; restricted
  networks will fail there.
