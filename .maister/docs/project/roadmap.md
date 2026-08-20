# Development Roadmap

## Current State
- **Version**: v3.7.x (shell-init feature, bundled 4EVERLAND pinner, durable w3name pointer).
- **Key Features**:
  - Encrypted `.env` sync over IPFS (AES-256), addressed by CID.
  - Key-derived IPNS publish/resolve; durable w3name pointer + DHT-IPNS fallback (`LSH_DISCOVERY`).
  - Remote pinning for byte durability (`LSH_PIN_SERVICE` / `LSH_PIN_TOKEN`, default 4EVERLAND).
  - Multi-environment support (`--env dev|staging|prod`); `lsh doctor` health checks.
  - Shell integration (`lsh load`, shell-init for automatic secret loading).
- **Recent Updates**: durable w3name pointer backend (#194), DiscoveryBackend seam, docs purge/rewrite.

## Planned Enhancements (Next 3–6 Months)

### High Priority
- [ ] **Mockable secrets/IPFS core** — refactor `secrets-manager`/`ipfs-*` so their tests run in
  CI without a live Kubo node; CI coverage currently understates real coverage.
- [ ] **Prune dormant dependencies** — remove `express`, `pg`, `node-cron`, `jsonwebtoken`, `cors`
  (pre-pivot SaaS artifacts) from `package.json`; verify no indirect imports.

### Medium Priority
- [ ] **Phased `noImplicitAny`** — enable in stages toward full TypeScript strict mode.
- [ ] **User-facing discovery/durability docs** — explain w3name vs pinning (discovery durability ≠ byte durability).
- [ ] **Troubleshooting guide** — common Kubo daemon / key-resolution / environment issues.

### Technical Debt
- [ ] **Audit command registration** — confirm no duplicate command registrations across files.
- [ ] **Config precedence doc** — diagram the key lookup chain (env → .env → ~/.env → ~/.config/lsh).

## Future Considerations
- **Feature Ideas**: built-in key rotation helper (currently external-scheduler only); contributing guide.
- **Scalability**: encryption/IPFS performance benchmarks; testcontainer-based Kubo fixture for CI.

---
*Assessment based on project analysis performed 2026-06-26*
