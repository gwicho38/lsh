## Constants

### No hardcoded strings — centralize in `src/constants/`
User-facing or reused string literals (longer than 3 chars) must live in `src/constants/` (`index.ts`, `paths.ts`, `config.ts`, `commands.ts`, `errors.ts`, `api.ts`, `database.ts`, `ui.ts`, `validation.ts`) and be imported, never inlined. This is enforced by the custom ESLint rule `lsh/no-hardcoded-strings` (currently `warn`, intended to graduate to `error`; turned off in tests). Allowed inline literals: HTTP methods, encodings (`utf8`/`base64`/`hex`), `'localhost'`, file extensions, and template literals. Sources: `eslint.config.js`, code, CLAUDE.md, CONSTANTS_USAGE_GUIDE.

```typescript
import { ERRORS } from '../constants/index.js';

throw new Error(ERRORS.DAEMON_ALREADY_RUNNING);
```
