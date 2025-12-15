# TypeScript Type Safety TODO

This document tracks progress on TypeScript strict mode migration and identifies files that need type safety improvements.

## Strict Mode Progress (Issue #69)

| Phase | Flag | Status | Errors Fixed |
|-------|------|--------|--------------|
| Phase 1 | `strictNullChecks` | ✅ Complete | 51 → 0 |
| Phase 2 | `strictFunctionTypes` | ✅ Complete | 5 → 0 |
| Phase 3 | `strictBindCallApply` | ✅ Complete | 0 |
| Phase 3 | `strictPropertyInitialization` | ✅ Complete | 0 |
| Phase 3 | `noImplicitThis` | ✅ Complete | 0 |
| Phase 3 | `alwaysStrict` | ✅ Complete | 0 |
| Phase 4 | `noImplicitAny` | ⏳ Pending | ~150+ errors |

## Phase 4: noImplicitAny Remediation

### Priority 1: Database Mappers (High Impact)

These functions use `any` for Supabase responses. After creating `database-types.ts`, update these:

| File | Function | Line | Fix |
|------|----------|------|-----|
| `src/lib/saas-organizations.ts` | `mapDbOrgToOrg` | 436 | Use `DbOrganizationRecord` |
| `src/lib/saas-organizations.ts` | `mapDbMemberToMember` | 458 | Use `DbOrganizationMemberRecord` |
| `src/lib/saas-organizations.ts` | `mapDbMemberDetailedToMemberDetailed` | 476 | Use `DbOrganizationMemberDetailedRecord` |
| `src/lib/saas-organizations.ts` | `mapDbTeamToTeam` | 706 | Use `DbTeamRecord` |
| `src/lib/saas-organizations.ts` | `mapDbTeamMemberToTeamMember` | 724 | Use `DbTeamMemberRecord` |
| `src/lib/saas-secrets.ts` | `mapDbSecretToSecret` | 451 | Use `DbSecretRecord` |
| `src/lib/saas-secrets.ts` | `getTeamById` | 438 | Use `DbTeamRecord` |
| `src/lib/saas-billing.ts` | `mapDbSubscriptionToSubscription` | 447 | Use `DbSubscriptionRecord` |
| `src/lib/saas-billing.ts` | `mapDbInvoiceToInvoice` | 473 | Use `DbInvoiceRecord` |
| `src/lib/saas-auth.ts` | `mapDbUserToUser` | 468 | Use `DbUserRecord` |
| `src/lib/saas-auth.ts` | `mapDbOrgToOrg` | 495 | Use `DbOrganizationRecord` |

### Priority 2: Stripe Webhook Handlers (Medium Impact)

Stripe webhook payloads need typing:

| File | Function | Line | Fix |
|------|----------|------|-----|
| `src/lib/saas-billing.ts` | `verifyWebhookSignature` | 209 | Return `StripeWebhookEvent` |
| `src/lib/saas-billing.ts` | `handleCheckoutCompleted` | 223 | Use `StripeCheckoutSession` |
| `src/lib/saas-billing.ts` | `handleSubscriptionUpdated` | 238 | Use `StripeSubscriptionEvent` |
| `src/lib/saas-billing.ts` | `handleSubscriptionDeleted` | 301 | Use `StripeSubscriptionEvent` |
| `src/lib/saas-billing.ts` | `handleInvoicePaid` | 338 | Use `StripeInvoiceEvent` |
| `src/lib/saas-billing.ts` | `handleInvoicePaymentFailed` | 366 | Use `StripeInvoiceEvent` |

### Priority 3: JWT Verification (Medium Impact)

| File | Function | Line | Fix |
|------|----------|------|-----|
| `src/lib/saas-auth.ts` | `verifyToken` | 106 | Define `JWTPayload` interface |

### Priority 4: Daemon & Job Management (Lower Impact)

| File | Issue | Line | Fix |
|------|-------|------|-----|
| `src/daemon/job-registry.ts` | Job casting | 151, 154 | Use `JobExecutionRecord` type |
| `src/daemon/lshd.ts` | Job error extraction | 340-347 | Use `BaseJobSpec` with error field |
| `src/lib/local-storage-adapter.ts` | Storage read | 536-578 | Define storage response type |

### Priority 5: Event Handlers (Lower Impact)

| File | Issue | Line | Fix |
|------|-------|------|-----|
| `src/lib/daemon-client.ts` | Connection error | 232 | Use `extractErrorMessage()` |
| `src/lib/database-persistence.ts` | Init error | 85 | Use `extractErrorMessage()` |

## How to Fix

### For Database Mappers

1. Import the database type:
```typescript
import type { DbOrganizationRecord } from './database-types.js';
```

2. Update the mapper function signature:
```typescript
// Before
private mapDbOrgToOrg(dbOrg: any): Organization {

// After
private mapDbOrgToOrg(dbOrg: DbOrganizationRecord): Organization {
```

### For Error Handling

1. Import error utilities:
```typescript
import { extractErrorMessage, extractErrorDetails } from './lsh-error.js';
```

2. Use in catch blocks:
```typescript
// Before
} catch (error) {
  console.error('Failed:', (error as Error).message);
}

// After
} catch (error) {
  console.error('Failed:', extractErrorMessage(error));
}
```

## Tracking

Update this document as you fix issues:

- [ ] `saas-organizations.ts` - 5 mapper functions
- [ ] `saas-secrets.ts` - 2 functions
- [ ] `saas-billing.ts` - 8 functions
- [ ] `saas-auth.ts` - 3 functions
- [ ] `daemon/job-registry.ts` - 2 casts
- [ ] `daemon/lshd.ts` - 1 cast
- [ ] `local-storage-adapter.ts` - 1 cast

## Testing the Fix

After updating types, run:

```bash
# Check for type errors
npm run typecheck

# Ensure tests pass
npm test

# Lint check
npm run lint
```

## Long-term Goal

Once all Priority 1-3 items are fixed:

1. Enable `noImplicitAny` in `tsconfig.json`
2. Fix any remaining errors
3. Update this document to mark Phase 4 complete
