# Project Vision

## Overview
**LSH** (`lsh-framework`) is a CLI-only encrypted secrets manager that syncs `.env` files across
machines and teammates with AES-256 encryption over IPFS, addressed by content (CID) and
published under a deterministic, key-derived IPNS name.

## Current State
- **Age**: Existing/mature — created March 2024; 500+ commits.
- **Status**: Active development (v3.7.x; recent feature releases June 2026).
- **Users**: Developers and teams syncing secrets across machines without a central server.
- **Tech Stack**: TypeScript 6 (ES modules), Commander 15, @libp2p/crypto, w3name, system Kubo, Jest 30.

## Purpose
Sharing `.env` files securely is a recurring pain: copy-paste over chat leaks secrets, and
hosted secret managers add an account, a server, and a trust dependency. LSH removes the server.
Encrypt once with a shared key, push to IPFS, and anyone with the same key pulls the latest
version — addressed by content, resolved by a key-derived name. "Push once, pull anywhere."

The project deliberately narrowed to this mission: it began as a broad POSIX/ZSH shell + job
daemon + CI/CD + SaaS platform and pivoted to a focused secrets manager (the shell parser,
job/cron daemon, REST API, Electron dashboard, and SaaS/Postgres code were removed in v3.5.0).

## Goals (Next 6–12 Months)
- Strengthen durability guarantees (durable w3name pointer + pinning) so synced content survives
  offline nodes — discovery durability and byte durability treated as distinct layers.
- Prune dormant pre-pivot dependencies (`express`, `pg`, `node-cron`) to shrink the security surface.
- Make the secrets/IPFS core mockable so its tests run in CI (currently Kubo-gated and excluded).
- Phased TypeScript strictness (`noImplicitAny`) toward full strict mode.

## Evolution
LSH has moved from a sprawling shell/SaaS platform to a single, sharp tool: encrypt, store on
IPFS, resolve by key-derived name. Each release tightens the focus — removing legacy code,
adding durability layers (w3name, 4EVERLAND pinner), and hardening network calls
(`AbortSignal.timeout` on every outbound request).
