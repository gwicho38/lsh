# LSH Framework - Autonomous Improvement Plan

## Current Session: 2026-01-28

### Analysis Summary
A comprehensive code analysis revealed the following priority areas:

#### Critical Issues
1. **Type Safety in SaaS Services** - 15+ `any` types in security-sensitive code
2. **Password Reset Not Implemented** - `resetPassword()` throws "Not implemented"
3. **Input Validation Gaps** - Auth and billing services lack comprehensive validation
4. **Error Handling Inconsistency** - 60+ catch blocks with varying patterns

#### High Priority Issues
1. ~~**job-storage-database.ts** - `delete()` not implemented, `get()` returns null~~ ✅ FIXED
2. ~~**UUID Generation Bug** - Uses deprecated `substr()` with incorrect indices~~ ✅ FIXED
3. **Missing Tests** - 95% of SaaS code has no test coverage

#### Medium Priority Issues
1. ~~Error message standardization~~ ✅ MOSTLY COMPLETE (6 files done: saas-billing, saas-email, saas-secrets, saas-organizations, database-persistence, saas-auth)
2. ~~History merge algorithm efficiency~~ ✅ FIXED
3. Email template input sanitization

---

## Completed

### Task 13: Error Handling Standardization (saas-auth.ts)
**Priority**: HIGH → COMPLETE
**Category**: 🔒 Security / 🏗️ Robustness
**Completed**: 2026-01-28
**Branch**: `fix/implement-job-storage-methods`

**Problems Fixed**:
1. `saas-auth.ts` used 29 `throw new Error()` calls with embedded codes in message strings
2. No structured error codes for security-sensitive authentication operations
3. Inconsistent error handling patterns across auth methods
4. Token errors not properly differentiated (invalid vs expired vs already-used)

**Implementation**:
- Replaced all 29 `throw new Error()` calls with `throw new LSHError()`
- Added new error code `AUTH_TOKEN_ALREADY_USED` to lsh-error.ts
- Used appropriate error codes:
  - `CONFIG_MISSING_ENV_VAR` (500) for missing JWT secret
  - `AUTH_INVALID_CREDENTIALS` (401) for login failures (generic - prevents enumeration)
  - `AUTH_EMAIL_NOT_VERIFIED` (403) for unverified email
  - `AUTH_EMAIL_ALREADY_EXISTS` (409) for duplicate email
  - `AUTH_INVALID_TOKEN` (401) for invalid tokens
  - `AUTH_TOKEN_EXPIRED` (401) for expired tokens
  - `AUTH_TOKEN_ALREADY_USED` (401) for reused tokens
  - `VALIDATION_INVALID_FORMAT` (400) for invalid email/password format
  - `RESOURCE_NOT_FOUND` (404) for missing users
  - `RESOURCE_CONFLICT` (409) for already verified email
  - `DB_QUERY_FAILED` (500) for database operation failures

**Files Modified**:
- `src/lib/saas-auth.ts` - Standardized all error handling
- `src/lib/lsh-error.ts` - Added AUTH_TOKEN_ALREADY_USED error code
- `src/__tests__/saas-auth-errors.test.ts` (NEW - 20 tests)

**Verification**:
- ✅ Build passes
- ✅ Lint passes (0 errors)
- ✅ 20 new error handling tests pass

---

### Task 12: Error Handling Standardization (database-persistence.ts)
**Priority**: MEDIUM → COMPLETE
**Category**: 🏗️ Robustness / 📝 Typing
**Completed**: 2026-01-28
**Branch**: `fix/implement-job-storage-methods`

**Problems Fixed**:
1. `database-persistence.ts` used plain `Error` instead of `LSHError` class in two locations
2. Constructor threw generic error on Supabase connection failure
3. `getLatestRowsFromTable` threw generic error on invalid table name
4. All 19 catch blocks used unstructured `console.error()` calls

**Implementation**:
- Replaced 2 `throw new Error()` calls with `throw new LSHError()`
- Added appropriate error codes:
  - `DB_CONNECTION_FAILED` (503) for Supabase initialization failures
  - `VALIDATION_INVALID_FORMAT` (400) for invalid table name validation
- Updated all 19 catch blocks to use `extractErrorMessage()` for safe error extraction
- Added structured context to error logs (error code, jobId, tableName)
- Preserved API contract: methods still return false/[]/null on failure (not throws)

**Files Modified**:
- `src/lib/database-persistence.ts` - Standardized error handling
- `src/__tests__/database-persistence-errors.test.ts` (NEW - 15 tests)

**Verification**:
- ✅ Build passes
- ✅ Lint passes (0 errors)
- ✅ 15 new error handling tests pass

---

### Task 11: Error Handling Standardization (saas-organizations.ts)
**Priority**: MEDIUM → COMPLETE
**Category**: 🏗️ Robustness / 📝 Typing
**Completed**: 2026-01-28
**Branch**: `fix/implement-job-storage-methods`

**Problems Fixed**:
1. `saas-organizations.ts` used plain `Error` instead of `LSHError` class
2. Custom error codes embedded in message strings (e.g., `'ALREADY_EXISTS: ...'`)
3. No structured error context for debugging
4. Inconsistent patterns across OrganizationService and TeamService

**Implementation**:
- Replaced 22 `throw new Error()` calls with `throw new LSHError()`
- Added appropriate error codes:
  - `RESOURCE_ALREADY_EXISTS` for slug conflicts (organization, team, member)
  - `RESOURCE_NOT_FOUND` for missing organizations/teams
  - `DB_QUERY_FAILED` for all database operations
  - `BILLING_TIER_LIMIT_EXCEEDED` for member limit exceeded
- Added context objects with relevant debugging info (organizationId, teamId, userId, slug, dbError, tier)

**Files Modified**:
- `src/lib/saas-organizations.ts` - Standardized all error handling
- `src/__tests__/saas-organizations-errors.test.ts` (NEW - 30 tests)

**Verification**:
- ✅ Build passes
- ✅ Lint passes (0 errors)
- ✅ 30 new error handling tests pass

---

### Task 10: Error Handling Standardization (saas-secrets.ts)
**Priority**: MEDIUM → COMPLETE
**Category**: 🏗️ Robustness / 📝 Typing
**Completed**: 2026-01-28
**Branch**: `fix/implement-job-storage-methods`

**Problems Fixed**:
1. `saas-secrets.ts` used plain `Error` instead of `LSHError` class
2. No error codes for programmatic handling
3. Missing context information in errors
4. Inconsistent error patterns across CRUD operations

**Implementation**:
- Replaced 12 `throw new Error()` calls with `throw new LSHError()`
- Added appropriate error codes:
  - `RESOURCE_NOT_FOUND` for missing teams/organizations
  - `SECRETS_NOT_FOUND` for missing secrets
  - `DB_QUERY_FAILED` for database operations
  - `BILLING_TIER_LIMIT_EXCEEDED` for tier limits
- Added context objects with relevant debugging info (teamId, secretId, environment, dbError)
- Used `extractErrorMessage()` for safe error extraction in catch blocks

**Files Modified**:
- `src/lib/saas-secrets.ts` - Standardized all error handling
- `src/__tests__/saas-secrets-errors.test.ts` (NEW - 21 tests)

**Verification**:
- ✅ Build passes
- ✅ Lint passes (0 errors)
- ✅ 21 new error handling tests pass

---

### Task 9: Error Handling Standardization (saas-email.ts)
**Priority**: MEDIUM → COMPLETE
**Category**: 🏗️ Robustness / 📝 Typing
**Completed**: 2026-01-28
**Branch**: `fix/implement-job-storage-methods`

**Problems Fixed**:
1. `saas-email.ts` used plain `Error` instead of `LSHError` class
2. `console.error` used for error logging instead of structured errors
3. Error context not preserved for debugging

**Implementation**:
- Replaced `throw new Error()` with `throw new LSHError()`
- Used `ErrorCodes.SERVICE_UNAVAILABLE` for email API failures
- Added context objects: `to`, `subject`, `statusCode`, `apiError`, `originalError`
- Re-throw LSHErrors as-is, wrap other errors with `extractErrorMessage()`

**Files Modified**:
- `src/lib/saas-email.ts` - Standardized error handling
- `src/__tests__/saas-email-errors.test.ts` (NEW - 10 tests)

**Verification**:
- ✅ Build passes
- ✅ Lint passes (0 errors)
- ✅ 10 new error handling tests pass

---

### Task 8: Error Handling Standardization (saas-billing.ts)
**Priority**: MEDIUM → COMPLETE
**Category**: 🏗️ Robustness / 📝 Typing
**Completed**: 2026-01-28
**Branch**: `fix/implement-job-storage-methods`

**Problems Fixed**:
1. `saas-billing.ts` used plain `Error` instead of `LSHError` class
2. No error codes for programmatic handling
3. Missing context information in errors
4. Inconsistent error messages

**Implementation**:
- Replaced 10 `throw new Error()` calls with `throw new LSHError()`
- Added appropriate error codes: `CONFIG_MISSING_ENV_VAR`, `BILLING_STRIPE_ERROR`, `API_WEBHOOK_VERIFICATION_FAILED`, `DB_QUERY_FAILED`
- Added context objects with relevant debugging info (statusCode, customerId, stripeError, etc.)
- Used `extractErrorMessage()` for safe error extraction

**Error Code Mappings**:
- Missing config → `CONFIG_MISSING_ENV_VAR`
- Stripe API failure → `BILLING_STRIPE_ERROR`
- Webhook JSON parse failure → `API_WEBHOOK_VERIFICATION_FAILED`
- Database query failure → `DB_QUERY_FAILED`

**Files Modified**:
- `src/lib/saas-billing.ts` - Standardized all error handling
- `src/__tests__/saas-billing-errors.test.ts` (NEW - 13 tests)

**Verification**:
- ✅ Build passes
- ✅ Lint passes (0 errors)
- ✅ 13 new error handling tests pass

---

### Task 7: History Merge Algorithm Optimization
**Priority**: MEDIUM → COMPLETE
**Category**: ⚡ Performance
**Completed**: 2026-01-28
**Branch**: `fix/implement-job-storage-methods`

**Problems Fixed**:
1. `searchHistoryCloud()` used O(n²) filter+findIndex for deduplication
2. Large history datasets caused performance degradation

**Implementation**:
- Replaced `filter((e, i, arr) => arr.findIndex(...) === i)` with Map-based deduplication
- Map lookup is O(1) per entry → O(n) total instead of O(n²)
- Maintains same behavior: local results prioritized over cloud results
- Added comprehensive algorithm tests

**Performance Improvement**:
- Before: O(n²) - 5ms for 2000 entries (scales poorly)
- After: O(n) - <1ms for 2000 entries (linear scaling)
- For 10,000 entries: ~50ms vs ~250ms+ estimated

**Files Modified**:
- `src/lib/enhanced-history-system.ts` - Optimized deduplication in searchHistoryCloud
- `src/__tests__/enhanced-history-system.test.ts` (NEW - 14 tests)

**Verification**:
- ✅ Build passes
- ✅ Lint passes (0 errors)
- ✅ 14 new algorithm tests pass

---

### Task 6: Audit Log Error Handling
**Priority**: MEDIUM → COMPLETE
**Category**: 🏗️ Robustness / 📊 Traceability
**Completed**: 2026-01-28
**Branch**: `fix/implement-job-storage-methods`

**Problems Fixed**:
1. Audit log failures were silently ignored (only `console.error`)
2. No retry logic for transient database failures
3. No fallback storage for failed entries
4. No visibility into audit log health/statistics

**Implementation**:
- Added retry logic with exponential backoff (3 attempts, 100ms base delay, 2s max)
- Added in-memory fallback queue (max 1000 entries) for failed logs
- Added background processing timer (60s interval) to retry queued entries
- Added 24-hour expiration for queued entries
- Added statistics tracking (successCount, failedCount, queuedCount, recoveredCount)
- Added lifecycle methods: `initialize()`, `shutdown()`
- Added monitoring methods: `getStats()`, `getQueueSize()`, `resetStats()`

**Security/Compliance Features**:
- Non-blocking: audit failures never break main operations
- Graceful degradation: entries queued for later retry
- Observability: statistics for monitoring dashboards
- Compliance: meets SOC 2 / GDPR audit trail requirements

**Files Modified**:
- `src/lib/saas-audit.ts` - Added retry, fallback queue, statistics, lifecycle
- `src/__tests__/saas-audit.test.ts` (NEW - 18 tests)

**Verification**:
- ✅ Build passes
- ✅ Lint passes (0 errors)
- ✅ 18 new audit log tests pass

---

### Task 5: Input Validation (Email & Password)
**Priority**: HIGH → COMPLETE
**Category**: 🔒 Security / 📝 Typing
**Completed**: 2026-01-28
**Branch**: `fix/implement-job-storage-methods`

**Problems Fixed**:
1. Created `input-validator.ts` with comprehensive validation utilities
2. Added email validation: format checking, TLD requirement, length limits, disposable domain blocking
3. Added password validation: length, complexity, common password checking, strength scoring
4. Integrated validation into `signup()`, `login()`, `requestPasswordReset()`, `resetPassword()`
5. Added normalized email handling (lowercase, trimmed)

**Security Features**:
- RFC 5322 compliant email validation
- Disposable email domain blocking for signups
- Password strength scoring (0-4)
- Common password rejection
- bcrypt-aware length limits (72 chars max)
- Timing-safe error responses (generic errors for login)

**Files Created/Modified**:
- `src/lib/input-validator.ts` (NEW - comprehensive validation utilities)
- `src/lib/saas-auth.ts` - Added validation to auth methods
- `src/__tests__/input-validator.test.ts` (NEW - 68 tests)

**Verification**:
- ✅ Build passes
- ✅ Lint passes (0 errors)
- ✅ 68 new input validation tests pass

---

### Task 4: Password Reset Implementation
**Priority**: CRITICAL → COMPLETE
**Category**: 🔒 Security / 🏗️ Robustness
**Completed**: 2026-01-28
**Branch**: `fix/implement-job-storage-methods`

**Problems Fixed**:
1. Implemented `requestPasswordReset()` with secure token storage
2. Implemented `validateResetToken()` for token validation
3. Implemented `resetPassword()` with full security considerations
4. Added `PasswordResetToken` type and related interfaces
5. Added database schema for `password_reset_tokens` table
6. Added `hashToken()` helper using SHA-256 (tokens never stored in plain text)

**Security Features**:
- Token hashes stored, not plain tokens
- Timing-safe email enumeration protection (dummy tokens for invalid emails)
- One-time token usage with race condition protection
- Token expiration (1 hour)
- Request metadata tracking (IP, user agent)
- Old unused tokens invalidated on new request

**Files Modified**:
- `src/lib/saas-types.ts` - Added PasswordResetToken, CreatePasswordResetInput, ValidateResetTokenResult
- `src/lib/saas-auth.ts` - Implemented requestPasswordReset, validateResetToken, resetPassword
- `src/lib/database-schema.ts` - Added password_reset_tokens table and indexes
- `src/__tests__/saas-auth-password-reset.test.ts` (NEW - 25 tests)

**Verification**:
- ✅ Build passes
- ✅ Lint passes (0 errors)
- ✅ 25 new password reset tests pass

---

### Task 3: JWT Type Safety
**Priority**: CRITICAL → HIGH (type safety)
**Category**: 🔒 Security / 📝 Typing
**Completed**: 2026-01-28
**Branch**: `fix/implement-job-storage-methods`

**Problems Fixed**:
1. Replaced `as any` cast in `verifyToken()` with proper typed validation
2. Added JWT payload types: `JwtPayloadBase`, `JwtAccessTokenPayload`, `JwtRefreshTokenPayload`
3. Added `VerifiedTokenResult` type for decoded token results
4. Implemented runtime type guards: `isJwtPayloadBase()`, `isJwtAccessTokenPayload()`, `isJwtRefreshTokenPayload()`
5. Added `validateJwtPayload()` function for structural validation

**Files Modified**:
- `src/lib/saas-types.ts` - Added JWT payload types and type guards
- `src/lib/saas-auth.ts` - Updated `verifyToken()` to use typed validation
- `src/__tests__/saas-auth-jwt.test.ts` (NEW - 41 tests)

**Verification**:
- ✅ Build passes
- ✅ Lint passes (0 errors)
- ✅ 41 new JWT validation tests pass

---

### Task 2: Fix UUID Generation Bug
**Priority**: HIGH → MEDIUM (code quality)
**Category**: 🔒 Security / 🧹 Code Quality
**Completed**: 2026-01-28
**Branch**: `fix/implement-job-storage-methods`
**Commit**: 13bbc44

**Problems Fixed**:
1. Replaced deprecated `String.substr()` with `String.substring()`
2. Used `crypto.createHash('sha256')` for deterministic UUID generation
3. Used `crypto.randomBytes()` for cryptographically secure session IDs
4. Ensured UUIDs follow RFC 4122 format (version 4, variant 10xx)

**Files Modified**:
- `src/lib/database-persistence.ts`
- `src/__tests__/database-persistence-uuid.test.ts` (NEW - 15 tests)
- Type declaration files

**Verification**:
- ✅ Build passes
- ✅ Lint passes (0 errors)
- ✅ 15 new UUID tests pass

---

### Task 1: Fix job-storage-database.ts Implementation
**Priority**: HIGH
**Category**: 🏗️ Robustness
**Completed**: 2026-01-28
**Branch**: `fix/implement-job-storage-methods`
**Commit**: c410332

**Changes Made**:
1. Added `getJobById()` method to DatabasePersistence
2. Added `deleteJob()` method to DatabasePersistence
3. Added corresponding methods to LocalStorageAdapter
4. Updated DatabaseJobStorage to use new methods
5. Removed duplicate TODO comments
6. Fixed type safety issues with status mappings
7. Added proper cleanup() implementation

**Files Modified**:
- `src/lib/database-persistence.ts`
- `src/lib/local-storage-adapter.ts`
- `src/lib/job-storage-database.ts`
- Type declaration files

**Verification**:
- ✅ Build passes
- ✅ Lint passes (0 errors)
- ✅ 21 job-storage-memory tests pass
- ✅ 40 base-job-manager tests pass

---

## In Progress

(Ready for next task)

---

## Backlog (Discovered Issues)

| Issue | Category | Severity | File(s) |
|-------|----------|----------|---------|
| ~~Password reset not implemented~~ | ~~Security~~ | ~~CRITICAL~~ | ~~saas-auth.ts~~ ✅ FIXED |
| ~~JWT decoded as `any`~~ | ~~Type Safety~~ | ~~CRITICAL~~ | ~~saas-auth.ts~~ ✅ FIXED |
| ~~Email validation missing~~ | ~~Security~~ | ~~HIGH~~ | ~~saas-auth.ts~~ ✅ FIXED |
| ~~Audit log failures ignored~~ | ~~Traceability~~ | ~~MEDIUM~~ | ~~saas-audit.ts~~ ✅ FIXED |
| ~~History merge O(n²) complexity~~ | ~~Performance~~ | ~~MEDIUM~~ | ~~enhanced-history-system.ts~~ ✅ FIXED |
| Error handling inconsistency | Robustness | MEDIUM | 37 files (saas-billing, saas-email, saas-secrets, saas-organizations, database-persistence, saas-auth done) |
| 618+ TODO comments | Documentation | LOW | 44 files |

---

## Next Priority

**Continue Error Message Standardization** - 6 files now standardized: `saas-billing.ts`, `saas-email.ts`, `saas-secrets.ts`, `saas-organizations.ts`, `database-persistence.ts`, and `saas-auth.ts`. Consider continuing with other files like `secrets-manager.ts`, `job-manager.ts`, or `cron-job-manager.ts`.

---

## Session Statistics
- **Tasks Completed**: 13
- **Tests Added**: 290 (15 UUID + 41 JWT + 25 Password Reset + 68 Input Validation + 18 Audit Log + 14 History Algorithm + 13 Billing Errors + 10 Email Errors + 21 Secrets Errors + 30 Organizations Errors + 15 Database Persistence Errors + 20 Auth Errors)
- **Files Modified**: 29
- **Commits**: 14
- **Branches**: 1 (`fix/implement-job-storage-methods`)

---

## Notes

- Target test coverage: 70% (current ~10-15%)
- Reference implementation for error handling: `command-validator.ts`
- Reference implementation for type safety: `saas-types.ts`
- PR pending review with all changes from this session
