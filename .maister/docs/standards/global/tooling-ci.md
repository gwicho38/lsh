## Tooling & CI

### Standard npm script vocabulary
Use the project's defined npm scripts rather than ad-hoc tool invocations: `build` (`tsc`), `watch`, `typecheck` (`tsc --noEmit`), `lint` / `lint:fix` (`eslint src --ext .js,.ts,.tsx`), `clean`, and `test` / `test:ci` / `test:coverage`. Source: `package.json`.

### Local `act` is the authoritative merge gate
The pre-push hook runs `mcli ci preflight` (local `act`), and a green `act` run IS the merge gate — hosted runners here are frequently backlogged, so hosted CI is informational. Push WITHOUT `--no-verify` so the gate runs. The `Integration Tests` job declares a `services: postgres` container that act+podman cannot start (fails at "Set up job") — this is an act limitation, not a code failure; merge on the strength of the other green jobs. Merge with `gh pr merge --squash --delete-branch` once local `act` passes.

### TypeScript typecheck is a blocking CI gate
`npm run typecheck` (`tsc --noEmit`) has no `continue-on-error` and gates the build-and-test job. ESLint in CI is advisory (`continue-on-error: true`). A typecheck failure blocks the merge; a lint failure in CI does not (it is still blocked locally — see below). Source: `node.js.yml`.

### ESLint pre-commit hook (blocking locally)
`.git/hooks/pre-commit` runs `npm run lint` and aborts the commit on failure. There is no husky or lint-staged — the hook is plain git. Lint must pass before a commit lands.

### Multi-scanner security scanning
Three scanners run on push/PR to `main` plus weekly crons (self-hosted; skipped under act): njsscan (SARIF output), TruffleHog (`--results=verified,unknown`), and Gitleaks. Do not introduce secrets or patterns these scanners flag.

### `publish.yml` must run on github-hosted runners
npm publish happens on `v*.*.*` tags via OIDC Trusted Publishing (`--provenance --access public`, no `NPM_TOKEN`). The publish workflow MUST run on `ubuntu-latest` — npm only accepts sigstore provenance from github-hosted runners; a self-hosted runner produces an E422. Do not move it back to self-hosted.

### Release process
Release flow: `npm run build` → `npm version patch|minor|major` → `git tag vX.Y.Z && git push --tags` (which triggers `publish.yml`). Follow SemVer. Every release is a GitHub release + a published npm version + release notes at `docs/releases/X.Y.Z.md`.

### Concurrent agents use git worktrees
When multiple agents/sessions may touch the repo simultaneously, each works in its own `git worktree` (never a shared checkout) to avoid commit commingling.

```bash
git worktree add ../lsh-<slug> <branch>
```

### Documentation under `docs/`
Documentation lives under `docs/`: `README.md` (install/usage), `docs/ARCHITECTURE.md` (module graph + data flows), and `docs/releases/X.Y.Z.md` (per-release notes).
