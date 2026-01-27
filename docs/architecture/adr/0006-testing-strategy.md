# ADR-0006: Testing Strategy

## Status

Accepted

## Date

2026-01-27

## Context

LSH needs comprehensive testing to ensure:
- Encryption works correctly (security-critical)
- CLI commands behave as expected
- Daemon processes jobs reliably
- API endpoints return correct responses
- Refactoring doesn't break existing functionality

Testing challenges:
- External dependencies (Supabase, IPFS, filesystem)
- Async operations (job scheduling, network requests)
- Process management (daemon start/stop)
- Time-dependent behavior (cron schedules)

Requirements:
- Fast test execution for developer feedback
- Reliable tests (no flakiness)
- Good coverage of critical paths
- TypeScript support
- CI/CD integration

## Decision

We chose **Jest** as our testing framework with the following strategy:

Testing pyramid:
```
       /\
      /  \     E2E tests (few)
     /----\
    /      \   Integration tests (some)
   /--------\
  /          \ Unit tests (many)
 /------------\
```

Key characteristics:
- Framework: Jest with `ts-jest`
- Mocking: Jest built-in mocks + custom fixtures
- Structure: Tests adjacent to source or in `src/__tests__/`
- Coverage target: 70%+ for new code
- CI: All tests must pass before merge

## Consequences

### Positive

- **Fast feedback**: Jest's parallel execution and caching
- **TypeScript native**: `ts-jest` compiles on-the-fly
- **Rich ecosystem**: Extensive Jest plugins and tooling
- **Snapshot testing**: Useful for CLI output verification
- **Watch mode**: Rapid development cycle

### Negative

- **Memory usage**: Jest can be memory-hungry
- **ES modules**: Requires `--experimental-vm-modules` flag
- **Mock complexity**: Complex mocking for Supabase, crypto
- **Async testing**: Must be careful with async/await handling

### Neutral

- Some tests ignored during strict mode migration
- Coverage reports generated in CI

## Alternatives Considered

### Option 1: Mocha + Chai

- **Description**: Traditional Node.js testing stack
- **Pros**: Flexible, mature, widely used
- **Cons**: More setup needed, no built-in mocking
- **Why rejected**: Jest provides more out of the box

### Option 2: Vitest

- **Description**: Vite-native test runner
- **Pros**: Fast, modern, Jest-compatible API
- **Cons**: Newer (less stable), smaller ecosystem
- **Why rejected**: Jest more established, team familiarity

### Option 3: AVA

- **Description**: Concurrent test runner
- **Pros**: Concurrent by default, minimal API
- **Cons**: Different assertion style, smaller community
- **Why rejected**: Jest's ecosystem and features preferred

### Option 4: Node.js Built-in Test Runner

- **Description**: Native test runner (Node 18+)
- **Pros**: No dependencies, standard library
- **Cons**: Basic features, immature ecosystem
- **Why rejected**: Lacks features we need (mocking, coverage)

## Implementation Notes

### Jest Configuration

```javascript
// jest.config.js
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Map .js imports to .ts
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  testMatch: [
    '**/src/**/*.test.ts',
    '**/src/__tests__/**/*.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
```

### Test Structure

```
src/
├── lib/
│   ├── secrets-manager.ts
│   └── secrets-manager.test.ts  # Adjacent test file
├── __tests__/
│   ├── fixtures/                 # Shared test fixtures
│   │   ├── job-fixtures.ts
│   │   └── supabase-mocks.ts
│   ├── integration/             # Integration tests
│   │   └── daemon.test.ts
│   └── validation-framework.test.ts
```

### Mocking Supabase

```typescript
// src/__tests__/fixtures/supabase-mocks.ts
export function createMockSupabase(data: {
  jobs?: Partial<JobSpec>[];
  error?: Error;
}) {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: data.jobs?.[0] || null,
            error: data.error || null,
          }),
        }),
        order: jest.fn().mockResolvedValue({
          data: data.jobs || [],
          error: data.error || null,
        }),
      }),
      insert: jest.fn().mockResolvedValue({
        data: data.jobs?.[0] || null,
        error: data.error || null,
      }),
    }),
  };
}

// Usage in test
jest.mock('../../lib/supabase-client', () => ({
  getSupabaseClient: () => createMockSupabase({
    jobs: [mockJob({ name: 'test-job' })],
  }),
}));
```

### Test Fixtures

```typescript
// src/__tests__/fixtures/job-fixtures.ts
import { BaseJobSpec } from '../../lib/job-manager.js';

export function createTestJob(overrides: Partial<BaseJobSpec> = {}): BaseJobSpec {
  return {
    id: 'test-job-123',
    name: 'test-job',
    command: 'echo hello',
    type: 'shell',
    status: 'created',
    createdAt: new Date(),
    ...overrides,
  };
}

export const SAMPLE_JOBS = {
  running: createTestJob({ status: 'running', pid: 1234 }),
  completed: createTestJob({ status: 'completed', exitCode: 0 }),
  failed: createTestJob({ status: 'failed', exitCode: 1, error: 'Oops' }),
};
```

### Unit Test Example

```typescript
// src/lib/secrets-manager.test.ts
import { encryptSecret, decryptSecret } from './secrets-manager.js';
import { LSHError, ErrorCodes } from './lsh-error.js';

describe('secrets-manager', () => {
  const validKey = 'a'.repeat(64); // 32 bytes in hex

  describe('encryptSecret', () => {
    it('should encrypt and decrypt round-trip', () => {
      const plaintext = 'my-secret-value';
      const encrypted = encryptSecret(plaintext, validKey);
      const decrypted = decryptSecret(encrypted, validKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should throw on invalid key length', () => {
      expect(() => encryptSecret('test', 'short-key'))
        .toThrow(LSHError);
    });

    it('should produce different ciphertext each time', () => {
      const plaintext = 'same-value';
      const encrypted1 = encryptSecret(plaintext, validKey);
      const encrypted2 = encryptSecret(plaintext, validKey);
      expect(encrypted1).not.toBe(encrypted2);
    });
  });
});
```

### Integration Test Example

```typescript
// src/__tests__/integration/daemon.test.ts
describe('daemon integration', () => {
  let daemon: LSHJobDaemon;

  beforeAll(async () => {
    daemon = new LSHJobDaemon({ port: 0 }); // Random port
    await daemon.start();
  });

  afterAll(async () => {
    await daemon.stop();
  });

  it('should execute scheduled job', async () => {
    const job = await daemon.scheduleJob({
      name: 'test-job',
      command: 'echo hello',
      runAt: new Date(),
    });

    // Wait for execution
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = await daemon.getJob(job.id);
    expect(result.status).toBe('completed');
    expect(result.output).toContain('hello');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- secrets-manager.test.ts

# Run in watch mode
npm test -- --watch

# Run with verbose output
npm test -- --verbose
```

## CI Integration

```yaml
# .github/workflows/node.js.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.9.0'
      - run: npm ci
      - run: npm run build
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Related Decisions

- [ADR-0005](./0005-error-handling-pattern.md) - Tests verify error handling
- [ADR-0001](./0001-database-persistence-strategy.md) - Mocking strategy for Supabase

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [src/__tests__/fixtures/README.md](../../../src/__tests__/fixtures/README.md)
- [jest.config.js](../../../jest.config.js)
