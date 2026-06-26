## Test Writing

### Jest + ts-jest ESM runner and layout
Tests run under Jest with the ts-jest ESM preset, invoked via
`node --experimental-vm-modules ./node_modules/.bin/jest --runInBand`. ts-jest is configured with
`isolatedModules` and `useESM`, `testEnvironment: node`. Because sources use ESM `.js` extensions on
relative imports, `moduleNameMapper` maps them back to source: `'^(\\.{1,2}/.*)\\.js$': '$1'`. The
ts-jest transform overrides `moduleResolution: 'bundler'` to avoid TS6's hard `node10` error. Mocks
are reset/cleared/restored between tests. Tests live in top-level `__tests__/` and `src/__tests__/`.
Run `npm test -- --clearCache` when tests behave oddly, and confirm Node ≥ 20.18.

### Coverage thresholds enforced (58/50/70/58)
Global Jest `coverageThreshold` is a hard CI minimum: 58% statements, 50% branches, 70% functions,
58% lines (verified by `npm test -- --coverage`). Aim for 70%+ on new or changed code. The
thresholds are deliberately low because the secrets/IPFS core needs a live Kubo node and is excluded
from the CI gate, which structurally understates real coverage — raise the thresholds as that core
is made mockable for CI.

### Exclude infra-dependent suites from the CI gate
Tests that need a live Kubo/IPFS node, network access, multi-host setup, testcontainers/Docker, or
timing microbenchmarks are listed in `testPathIgnorePatterns` so CI stays deterministic (they still
pass locally with the infra present). `collectCoverageFrom` likewise excludes CLI command modules,
secrets registrars, and integration-only modules. When you add a test in any of these categories,
register it in `testPathIgnorePatterns`.

### Jest BDD describe/it with "should" naming
Use nested `describe` blocks per unit under test and `it('should ...')` phrasing for each case. Name
tests to explain what is being tested and the expected outcome. `test()` is effectively unused in
this repo (327 `it` vs 1 `test`) — prefer `it`. Relative imports in tests also carry the `.js`
extension.

```typescript
describe('isInGitRepo', () => {
  it('should return true for a git repository', () => {
    // ...
  });
});
```

### Write a test for every bug fix (TDD)
Every bug fix gets a test, written test-first to confirm the failure before the fix. Prefer
extracting pure logic so it can be unit-tested without mocking `https`/Kubo — see `evaluateBuildRuns`
in `src/commands/self.ts` for the pattern of pulling decision logic out of the network/IO path so it
is directly testable.

### Add explicit test cases for new and edge behavior
Cover new logic and its edge cases so behavior is documented and locked in (a standing PR-review
norm). In particular, lock falsy-as-default contracts with explicit cases — e.g. an empty-string env
var like `LSH_PIN_SERVICE=''` should be tested to assert it falls back to the default rather than
being treated as a configured value.

### Shared setup and standard test locations
A single `setupFiles: ['<rootDir>/__tests__/setup.ts']` runs before every suite; place global test
setup there rather than repeating it per file. `moduleFileExtensions` is `['js', 'ts']`. Put new
unit tests in `__tests__/` (or `src/__tests__/`) in a file matching the module under test.

### Mock external dependencies
Isolate unit tests by mocking external services — the Kubo HTTP API, network `fetch`/`https` calls,
and the filesystem where practical — so tests are deterministic and fast. Pair this with the
pure-logic extraction pattern above to minimize how much must be mocked.

### Keep unit tests fast and behavior-focused
Unit tests should run in milliseconds so they can be run frequently, and should assert on observable
behavior (inputs/outputs, returned errors) rather than internal implementation detail, so code can be
refactored safely without rewriting tests.
