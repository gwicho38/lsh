import {
  REMOVED_COMMANDS,
  removalMessage,
  REMOVED_SYNC_SUBCOMMANDS,
  syncSubcommandMessage,
} from '../lib/removed-commands.js';

const TOP_LEVEL_ACCEPTABLE =
  /^(lsh [a-z]+( --?[a-z-]+(=?<[a-z]+>)?)*|rm \.env|npm install -g lsh-framework|cat llms\.txt|nothing (—|-))/;

describe('REMOVED_COMMANDS', () => {
  it('covers every command removed in v4', () => {
    const expected = [
      'env', 'load', 'create', 'delete', 'cp',
      'key', 'init', 'doctor', 'config', 'status', 'info', 'clear',
      'sync-history', 'ipfs', 'migrate', 'self', 'context', 'completion',
    ];
    for (const name of expected) {
      expect(Object.keys(REMOVED_COMMANDS)).toContain(name);
    }
  });

  it('gives every entry a copy-pasteable replacement', () => {
    // Every value is either a real invocation, or an explicit statement that
    // nothing replaces it. Nothing else is acceptable guidance.
    for (const [, guidance] of Object.entries(REMOVED_COMMANDS)) {
      expect(guidance).toMatch(TOP_LEVEL_ACCEPTABLE);
    }
  });

  it('routes every entry to a surviving command or an explicit non-replacement', () => {
    for (const [, guidance] of Object.entries(REMOVED_COMMANDS)) {
      const routed =
        guidance.startsWith('lsh push') ||
        guidance.startsWith('lsh pull') ||
        guidance.startsWith('lsh sync') ||
        guidance.startsWith('lsh edit') ||
        guidance.startsWith('lsh get') ||
        guidance.startsWith('lsh set') ||
        guidance.startsWith('rm .env') ||
        guidance.startsWith('npm install') ||
        guidance.startsWith('cat llms.txt') ||
        guidance.startsWith('nothing');
      expect(routed).toBe(true);
    }
  });

  it('does not list any surviving command as removed', () => {
    for (const surviving of ['push', 'pull', 'sync', 'edit', 'list', 'ls', 'get', 'set']) {
      expect(Object.keys(REMOVED_COMMANDS)).not.toContain(surviving);
    }
  });
});

describe('removalMessage', () => {
  it('names the version and the replacement', () => {
    const msg = removalMessage('doctor');
    expect(msg).toContain("'lsh doctor' was removed in v4.0.0");
    expect(msg).toContain('lsh sync --doctor');
  });

  it('maps key to the sync control plane', () => {
    expect(removalMessage('key')).toContain('lsh sync --key');
  });

  it('maps load to sync --load', () => {
    expect(removalMessage('load')).toContain('lsh sync --load');
  });

  it('maps clear to sync --repair', () => {
    expect(removalMessage('clear')).toContain('lsh sync --repair');
  });

  it('maps env to the unmasked replacement, not list which masks values', () => {
    const msg = removalMessage('env');
    expect(msg).toContain('lsh get --all --format env');
  });

  it('returns null for a name that was never a command', () => {
    expect(removalMessage('flurb')).toBeNull();
  });

  it('returns null for a surviving command', () => {
    expect(removalMessage('push')).toBeNull();
    expect(removalMessage('get')).toBeNull();
    expect(removalMessage('set')).toBeNull();
  });
});

describe('REMOVED_SYNC_SUBCOMMANDS', () => {
  it('gives every entry a copy-pasteable replacement', () => {
    for (const [, guidance] of Object.entries(REMOVED_SYNC_SUBCOMMANDS)) {
      expect(guidance).toMatch(TOP_LEVEL_ACCEPTABLE);
    }
  });

  it('routes every entry to a surviving command or an explicit non-replacement', () => {
    for (const [, guidance] of Object.entries(REMOVED_SYNC_SUBCOMMANDS)) {
      const routed =
        guidance.startsWith('lsh push') ||
        guidance.startsWith('lsh pull') ||
        guidance.startsWith('lsh sync') ||
        guidance.startsWith('nothing');
      expect(routed).toBe(true);
    }
  });
});

describe('syncSubcommandMessage', () => {
  it('maps sync push to the top-level push command', () => {
    expect(syncSubcommandMessage('push')).toContain('lsh push');
  });

  it('maps sync now to bare sync', () => {
    expect(syncSubcommandMessage('now')).toContain('lsh sync');
  });

  it('says the daemon is automatic for start and stop', () => {
    expect(syncSubcommandMessage('start')).toContain('automatically');
    expect(syncSubcommandMessage('stop')).toContain('automatically');
  });

  it('names the version like the top-level message does', () => {
    expect(syncSubcommandMessage('push')).toContain("'lsh sync push' was removed in v4.0.0");
  });

  it('returns null for an unknown subcommand', () => {
    expect(syncSubcommandMessage('flurb')).toBeNull();
  });
});
