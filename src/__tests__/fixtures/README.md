# Test Fixtures

This directory contains shared test fixtures and mock data for LSH tests.

## Directory Structure

```
fixtures/
├── README.md              # This file
├── supabase-mocks.ts      # Mock Supabase client and responses
├── job-fixtures.ts        # Sample JobSpec objects for testing
├── saas-fixtures.ts       # Sample users, orgs, teams, secrets
└── env-fixtures.ts        # Sample .env file contents
```

## Usage

```typescript
import { mockSupabaseClient, mockOrganization } from '../fixtures/supabase-mocks';
import { createTestJob, SAMPLE_JOBS } from '../fixtures/job-fixtures';

describe('MyService', () => {
  beforeEach(() => {
    jest.mock('@supabase/supabase-js', () => mockSupabaseClient);
  });

  it('should handle organization', () => {
    const org = mockOrganization({ name: 'Test Org' });
    // ...
  });
});
```

## Fixture Guidelines

1. **Keep fixtures minimal** - Only include fields needed for tests
2. **Use factory functions** - Allow overriding specific fields
3. **Match production shapes** - Use types from `database-types.ts`
4. **Document edge cases** - Add comments for unusual test data
