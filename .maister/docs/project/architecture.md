# System Architecture

## Overview
LSH is a single CLI application that encrypts a project's `.env`, stores the ciphertext on IPFS
(addressed by CID), and publishes a `key → CID` pointer under a deterministic IPNS name derived
from a shared key. A teammate with the same key resolves the pointer and decrypts — no account,
no central server. Durability is layered: w3name gives a durable signed pointer; a pin service
gives byte durability.

## Architecture Pattern
**Pattern**: Modular, layered command-driven CLI.

```
cli.ts  →  commands/  →  services/  →  lib/
(entry)    (handlers)   (verbs)       (core: crypto, IPFS, IPNS, config)
```

`cli.ts` registers every command with Commander. Command modules own user interaction; the
secrets service owns verb logic (push/pull/get/set/list/key); `lib/` holds the encryption,
IPFS, IPNS/discovery, and config primitives. All user-facing strings live in `src/constants/`
(enforced by the `lsh/no-hardcoded-strings` ESLint rule).

## System Structure

### CLI Entry
- **Location**: `src/cli.ts`
- **Purpose**: Sole entry point; registers all top-level commands with Commander.
- **Key Files**: `src/cli.ts`

### Commands
- **Location**: `src/commands/`
- **Purpose**: Command handlers for `init`, `doctor`, `config`, `sync`, `sync-history`, `ipfs`,
  `migrate`, `context`, `self`, `completion`.
- **Key Files**: `sync.ts`, `init.ts`, `doctor.ts`, `config.ts`, `self.ts`

### Secrets Service
- **Location**: `src/services/secrets/secrets.ts`
- **Purpose**: Secrets verbs — `push`, `pull`, `get`, `set`, `list`, `env`, `key`, `create`,
  `load`, `status`, `info`, `delete`, `clear`, `cp`.

### Core Library
- **Location**: `src/lib/`
- **Purpose**: The engine.
- **Key Files**:
  - `secrets-manager.ts` — AES-256 encrypt/decrypt, git repo/branch context, destructive-change detection.
  - `ipfs-secrets-storage.ts` — orchestrates store/retrieve over IPFS.
  - `ipfs-sync.ts` — `ipfs add`/`cat` via Kubo HTTP API (127.0.0.1:5001).
  - `ipns-key-manager.ts` — key-derived IPNS publish/resolve.
  - `discovery-backend.ts` — `DiscoveryBackend` seam; composite of w3name (durable) + ipns (DHT fallback).
  - `w3name-pointer.ts` — durable signed pointer; lazily imports `w3name`/`@libp2p/crypto`.
  - `ipfs-client-manager.ts` — detect/install/start/stop Kubo, version pinning.
  - `sync-key-store.ts` — key resolution (env / .env / ~/.env / ~/.config/lsh).
  - `lsh-error.ts` — `LSHError` class + `ErrorCodes`; `extractErrorMessage`/`wrapAsLSHError` helpers.
  - `config-manager.ts`, `git-utils.ts`, `platform-utils.ts`, `format-utils.ts`.

### Constants
- **Location**: `src/constants/`
- **Purpose**: Centralized user-facing strings and config values.
- **Key Files**: `index.ts`, `paths.ts`, `config.ts`, `commands.ts`, `errors.ts`, `api.ts`, `ui.ts`, `validation.ts`.

## Data Flow

`lsh push --env <env>`:
```
.env  →  SecretsManager (AES-256 encrypt)  →  ipfs-sync (ipfs add → CID)
      →  discovery dual-write: w3name(publish) + ipns(publish)  →  optional pin service
```

`lsh pull --env <env>`:
```
discovery resolve: w3name → ipns → cache  →  CID  →  ipfs-sync (ipfs cat)
      →  SecretsManager (AES-256 decrypt)  →  .env
```

## External Integrations
- **IPFS / Kubo** — local daemon over HTTP API (127.0.0.1:5001), managed by `ipfs-client-manager`.
- **w3name (name.web3.storage)** — durable signed IPNS pointers; no account.
- **Remote pin service** — `LSH_PIN_SERVICE` / `LSH_PIN_TOKEN` (default 4EVERLAND) for byte durability.
- **Git** — repo/branch context for environment scoping (`git-utils`).

## Database Schema
None. State is encrypted content on IPFS addressed by CID; the only persisted local artifacts
are the key store (`~/.config/lsh`), the secrets cache (`~/.lsh/secrets-cache/`), and the
immutable sync-record log (`ipfs-sync-logger`).

## Configuration
- **Env vars**: `LSH_SECRETS_KEY` (required, AES-256 key), `LSH_PIN_SERVICE`, `LSH_PIN_TOKEN`,
  `LSH_PIN_ENDPOINT`, `LSH_DISCOVERY` (backend priority order).
- **Config file**: `~/.config/lsh/lshrc` (via `config-manager`).
- **Key resolution chain**: `process.env` → `.env` → `~/.env` → `~/.config/lsh` → null.

## Deployment Architecture
Not a deployed service. Distributed as the `lsh-framework` npm package (`bin: lsh`). Durability
of synced content depends on IPFS pinning, not on any hosted LSH infrastructure. See
[docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) for the full module graph and sequence diagrams.

---
*Based on codebase analysis performed 2026-06-26*
