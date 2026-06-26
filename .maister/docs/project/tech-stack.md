# Technology Stack

## Overview
This document describes the technology choices and rationale for **LSH** (`lsh-framework`),
a CLI-only encrypted secrets manager that syncs `.env` files across machines with AES-256
encryption over IPFS, addressed by content (CID) and published under a key-derived IPNS name.

## Languages

### TypeScript (6.0.3)
- **Usage**: ~100% of source (`src/` is TypeScript; no other language in the app)
- **Rationale**: Strong typing for a security-sensitive tool (encryption, key handling),
  first-class npm distribution, and ES module support for a modern Node CLI.
- **Key Features Used**: ES modules with mandatory `.js` import extensions, ES2022 target,
  `nodenext` module resolution, partial strict mode (`strictNullChecks`, `strictFunctionTypes`,
  etc. on; `noImplicitAny` off pending phased rollout), `types: ["node"]` pinned in
  `tsconfig.json` (required — prevents node ambient types dropping when the file graph changes).

## Frameworks

### Frontend
Not applicable — CLI-only tool. `ink`/`react` are present only for small terminal-UI bits,
not a web frontend.

### Backend
No web/server framework in active use. `express` is a retained but dormant dependency from the
pre-pivot SaaS era (the REST API/SaaS code was removed in v3.5.0); it is a removal candidate.

### CLI
- **Commander.js (15.0.0)** — command registration, argument parsing, help generation.
- **chalk (5.3.0)** — colored terminal output.
- **inquirer (14.0.1)** — interactive prompts.
- **ora (9.0.0)** — progress spinners.

### Testing
- **Jest (30.4.2)** + **ts-jest (29.2.5)** — run via `node --experimental-vm-modules`.

## Database
No application database. LSH is peer-to-peer by design: state lives as encrypted content on
IPFS, addressed by CID and resolved via IPNS / w3name. `pg` (PostgreSQL) remains in
`package.json` as a dormant pre-pivot dependency and is a removal candidate.

## Build Tools & Package Management
- **npm** (≥10.0.0), Node.js **≥20.18.0**.
- **TypeScript compiler (`tsc`)** — `npm run build` compiles `src/` → `dist/`; `npm run typecheck`
  runs `tsc --noEmit`.

## Infrastructure

### Containerization
None for the app itself. Docker/podman is used locally only as the engine for `act`
(local GitHub Actions runner) in the CI gate.

### CI/CD
- **GitHub Actions**: `node.js.yml` (build & test, self-hosted), `publish.yml` (npm publish on
  `v*.*.*` tags — runs on `ubuntu-latest` for OIDC trusted publishing + sigstore provenance),
  `njsscan.yml`, `secret-scan.yml` (Gitleaks + TruffleHog).
- **Merge gate**: local `act` via `mcli ci preflight` is authoritative; hosted runners are
  informational (backlogged self-hosted single runner).

### Hosting / Distribution
- **npm** — published as `lsh-framework` (OIDC trusted publishing + provenance).
- Content durability via IPFS pinning (`LSH_PIN_SERVICE`, bundled 4EVERLAND pinner).

## Development Tools

### Linting & Formatting
- **ESLint (10.4.1)** + **@typescript-eslint (8.60.0)** — flat config (`eslint.config.js`).
- Custom rule `lsh/no-hardcoded-strings` enforces centralized constants.

### Type Checking
- **TypeScript (`tsc --noEmit`)** — `npm run typecheck`.

## Key Dependencies
- **@libp2p/crypto (5.1.19)** — crypto primitives (also used by w3name key derivation).
- **bcrypt (6.0.0)** — password hashing.
- **w3name (1.1.3)** — durable signed IPNS pointers via name.web3.storage (no account).
- **IPFS / Kubo** — system binary, managed by `ipfs-client-manager` (not a heavy npm IPFS lib).
- **dotenv (17.2.3)** — `.env` loading.
- **smol-toml (1.3.1)**, **js-yaml (4.1.0)** — config parsing.
- **glob (13.0.0)**, **chokidar (5.0.0)** — file globbing / watching.
- **zx** — shell utilities.

### Dormant / removal candidates
`express`, `pg`, `node-cron`, `jsonwebtoken`, `cors` — artifacts of the removed SaaS platform
(v3.5.0). Still in `package.json`; not wired into the CLI.

## Version Management
- Semantic versioning (`M.m.s`). Releases tagged `vX.Y.Z`; the tag triggers `publish.yml`.
- Release notes per version in `docs/releases/X.Y.Z.md`.

## Migration Path
- Prune dormant SaaS dependencies (`express`, `pg`, `node-cron`, `jsonwebtoken`, `cors`).
- Phased `noImplicitAny` enablement toward full strict mode.

---
*Last Updated*: 2026-06-26
*Auto-detected*: languages, frameworks, build/test/lint tooling, dependencies, CI/CD, versioning
(via project-analyzer). *User-provided*: project description.
