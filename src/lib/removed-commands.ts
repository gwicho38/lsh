/**
 * Commands removed in v4.0.0, mapped to their replacement invocation.
 */

export const REMOVED_COMMANDS: Record<string, string> = {
  list: 'lsh edit --list',
  ls: 'lsh edit --list',
  get: 'lsh edit --get <key>',
  set: 'lsh edit --set <key>=<value>',
  env: 'lsh edit --get --all --format env',
  load: 'lsh sync --load',
  create: 'lsh edit',
  delete: 'rm .env',
  cp: 'lsh edit --env <to> --copy-from <from>',
  key: 'lsh sync --key (import: lsh sync --key=<value>, generate: lsh sync --init)',
  init: 'lsh sync --init',
  doctor: 'lsh sync --doctor',
  config: 'lsh sync --config',
  status: 'lsh sync --status',
  info: 'lsh sync --status',
  clear: 'lsh sync --repair',
  'sync-history': 'lsh sync --history',
  ipfs: 'nothing — push, pull, and sync manage the IPFS daemon automatically',
  migrate: 'nothing — this migrated v1.x to v2.0 and is obsolete',
  self: 'npm install -g lsh-framework (version: lsh --version)',
  context: 'cat llms.txt',
  completion: 'nothing — shell completion was removed in v4.0.0',
};

export function removalMessage(name: string): string | null {
  const replacement = REMOVED_COMMANDS[name];
  if (!replacement) return null;
  return `error: 'lsh ${name}' was removed in v4.0.0\n  use: ${replacement}`;
}

export const REMOVED_SYNC_SUBCOMMANDS: Record<string, string> = {
  push: 'lsh push',
  pull: 'lsh pull',
  now: 'lsh sync',
  init: 'lsh sync --init',
  status: 'lsh sync --status',
  history: 'lsh sync --history',
  clear: 'lsh sync --repair',
  verify: 'lsh sync --verify <cid>',
  start: 'nothing - the IPFS daemon starts automatically',
  stop: 'nothing - the IPFS daemon is managed automatically',
};

export function syncSubcommandMessage(name: string): string | null {
  const replacement = REMOVED_SYNC_SUBCOMMANDS[name];
  if (!replacement) return null;
  return `error: 'lsh sync ${name}' was removed in v4.0.0\n  use: ${replacement}`;
}
