# ADR-0001: Database Persistence Strategy

## Status

Accepted

## Date

2026-01-27

## Context

LSH requires persistent storage for:
- Job specifications and execution history
- User shell sessions and configuration
- Secrets metadata (encrypted secrets storage)
- Audit logs and analytics

We needed to choose between several database approaches:
1. Raw SQL queries
2. Query builders (Knex.js)
3. Full ORMs (Prisma, TypeORM, Sequelize)
4. Database-as-a-service with client SDK (Supabase)

Considerations:
- Development speed and simplicity
- Type safety in TypeScript
- Production-ready features (auth, real-time, storage)
- Team familiarity with tooling
- Hosting and operational complexity

## Decision

We chose **Supabase** as our database platform with direct queries using the Supabase JavaScript client.

Key characteristics:
- PostgreSQL database hosted by Supabase
- Direct SQL-style queries via `@supabase/supabase-js`
- Type generation for database schema
- Built-in authentication (unused currently, reserved for future SaaS features)
- Row-level security policies for multi-tenant scenarios

## Consequences

### Positive

- **Fast development**: No schema migration tooling needed, database manages itself
- **Type safety**: Supabase generates TypeScript types from database schema
- **Production-ready**: Built-in connection pooling, backups, monitoring
- **Future flexibility**: Auth and real-time features available when needed
- **SQL familiarity**: Direct queries, no ORM abstraction to learn

### Negative

- **Vendor lock-in**: Tied to Supabase platform (can self-host if needed)
- **No migration management**: Schema changes require manual SQL or dashboard
- **Query building**: Manual string construction for complex queries
- **Limited abstraction**: Business logic mixed with data access patterns

### Neutral

- Testing requires mocking Supabase client
- Local development uses remote database (no local setup)

## Alternatives Considered

### Option 1: Prisma ORM

- **Description**: Full-featured ORM with schema-first design
- **Pros**: Excellent TypeScript integration, migrations, powerful query API
- **Cons**: Additional build step, learning curve, overhead for simple queries
- **Why rejected**: Too heavyweight for current needs, simpler approach sufficient

### Option 2: Knex.js Query Builder

- **Description**: Lightweight SQL query builder
- **Pros**: Flexible, database-agnostic, small footprint
- **Cons**: Less type safety, manual schema management, no ORM features
- **Why rejected**: Would need to add connection management, Supabase provides more

### Option 3: TypeORM

- **Description**: Decorator-based ORM similar to Java Hibernate
- **Pros**: Feature-rich, familiar to backend developers
- **Cons**: Decorators complicate TypeScript, performance overhead
- **Why rejected**: Too heavy, decorator patterns don't fit project style

### Option 4: Raw pg Client

- **Description**: Direct PostgreSQL driver
- **Pros**: Maximum flexibility, no abstraction overhead
- **Cons**: Manual connection management, security concerns, more code
- **Why rejected**: Too low-level, would need to build what Supabase provides

## Implementation Notes

### Client Setup

```typescript
// src/lib/supabase-client.ts
import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new LSHError(ErrorCodes.CONFIG_MISSING, 'Supabase credentials required');
  }

  return createClient(url, key);
}
```

### Query Pattern

```typescript
// Standard query pattern
const { data, error } = await supabase
  .from('shell_jobs')
  .select('*')
  .eq('status', 'running')
  .order('created_at', { ascending: false });

if (error) {
  throw new LSHError(ErrorCodes.DB_QUERY_FAILED, error.message);
}

return data;
```

### Type Generation

Types are generated from the database schema and stored in `types/` directory:

```bash
# Generate types (run after schema changes)
npx supabase gen types typescript --project-id $PROJECT_ID > types/supabase.ts
```

## Related Decisions

- [ADR-0005](./0005-error-handling-pattern.md) - Error handling for database operations

## References

- [Supabase Documentation](https://supabase.com/docs)
- [src/lib/supabase-client.ts](../../../src/lib/supabase-client.ts)
- [src/lib/database-persistence.ts](../../../src/lib/database-persistence.ts)
