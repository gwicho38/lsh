## Coding Style

### Naming Consistency
Follow established naming patterns for variables, functions, classes, and files throughout the project.

### Automatic Formatting
Use automated tools to enforce consistent indentation, spacing, and line breaks.

### Descriptive Names
Choose names that clearly communicate intent; avoid cryptic abbreviations or single-letter identifiers outside tight loops.

### Focused Functions
Write functions that do one thing well; smaller functions are easier to read, test, and maintain.

### Uniform Indentation
Standardize on spaces or tabs and enforce with editor/linter settings.

### No Dead Code
Remove unused imports, commented-out blocks, and orphaned functions instead of leaving them behind.

### No Backward Compatibility Unless Required
Avoid extra code paths for backward compatibility unless explicitly needed.

### DRY (Don't Repeat Yourself)
Extract repeated logic into reusable functions or modules.

### No explicit `any`
`@typescript-eslint/no-explicit-any` is an ESLint error in non-test code. Use a concrete `interface` or `unknown` (then narrow) instead of `any`. Note that `noImplicitAny` is still off in `tsconfig.json`, so the lint rule is the enforcement boundary. Source: `eslint.config.js`.

### Unused vars/args `_`-prefixed
`@typescript-eslint/no-unused-vars` is an error, with `^_` ignore patterns for arguments, variables, and caught errors. Prefix anything intentionally unused with `_`.

```typescript
catch (_error) { /* intentionally ignored */ }
```

### Restrict `console`
`no-console` is `['warn', { allow: ['warn', 'error'] }]` globally. The rule is turned off for CLI surfaces that legitimately print to stdout (`src/commands`, `src/services`, `src/cli.ts`, `src/lib`) and for tests. Outside those, only `console.warn`/`console.error` are allowed. Source: `eslint.config.js`.

### JSDoc file-header block comments
Source files open with a `/** ... */` block comment describing the module's purpose (54/58 files). Lead each new module with a short header block. (medium confidence)

```typescript
/**
 * secrets-manager.ts — AES-256 encrypt/decrypt and destructive-change detection.
 */
```
