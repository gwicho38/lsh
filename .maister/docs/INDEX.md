# Documentation Index

**IMPORTANT**: Read this file at the beginning of any development task to understand available documentation and standards.

## Quick Reference

### Project Documentation
Project-level documentation covering LSH's vision (CLI-only encrypted secrets manager), roadmap, technology choices, and system architecture.

### Technical Standards
Coding standards, conventions, and best practices organized by domain: global, backend, and testing.

---

## Project Documentation

Located in `.maister/docs/project/`

### Vision (`project/vision.md`)
LSH as a CLI-only encrypted `.env` secrets manager (AES-256 over IPFS, key-derived IPNS, "push once, pull anywhere"); current state (v3.7.x, mature/active), the pivot away from the pre-v3.5.0 POSIX/ZSH shell + job daemon + SaaS platform, and 6–12 month goals (durability layers, dependency pruning, mockable IPFS core, phased TypeScript strictness).

### Roadmap (`project/roadmap.md`)
Current v3.7.x feature set (IPFS AES-256 sync, w3name + DHT-IPNS discovery, remote pinning, multi-env, shell integration) and prioritized work: high (mockable secrets/IPFS core for CI, prune dormant deps), medium (phased `noImplicitAny`, discovery/durability docs, troubleshooting guide), tech debt (command-registration audit, config-precedence doc), and future ideas (key-rotation helper, CI Kubo testcontainer).

### Tech Stack (`project/tech-stack.md`)
TypeScript 6 (ESM, `nodenext`, ES2022, partial strict, `types: ["node"]` pin); CLI stack (Commander 15, chalk, inquirer, ora); Jest 30 + ts-jest; no app DB/web framework (express/pg dormant); npm/Node ≥20.18 build; GitHub Actions CI with local-`act` merge gate; ESLint 10 + custom `lsh/no-hardcoded-strings`; key deps (@libp2p/crypto, w3name, system Kubo, dotenv); dormant removal candidates (express, pg, node-cron, jsonwebtoken, cors).

### Architecture (`project/architecture.md`)
Layered command-driven CLI (`cli.ts → commands/ → services/ → lib/`); module map (secrets-manager, ipfs-secrets-storage, ipfs-sync, ipns-key-manager, discovery-backend, w3name-pointer, ipfs-client-manager, sync-key-store, lsh-error, config-manager); push/pull data flows (encrypt → ipfs add → dual-write w3name+ipns → pin; resolve w3name→ipns→cache → cat → decrypt); external integrations (Kubo, w3name, pin service, git); no DB; env vars and key-resolution chain.

---

## Technical Standards

### Global Standards

Located in `.maister/docs/standards/global/`

#### Conventions (`standards/global/conventions.md`)
Predictable structure, up-to-date documentation, clean version control, environment variables, minimal dependencies, consistent reviews, testing standards, feature flags, changelog updates, build-what's-needed, kebab-case file names, relative imports (no path aliases), function declarations + async/await, modern JS idioms enforced as ESLint errors, and `interface` for shapes / PascalCase classes.

#### Coding Style (`standards/global/coding-style.md`)
Naming consistency, automatic formatting, descriptive names, focused functions, uniform indentation, no dead code, no backward compatibility unless required, DRY, no explicit `any`, `_`-prefixed unused vars/args, restricted `console` usage, and JSDoc file-header block comments.

#### Error Handling (`standards/global/error-handling.md`)
Error handling via `lsh-error.ts` (`LSHError`, `ErrorCodes`, `extractErrorMessage`/`wrapAsLSHError`) — never `(error as Error).message`.

#### Commenting (`standards/global/commenting.md`)
Let code speak, comment sparingly, and no change/history comments.

#### Minimal Implementation (`standards/global/minimal-implementation.md`)
Build what you need, clear purpose, delete exploration artifacts, no future stubs, no speculative abstractions, review before commit, and treat unused code as debt.

#### Validation (`standards/global/validation.md`)
Server-side always, client-side for feedback, validate early, specific errors, allowlists over blocklists, type and format checks, input sanitization, business rules, and consistent enforcement.

#### TypeScript / ESM (`standards/global/typescript.md`)
`.js` extension on relative imports (ESM `nodenext`), partial strict flags with `types: ["node"]` pinned, and the runtime/target baseline (ES2022, Node ≥20.18).

#### Constants (`standards/global/constants.md`)
No hardcoded strings — centralize user-facing strings and config values in `src/constants/` (enforced by `lsh/no-hardcoded-strings`).

#### Tooling & CI (`standards/global/tooling-ci.md`)
Standard npm script vocabulary, local `act` as the authoritative merge gate, blocking TypeScript typecheck CI gate, blocking ESLint pre-commit hook, multi-scanner security scanning, `publish.yml` on github-hosted runners, release process, concurrent agents use git worktrees, and documentation under `docs/`.

### Backend Standards

Located in `.maister/docs/standards/backend/`

#### Security (`standards/backend/security.md`)
Bound all network calls with `AbortSignal.timeout()`, ban dynamic code execution, async/promise correctness, and AES-256 encryption for secrets.

#### Commands (`standards/backend/commands.md`)
CLI-only surface with no library entry point, the Commander `register*Commands(program)` pattern, and the procedure for adding a CLI command.

### Testing Standards

Located in `.maister/docs/standards/testing/`

#### Test Writing (`standards/testing/test-writing.md`)
Jest + ts-jest ESM runner and layout, enforced coverage thresholds (58/50/70/58), excluding infra-dependent suites from the CI gate, Jest BDD describe/it with "should" naming, writing a test for every bug fix (TDD), explicit test cases for new and edge behavior, shared setup and standard test locations, mocking external dependencies, and keeping unit tests fast and behavior-focused.

---

## How to Use This Documentation

1. **Start Here**: Always read this INDEX.md first to understand what documentation exists
2. **Project Context**: Read relevant project documentation before starting work
3. **Standards**: Reference appropriate standards when writing code
4. **Keep Updated**: Update documentation when making significant changes
5. **Customize**: Adapt all documentation to your project's specific needs

## Updating Documentation

- Project documentation should be updated when goals, tech stack, or architecture changes
- Technical standards should be updated when team conventions evolve
- Always update INDEX.md when adding, removing, or significantly changing documentation
