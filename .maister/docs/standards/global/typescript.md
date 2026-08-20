## TypeScript / ESM

### `.js` extension on relative imports (ESM nodenext)
The project is pure ESM (`"type": "module"`), with `module` and `moduleResolution` both set to `nodenext`. This requires every relative import to carry a `.js` extension even in `.ts` source. Adherence is 79/79 import sites. Sources: `tsconfig.json`, code, CLAUDE.md.

```typescript
import { foo } from './bar.js';
```

### Partial strict flags + `types: ["node"]` pinned
`strict` is `false`, but individual strictness flags are turned on: `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`. The `types: ["node"]` entry is intentionally pinned — **do NOT remove it**. Without it, tsc's ambient-type auto-include is fragile and node globals (`process`, `NodeJS`, `Error.captureStackTrace`) drop out, flooding the build with TS2591 errors. Sources: `tsconfig.json`, CLAUDE.md.

### Runtime / target baseline
Compile target is ES2022. Runtime baseline is Node ≥ 20.18.0 and npm ≥ 10, pinned via `package.json` `engines` and `.nvmrc`. Do not use syntax or APIs newer than this baseline. Sources: config, docs, CI.
