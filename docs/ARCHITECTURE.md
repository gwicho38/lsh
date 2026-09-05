# LSH Architecture

This document describes the high-level architecture and module dependencies of LSH as it exists today.

> **Status note (v3.5.0).** LSH has pivoted from a broad shell/daemon/CI-CD platform into a
> focused **encrypted secrets manager** that syncs `.env` files over **IPFS** (Kubo) with
> IPNS-based deterministic naming. The shell parser/executor and ZSH-compatibility layers
> described in older revisions of this document were removed earlier; in **v3.5.0** the
> remaining dormant cluster (SaaS multi-tenant, job/cron daemon, Supabase/Postgres
> persistence) — which compiled but was never wired into the CLI — was **deleted**. What is
> documented below is now the whole of the codebase, not a subset.

## Overview

LSH is an encrypted secrets manager. The user encrypts a `.env` locally with a key, the
ciphertext is added to IPFS via a local Kubo daemon, and an IPNS name (derived from the key)
gives the blob a stable address so any machine sharing the key can resolve and pull it.

```mermaid
flowchart TD
    CLI["CLI Layer — src/cli.ts<br/>(command registration, option parsing)"]
    CMD["Commands — src/commands/<br/>init · doctor · config · sync · sync-history<br/>ipfs · migrate · context · self · completion"]
    SVC["Secrets Service — src/services/secrets/secrets.ts<br/>(push · pull · get · set · list · key)"]
    SM["SecretsManager — src/lib/secrets-manager.ts<br/>(git-context, destructive-change detection)"]
    ENV["SecretsEnvelope — src/lib/secrets-envelope.ts<br/>(AES-256-GCM versioned envelope)"]
    STORE["IPFSSecretsStorage — src/lib/ipfs-secrets-storage.ts"]
    SYNC["IPFSSync — src/lib/ipfs-sync.ts"]
    IPNS["IPNSKeyManager — src/lib/ipns-key-manager.ts"]
    KUBO["IPFSClientManager — src/lib/ipfs-client-manager.ts<br/>(detect/install/run Kubo, ports 5001/8080)"]
    KEYS["SyncKeyStore — src/lib/sync-key-store.ts<br/>(persistent key resolution)"]

    CLI --> CMD
    CLI --> SVC
    CMD --> SM
    SVC --> SM
    SM --> STORE
    SM --> KEYS
    STORE --> SYNC
    STORE --> IPNS
    SYNC --> KUBO
    IPNS --> KUBO
```

## Entry points

| File | Purpose |
|------|---------|
| `src/cli.ts` | Sole runtime entry. Registers the secrets-centric command set with Commander. |
| `dist/cli.js` | The published `lsh` bin (built from `src/cli.ts`). |

> LSH ships as a CLI, not a library; the CLI is the only supported surface. The
> `package.json` `main` field points at `dist/cli.js` (the built entry).

## Active module graph

### Commands (`src/commands/`)

| Command file | Registers | Depends on (lib) |
|---|---|---|
| `init.ts` | `lsh init` | `platform-utils`, `git-utils` |
| `doctor.ts` | `lsh doctor` | `platform-utils`, `ipfs-client-manager`, `ipfs-sync` |
| `config.ts` | `lsh config` | `config-manager`, `constants` |
| `sync.ts` | `lsh sync` | `ipfs-sync`, `ipfs-client-manager`, `ipns-key-manager`, `git-utils` |
| `sync-history.ts` | `lsh sync-history` | `ipfs-sync-logger`, `git-utils` |
| `ipfs.ts` | `lsh ipfs` | `ipfs-client-manager`, `ipfs-sync`, `ipns-key-manager`, `git-utils` |
| `migrate.ts` | `lsh migrate` | `git-utils` |
| `context.ts` | `lsh context` | — (emits llms.txt-style context) |
| `self.ts` | `lsh self` | `constants` |
| `completion.ts` | `lsh completion` | — |

`src/services/secrets/secrets.ts` registers the core verbs (`push`, `pull`, `get`, `set`,
`list`, `key`) and depends on `secrets-manager`, `git-utils`, `format-utils`,
`ipfs-client-manager`, `sync-key-store`, `constants`.

### Secrets + IPFS core (`src/lib/`)

```
secrets-envelope.ts           versioned AES-256-GCM envelope (encrypt/decrypt for every sync path)
secrets-manager.ts            git repo/branch context,
  ├── logger.ts               destructive-change detection
  ├── git-utils.ts
  ├── ipfs-sync-logger.ts
  ├── ipfs-secrets-storage.ts ── orchestrates store/retrieve over IPFS
  │     ├── ipfs-sync.ts       ── `ipfs add` / cat via Kubo HTTP API (127.0.0.1:5001)
  │     ├── ipns-key-manager.ts── key-derived IPNS name publish/resolve
  │     └── (back-ref) secrets-manager.ts
  ├── sync-key-store.ts        persistent key resolution (env / .env / ~/.config/lsh)
  └── lsh-error.ts

ipfs-client-manager.ts         detect/install/start/stop Kubo, version pinning, health checks
config-manager.ts              lsh config read/write
platform-utils.ts              OS/arch detection for Kubo binaries
format-utils.ts                table/JSON/yaml output helpers
constants/                     centralized strings (see below)
```

> `secrets-manager.ts` and `ipfs-secrets-storage.ts` reference each other (the storage layer
> reuses the manager's crypto helpers). This is the one intentional cycle in the active core.

### Constants (`src/constants/`)

| File | Purpose |
|------|---------|
| `index.ts` | Re-exports all constants |
| `paths.ts` | File/cache/socket paths (`~/.lsh`, `~/.config/lsh`) |
| `config.ts` | Defaults, Kubo ports, IPNS settings |
| `commands.ts` | CLI command/verb names |
| `errors.ts` | Error messages |
| `api.ts` | HTTP endpoints/headers (Kubo API, pinning) |
| `database.ts` | Table names (used only by dormant cluster) |
| `ui.ts` | Help text, banners, colors |
| `validation.ts` | Validation patterns/limits |

The custom ESLint rule `lsh/no-hardcoded-strings` (currently `warn`) enforces use of these.

### Error handling (`src/lib/lsh-error.ts`)

```
LSHError (structured error class)
  ├── code: ErrorCode          (ErrorCodes.* constants)
  ├── message: string
  ├── context?: Record<string, unknown>
  └── statusCode: number
Utilities
  ├── extractErrorMessage(unknown): string   ← use instead of (e as Error).message
  ├── extractErrorDetails(unknown): object
  ├── wrapAsLSHError(e, code, ctx): LSHError
  └── isLSHError(unknown, code?): boolean
```

## Data flows

### `lsh push`

```mermaid
sequenceDiagram
    participant U as CLI (lsh push)
    participant S as secrets-manager
    participant K as SyncKeyStore
    participant St as ipfs-secrets-storage
    participant Sy as ipfs-sync
    participant N as ipns-key-manager
    participant Kubo as Kubo daemon (127.0.0.1:5001)

    U->>S: read .env + git context
    S->>K: resolve LSH_SECRETS_KEY
    S->>S: AES-256-GCM envelope encrypt + detect destructive changes
    S->>St: store(ciphertext, metadata)
    St->>Sy: ipfs add → CID
    Sy->>Kubo: POST /api/v0/add
    St->>N: derive IPNS key, publish CID
    N->>Kubo: POST /api/v0/name/publish
    Kubo-->>U: IPNS name + CID (cached in ~/.lsh/secrets-cache)
```

### `lsh pull`

```mermaid
sequenceDiagram
    participant U as CLI (lsh pull)
    participant N as ipns-key-manager
    participant Sy as ipfs-sync
    participant Kubo as Kubo daemon
    participant S as secrets-manager

    U->>N: resolve IPNS name (key-derived)
    N->>Kubo: POST /api/v0/name/resolve → CID
    U->>Sy: cat CID
    Sy->>Kubo: POST /api/v0/cat → ciphertext
    U->>S: verify auth tag, then AES-256-GCM decrypt
    S-->>U: write .env
```

Optional durability: a remote pinning service (e.g. Pinata) can pin the CID so the blob
survives when the local Kubo node is offline. `lsh doctor` verifies Kubo is installed and
running; `lsh init` performs first-time key + Kubo setup.

## Discovery & durability (issue #194)

Two independent concerns, decoupled:

**Discovery** — "given the key, what's the latest CID?" — goes through a `DiscoveryBackend`
seam (`src/lib/discovery-backend.ts`):

```
getDiscoveryBackend(ipfsSync)            reads LSH_DISCOVERY (default "w3name,ipns")
  ├── W3nameDiscoveryBackend             durable signed IPNS via name.web3.storage
  │     └── w3name-pointer.ts            lazy-imports w3name + @libp2p/crypto
  ├── IpnsDiscoveryBackend               IPNS over the DHT (fallback / backward compat)
  │     └── ipns-key-manager.ts          deterministic key derived from LSH_SECRETS_KEY
  └── CompositeDiscoveryBackend          dual-write on push; resolve w3name → ipns → cache
```

Both backends derive the **same** ed25519 key from `LSH_SECRETS_KEY` (HMAC), so the w3name name
and the Kubo IPNS name are identical — one logical pointer. w3name fixes the DHT-IPNS weakness
(records expire ~24–48h unless an online node republishes); the DHT remains as fallback.

**Availability** — "can the encrypted bytes be fetched?" — is separate. `IPFSSync.addRemotePin`
pins the CID to a Kubo remote pinning service. `ensureDefaultPinService` auto-registers a bundled
service when `LSH_PIN_TOKEN` is set (endpoint defaults to 4EVERLAND, override via
`LSH_PIN_ENDPOINT`); `chooseRemoteService` (pure) selects among configured services
(explicit `LSH_PIN_SERVICE` → bundled `lsh-pin` → sole service).

> Discovery durability ≠ byte durability: a durable pointer is useless if no node holds the
> bytes. Use a pin service (`LSH_PIN_TOKEN`) or keep a node online for the content.

## Security considerations

1. **Secrets encryption** — **AES-256-GCM** (authenticated encryption) for all stored `.env`
   content, in a versioned envelope; keys never leave the machine. See
   [Secrets envelope format](#secrets-envelope-format) below.
2. **Key handling** — `LSH_SECRETS_KEY` resolved via `SyncKeyStore` (env → `.env` → `~/.config/lsh`); shared out-of-band (password manager) for team sync.
3. **Destructive-change detection** — `secrets-manager` refuses to overwrite a remote blob that would drop keys without an explicit flag.
4. **Input validation** — `command-validator.ts` / `env-validator.ts` / `validation-framework.ts` remain in the tree with strong coverage; they gate the dormant daemon/API surface and are available for reuse.

### Secrets envelope format

Every active write path — `lsh push`, `lsh sync push`, and `lsh sync now` — serializes its
ciphertext with `src/lib/secrets-envelope.ts` into one self-describing envelope:

```json
{"v":1,"alg":"aes-256-gcm","meta":{"environment":"prod","payload":"env-text","repo":"lsh"},
 "iv":"<24 hex chars>","tag":"<32 hex chars>","ct":"<hex>"}
```

| Field | Meaning |
|-------|---------|
| `v`   | Envelope wire-format version (currently `1`). |
| `alg` | Exact algorithm. New writes are always `aes-256-gcm`. |
| `meta`| Bounded authenticated metadata: `environment`, `repo`, `payload` (plaintext shape). Capped at 1 KiB; unknown keys are rejected. |
| `iv`  | 96-bit random GCM nonce, fresh per write. |
| `tag` | 128-bit GCM authentication tag. |
| `ct`  | Hex ciphertext. |

The additional authenticated data is the canonical serialization of `{v, alg, meta}`, so
tampering with the version, the algorithm name, or the metadata fails authentication. The
content key is `sha256(LSH_SECRETS_KEY)`.

**Compatibility policy.**

- Reads accept the envelope **and** the legacy unauthenticated two-part
  `ivHex:ciphertextHex` AES-256-CBC payload. The two are distinguished by the first
  non-space character: the envelope is JSON and starts with `{`.
- Legacy payloads are decrypted for migration only. LSH **never writes** the legacy format
  and **never silently re-publishes** a legacy payload during a pull. A pull that reads one
  prints the notice *before* the output file is replaced; the payload is upgraded only by an
  explicit push, which leaves the old CID intact for rollback.
- **Residual risk of the legacy path.** Reading CBC at all means reading unauthenticated
  ciphertext, and no implementation can change that. Concretely, for a payload in the legacy
  form an attacker who can serve the bytes can (a) bit-flip the IV or a ciphertext block to
  make controlled edits to the decrypted `.env` — CBC is malleable — and (b) forge a blob that
  passes PKCS#7 padding roughly once in 256 attempts, yielding arbitrary garbage rather than a
  clean failure. The distinct legacy failure message is also a padding oracle in principle.
  These are the reasons legacy support exists only to be migrated away from: upgrade every
  payload with a push, after which every read of that pointer is authenticated. Only the AEAD
  envelope provides integrity.
- An envelope whose `v` is not understood is rejected rather than guessed at, so an older
  LSH fails loudly instead of writing garbage to `.env`.
- Authentication is verified **before** the plaintext is parsed or written, so a tampered
  payload can never reach `JSON.parse` or the output file.

> The two write paths still wrap *different plaintext shapes* — raw `.env` text for the
> `lsh sync` surface and a JSON `Secret[]` for `lsh push`. The `meta.payload` field records
> which; unifying the shapes is tracked separately.

## Testing strategy

- **Framework:** Jest + ts-jest, run via `node --experimental-vm-modules ./node_modules/.bin/jest`.
- **Location:** top-level `__tests__/` (unit + integration).
- **CI exclusions (`jest.config.*` `testPathIgnorePatterns`):** IPFS/secrets tests that need a live Kubo node or network, multi-host sync, and testcontainer-based security tests are skipped in CI and run manually.
- **Network discipline:** any module performing outbound `fetch` (e.g. `ipfs-client-manager.getLatestKuboVersion`) **must** bound the request with `AbortSignal.timeout` so a blocked/slow network falls back instead of hanging the CLI or a test.
- **Coverage scope (`collectCoverageFrom`):** excludes `cli.ts`, `commands/**`, `services/daemon/**`, and the SaaS API — these require integration testing. Be aware that headline coverage numbers therefore describe the pure-logic core, not the user-facing CLI.

## Removed in v3.5.0

The pre-pivot platform cluster — SaaS multi-tenant (`saas-*`, `saas-api-*`), the job/cron
daemon (`job-manager`, `cron-job-manager`, `daemon-client`, `daemon/lshd`, `services/{cron,daemon}`),
and Supabase/Postgres persistence (`supabase-client`, `database-persistence`,
`database-{schema,types}`, `cloud-config-manager`, `enhanced-history-system`) — was deleted in
v3.5.0. It compiled but had no inbound edges from the CLI, so it was removed as a unit along
with its tests.

A few generic utilities that are not currently wired into the CLI are intentionally **kept**
as reusable building blocks (e.g. `command-validator`, `env-validator`, `validation-*`,
`metrics/*`, `min-heap`, `fuzzy-match`, `string-utils`, `constant-time`). They are dependency-free
of the removed cluster and carry their own tests.

## Adding new features

1. [ ] Define types alongside the feature (the active core does not use the `saas-types` split).
2. [ ] Implement in `src/lib/` with `LSHError`-based error handling.
3. [ ] Add a command in `src/commands/` (or a verb in `src/services/secrets/secrets.ts`).
4. [ ] Register it in `src/cli.ts`.
5. [ ] Add user-facing strings to `src/constants/`.
6. [ ] Bound any outbound network call with a timeout.
7. [ ] Write tests in `__tests__/`; mock Kubo/network for unit tests.
8. [ ] Update this document if the architecture changes.
