## Security

Security standards for LSH, a CLI-only encrypted secrets manager. State is encrypted
content addressed on IPFS — there is no web framework or application database.

### Bound all network calls with `AbortSignal.timeout()`

Any outbound `fetch`/request MUST pass `signal: AbortSignal.timeout(...)`. An unbounded
fetch can hang the CLI or a test indefinitely on a slow or blocked network — this caused
real publish-gate and Jest-timeout hangs. All 20/20 fetch calls comply across
`ipfs-sync.ts`, `ipfs-client-manager.ts`, and `ipns-key-manager.ts`. Also clear any manual
timeout handle in a `finally` block so timers never leak.

```typescript
await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
```

Sources: code, CLAUDE.md, PR reviews #185 / #196 / #193.

### Ban dynamic code execution

`no-eval`, `no-implied-eval` (no string arguments to `setTimeout`/`setInterval`),
`no-new-func`, and `no-script-url` are all hard ESLint errors. Never construct executable
code from input — e.g. `new Function(userInput)` is forbidden.

Source: `eslint.config.js`.

### Async / promise correctness

`array-callback-return`, `no-promise-executor-return`, and `require-atomic-updates` are
ESLint errors. `no-await-in-loop` is a warning: sequential awaits are allowed when the
ordering is intentional, otherwise prefer `Promise.all` for concurrency.

Source: `eslint.config.js`.

### AES-256 encryption for secrets

Secrets are encrypted with AES-256 using a user-provided key (`LSH_SECRETS_KEY`, a 64-char
hex string / 32 bytes) via the Node `crypto` module, with a random IV generated per
encryption. Keys never leave the user's machine — only encrypted content is published to
IPFS.

Sources: ADR-0002, CLAUDE.md.
