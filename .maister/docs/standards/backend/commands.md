## Commands

Conventions for the LSH command surface. LSH is built on Commander and exposes its
functionality exclusively through the `lsh` CLI.

### CLI-only surface; no library entry point

LSH is CLI-only. The `lsh` bin is the only supported surface — `package.json` `main` points
at `dist/cli.js`, and there is no library export. Do not add a public library API; new
functionality is exposed through CLI commands, not importable modules.

Source: CLAUDE.md.

### Commander `register*Commands(program)` pattern

Each module in `src/commands/` exports a single `register<Feature>Command(s)(program: Command)`
function that wires verbs onto the passed Commander command; `cli.ts` imports and calls each
one (9 modules: `registerSyncCommands`, `registerDoctorCommands`, `registerIPFSCommands`,
`registerInitCommands`, ...).

```typescript
export function registerDoctorCommands(program: Command): void {
  // wire verbs onto `program`
}
```

Source: code.

### Procedure for adding a CLI command

1. Create a module in `src/commands/` (or add a verb in `src/services/secrets/secrets.ts`).
2. Export an init function that registers with `commander.Command`.
3. Import and call it in `src/cli.ts`.
4. Put all user-facing strings in `src/constants/`.

Source: CLAUDE.md.
