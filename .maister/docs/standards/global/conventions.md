## Development Conventions

### Predictable Structure
Organize files and directories in a logical, navigable layout.

### Up-to-Date Documentation
Keep README files current with setup steps, architecture overview, and contribution guidelines.

### Clean Version Control
Write clear commit messages, use feature branches, and add meaningful descriptions to pull requests.

### Environment Variables
Store configuration in environment variables; never commit secrets or API keys.

### Minimal Dependencies
Keep dependencies lean and up-to-date; document why major ones are included.

### Consistent Reviews
Follow a defined code review process with clear expectations for reviewers and authors.

### Testing Standards
Define required test coverage (unit, integration, etc.) before merging.

### Feature Flags
Use flags for incomplete features instead of long-lived branches.

### Changelog Updates
Maintain a changelog or release notes for significant changes.

### Build What's Needed
Avoid speculative code and "just in case" additions (see minimal-implementation.md).

### Kebab-case file names
All TypeScript source files use kebab-case/lowercase basenames, even files whose primary export is a PascalCase class. The file `secrets-manager.ts` exports `SecretsManager`; `lsh-error.ts` exports `LSHError`. This holds across all 58 source files — never name a file after its class casing.

### Relative imports, no path aliases
Internal modules are imported via relative `./`/`../` paths. There are no `@/` aliases or `baseUrl`-based absolute imports. Keep imports relative to the importing file.

```typescript
import { extractErrorMessage } from './lsh-error.js';
import { SyncKeyStore } from '../lib/sync-key-store.js';
```

### Function declarations + async/await
Exported and top-level logic uses named `function` declarations rather than arrow-const assignments. Asynchronous code uses `async`/`await`, not raw `.then()` promise chains (~93% adherence, 209 vs 16).

```typescript
export function registerSyncCommands(program: Command): void {}
```

### Modern JS idioms enforced (ESLint error)
The following are ESLint errors, not style suggestions: `no-var`, `prefer-const`, `no-debugger`, `no-duplicate-imports`, `no-unused-expressions`. Use `const`/`let`, consolidate imports, and never leave `debugger` statements. Source: `eslint.config.js`.

### `interface` for shapes, PascalCase classes
Declare object/contract shapes with `interface`; reserve `type` aliases for unions and primitives (64 interfaces vs 11 aliases). All exported classes use PascalCase (23 of 23). (medium confidence)

```typescript
interface SyncRecord { cid: string; env: string; }
type DiscoveryMode = 'w3name' | 'ipns';
```
