## Error Handling

### Error handling via `lsh-error.ts`, never `(error as Error).message`
All error handling goes through `src/lib/lsh-error.ts`. Use `extractErrorMessage`, `extractErrorDetails`, `wrapAsLSHError`, `LSHError`, and `ErrorCodes` from `./lsh-error.js` — never reach for `(error as Error).message`. Caught errors are wrapped as an `LSHError` carrying an `ErrorCode` and a context object. This is mandatory per CLAUDE.md and ADR-0005, with ~93% adherence across usage sites.

```typescript
import { extractErrorMessage, wrapAsLSHError, ErrorCodes } from './lsh-error.js';

try {
  await risky();
} catch (error) {
  console.error('Failed:', extractErrorMessage(error));
  throw wrapAsLSHError(error, ErrorCodes.INTERNAL_ERROR, { op: 'risky' });
}
```
