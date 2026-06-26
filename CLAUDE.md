# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- maister-docs-reference: start -->
## Project Documentation & Standards (maister)

Read @.maister/docs/INDEX.md at the start of any development task. It is the master index for this project's maister-managed documentation:
- **Project docs** (`.maister/docs/project/`) — vision, roadmap, tech-stack, and architecture.
- **Coding standards** (`.maister/docs/standards/`) — global, backend, and testing conventions.

Follow the standards in `.maister/docs/standards/` when writing code; if a standard conflicts with the task, ask. This section supplements (does not replace) the project-specific guidance below.
<!-- maister-docs-reference: end -->

## Project Overview

LSH (`lsh-framework` on npm) is an **encrypted secrets manager**: it syncs `.env` files across
machines with AES-256 encryption over **IPFS** (Kubo), addressed by content (CID) and published
under a deterministic **IPNS** name derived from a shared key — so a teammate with the same key
can pull the latest version with no account or central server.

It is a **CLI-only** tool. The `lsh` bin is the only supported surface (`package.json` `main`
points at `dist/cli.js`; there is no library entry point).

> **History:** LSH began as a broad POSIX/ZSH shell + job daemon + CI/CD + SaaS platform. It
> pivoted to a focused secrets manager. The shell parser/executor, ZSH layer, job/cron daemon,
> REST API/webhooks, Electron dashboard, SaaS multi-tenant code, and Supabase/Postgres
> persistence were **removed** (the platform cluster was deleted in v3.5.0). Older docs/releases
> that mention those features are historical. Don't build on them; they're gone.

## ML/Agent Context

- **`llms.txt`** — machine-readable context at repo root.
- **`lsh context`** / **`lsh context --json`** — runtime usage documentation.

## Build & Development Commands

```bash
npm run build              # Compile TypeScript to dist/
npm run watch              # Watch mode
npm run typecheck          # tsc --noEmit
npm run clean              # Remove dist/, build/, bin/

npm test                   # Jest (node --experimental-vm-modules)
npm run test:coverage      # With coverage
npm test -- --clearCache   # Clear Jest cache if tests behave oddly

npm run lint               # ESLint (flat config: eslint.config.js)
npm run lint:fix           # Auto-fix
```

### Running LSH

```bash
node dist/cli.js --help            # After building
node dist/cli.js sync              # Or any command
lsh                                # If globally linked (npm link)
```

Real top-level commands: `init`, `doctor`, `config`, `sync`, `sync-history`, `ipfs`, `migrate`,
`context`, `self`, `completion`, plus the secrets verbs `push`, `pull`, `get`, `set`, `list`,
`env`, `key`, `create`, `load`, `status`, `info`, `delete`, `clear`, `cp`. Verify with
`node dist/cli.js --help` — there is **no** `daemon`, `cron`, `api`, `supabase`, or `storacha`
command.

## Secrets Management (Primary Feature)

```bash
lsh key                    # Generate encryption key
lsh init                   # First-time setup (key + Kubo)
lsh push --env dev         # Encrypt + add to IPFS + publish IPNS
lsh pull --env dev         # Resolve IPNS + fetch CID + decrypt
lsh doctor                 # Verify Kubo installed/running
```

Rotation is **not** a built-in feature — schedule it with an external scheduler (system `cron`,
a CI job) that runs your rotation script then `lsh push`.

### Architecture (active code)

```
src/cli.ts                     Sole entry; registers commands with Commander
src/commands/                  init, doctor, config, sync, sync-history, ipfs, migrate,
                               context, self, completion
src/services/secrets/secrets.ts  push/pull/get/set/list/key verbs

src/lib/
  secrets-manager.ts           AES-256 encrypt/decrypt, git repo/branch context,
                               destructive-change detection
  ipfs-secrets-storage.ts      orchestrates store/retrieve over IPFS
  ipfs-sync.ts                 `ipfs add`/cat via Kubo HTTP API (127.0.0.1:5001)
  ipns-key-manager.ts          key-derived IPNS publish/resolve
  ipfs-client-manager.ts       detect/install/start/stop Kubo, version pinning
  sync-key-store.ts            key resolution (env / .env / ~/.config/lsh)
  ipfs-sync-logger.ts          immutable sync-record log
  config-manager.ts            lsh config
  git-utils.ts, platform-utils.ts, format-utils.ts, lsh-error.ts
  constants/                   centralized strings (see below)
```

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full module graph and push/pull
sequence diagrams.

Some generic utilities are kept but **not currently wired into the CLI** (reusable building
blocks): `command-validator`, `env-validator`, `validation-*`, `metrics/*`, `min-heap`,
`fuzzy-match`, `string-utils`, `constant-time`. They have their own tests and no dependency on
removed code.

## Environment Configuration

```bash
LSH_SECRETS_KEY=<64-char-hex>   # Required: AES-256 key (from `lsh key`)
LSH_PIN_SERVICE=<service-name>  # Optional: Kubo remote pinning service for durable sync
LSH_DISCOVERY=w3name,ipns       # Optional: pointer discovery backends (priority order);
                                # default durable w3name + DHT-IPNS fallback (issue #194)
LSH_PIN_TOKEN=<psa-token>       # Optional: auto-register a remote pin service (byte durability);
LSH_PIN_ENDPOINT=<psa-url>      #   endpoint defaults to 4EVERLAND (https://api.4everland.dev)
```

**Discovery layer** (`src/lib/discovery-backend.ts`): the `key→CID` pointer is published/resolved
through a `DiscoveryBackend`. Default is a composite of `w3name` (durable signed IPNS via
name.web3.storage — no account, survives offline nodes) + `ipns` (DHT fallback); push dual-writes,
pull resolves w3name→ipns→cache. `w3name-pointer.ts` lazily imports `w3name`/`@libp2p/crypto`. The
w3name name is identical to the Kubo-derived IPNS name (same seed). Content availability still needs
a pin (`LSH_PIN_SERVICE`); discovery durability ≠ byte durability.

There are no API/JWT/webhook/Supabase environment variables — those features were removed.

## Key Development Patterns

### TypeScript
- Target ES2022, Node ≥ 20.18, ES modules (`.js` extensions in imports required).
- `module`/`moduleResolution`: `nodenext`. **`types: ["node"]`** is pinned in `tsconfig.json` —
  do not remove it; without it tsc's ambient-type auto-include is fragile and node globals
  (`process`, `NodeJS`, `Error.captureStackTrace`) can drop out when the file graph changes.
- Strict mode partially enabled; `noImplicitAny` is off. Prefix unused vars/args with `_`.

### Adding a command
1. Create a module in `src/commands/` (or a verb in `src/services/secrets/secrets.ts`).
2. Export an init function that registers with `commander.Command`.
3. Import + call it in `src/cli.ts`.
4. Put user-facing strings in `src/constants/`.

### Error handling — use `lsh-error.ts`, never `(error as Error).message`
```typescript
import { extractErrorMessage, extractErrorDetails, wrapAsLSHError, LSHError, ErrorCodes } from './lsh-error.js';

try { await risky(); }
catch (error) {
  console.error('Failed:', extractErrorMessage(error));
  throw wrapAsLSHError(error, ErrorCodes.INTERNAL_ERROR, { op: 'risky' });
}
```

### Constants — never hardcode strings (`lsh/no-hardcoded-strings`)
`src/constants/`: `index.ts`, `paths.ts`, `config.ts`, `commands.ts`, `errors.ts`, `api.ts`,
`database.ts`, `ui.ts`, `validation.ts`.

### Network calls — always bound them
Any outbound `fetch`/request MUST use `AbortSignal.timeout(...)`. An unbounded fetch can hang
the CLI or a test indefinitely on a slow/blocked network (this caused real publish-gate hangs).

## Testing

- Framework: Jest + ts-jest, run via `node --experimental-vm-modules ./node_modules/.bin/jest`.
- Tests in top-level `__tests__/` and `src/__tests__/`.
- `jest.config.js testPathIgnorePatterns` excludes tests that need a live Kubo node / network
  (IPFS, multi-host), testcontainer-based security tests, and a flaky `constant-time`
  microbenchmark. These pass locally with infra present.
- **Coverage caveat:** the secrets/IPFS core (`secrets-manager`, `ipfs-*`) is the bulk of the
  code but its tests are CI-excluded (need Kubo), so CI coverage structurally understates real
  coverage. Global thresholds are `58/50/70/58` (stmts/branch/funcs/lines) — raise them as the
  core's tests are made mockable for CI.
- Write a test for every bug fix (TDD). Prefer extracting pure logic so it can be unit-tested
  without mocking `https`/Kubo (see `evaluateBuildRuns` in `src/commands/self.ts`).

## Common Issues & Solutions

- **`Cannot find name 'process'` / flood of TS2591 after editing files:** node ambient types
  dropped — ensure `tsconfig.json` keeps `"types": ["node"]`.
- **Tests failing oddly:** `npm test -- --clearCache`; confirm Node ≥ 20.18.
- **Import errors in tests:** ensure `.js` extensions; check `moduleNameMapper` in `jest.config.js`.

## CI/CD

### Merge gate: local `act` is authoritative
The pre-push hook runs `mcli ci preflight` (local `act`). **A green local `act` run is the
merge gate** — hosted runners here are frequently backlogged, so hosted CI is informational.

- Push WITHOUT `--no-verify` so the gate runs.
- The `Integration Tests` job declares a `services: postgres` container, which **act+podman
  cannot start** (fails at "Set up job"). That is an act limitation, not a code failure — merge
  on the strength of the other green jobs (Build & Test, Code Quality, Security Audit).
- Merge with `gh pr merge --squash --delete-branch` once local `act` passes.
- `docker` is provided by **podman** (avoids Docker Hub pull rate limits). `mcli ci doctor`.

### Workflows (`.github/workflows/`)
- `node.js.yml` — build & test (self-hosted).
- `publish.yml` — npm publish on `v*.*.*` tags. **Runs on `ubuntu-latest` (github-hosted) — this
  is required**: npm OIDC trusted publishing auto-enables sigstore provenance, and npm only
  accepts provenance from github-hosted runners (self-hosted → E422). Do not move it back to
  self-hosted.
- `njsscan.yml`, `secret-scan.yml` (Gitleaks + TruffleHog) — security scanning.

## Release Process

```bash
npm run build
npm version patch|minor|major
git tag vX.Y.Z && git push --tags     # triggers publish.yml → npm (OIDC + provenance)
```

Every release should be a GitHub release (created by `publish.yml`) and a published npm version.
Add release notes at `docs/releases/X.Y.Z.md`.

## Documentation

- `README.md` — install, quick start, usage.
- `docs/ARCHITECTURE.md` — current module graph + data flows.
- `docs/releases/X.Y.Z.md` — per-release notes.

## Concurrent Agents → Use Worktrees

When multiple agents/sessions may touch this repo simultaneously, each MUST work in its own
`git worktree` (never a shared checkout) to avoid commit commingling. See global
`~/.claude/CLAUDE.md` § "Concurrent Agents → Use Worktrees (REQUIRED)".

## External Dependencies

`commander` (CLI), `ink`/`react` (terminal UI bits), `express` (kept dep), `zx` (shell utils),
plus dev tooling (TypeScript 6, ESLint 10, Jest 30). IPFS uses the **system Kubo** binary
(managed by `ipfs-client-manager`), not a heavy npm IPFS library. See `package.json` for the
full list.
