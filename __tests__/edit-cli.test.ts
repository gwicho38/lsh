/**
 * Edit/Sync CLI Commands Tests
 *
 * Ports the coverage of the removed `secrets` command surface (list/key/create/get/set)
 * onto the v4 four-command surface (`edit`, `sync`). See
 * .superpowers/sdd/2026-08-28-lsh-command-consolidation/task-8b-report.md for the
 * test-by-test mapping and the tests that were dropped because v3 behavior they
 * covered has no v4 equivalent.
 *
 * `sync --init` drives an interactive wizard (inquirer prompts) and checks for a
 * live IPFS daemon. Both are mocked so the key-generation test is hermetic and
 * cannot hang or touch real infrastructure.
 */

import { describe, it, expect, jest, beforeEach, afterEach, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';
import { Command } from 'commander';
import { EDIT_MESSAGES, SYNC_MESSAGES } from '../src/constants/ui.js';

const promptMock = jest.fn();

jest.unstable_mockModule('inquirer', () => ({
  default: { prompt: promptMock },
}));

jest.unstable_mockModule('../src/lib/ipfs-sync.js', () => ({
  getIPFSSync: () => ({
    checkDaemon: async () => false,
    getLatestCid: async () => null,
    getHistory: async () => [],
    clearHistory: async () => undefined,
    verifyCid: async () => ({ available: false }),
  }),
}));

jest.unstable_mockModule('../src/lib/ipfs-client-manager.js', () => ({
  IPFSClientManager: class {
    async ensureDaemonRunning(): Promise<void> {
      return undefined;
    }
  },
}));

let registerEditCommand: typeof import('../src/commands/edit.js').registerEditCommand;
let registerSyncCommand: typeof import('../src/commands/sync.js').registerSyncCommand;
let SecretsManager: typeof import('../src/lib/secrets-manager.js').default;

// A plain (non-async) helper keeps this restore out of an async function's own code
// path, which is what require-atomic-updates actually flags a post-await write against.
function restoreHomeEnv(original: string | undefined): void {
  if (original === undefined) delete process.env.HOME;
  else process.env.HOME = original;
}

describe('Edit/Sync CLI Commands', () => {
  let testDir: string;
  let originalCwd: string;
  let originalEditor: string | undefined;
  let originalStdinIsTTY: boolean | undefined;
  let originalExitCode: number | undefined;
  let originalSecretsKey: string | undefined;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeAll(async () => {
    ({ registerEditCommand } = await import('../src/commands/edit.js'));
    ({ registerSyncCommand } = await import('../src/commands/sync.js'));
    ({ default: SecretsManager } = await import('../src/lib/secrets-manager.js'));
  });

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-edit-cli-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);

    originalEditor = process.env.EDITOR;
    process.env.EDITOR = 'true';

    originalSecretsKey = process.env.LSH_SECRETS_KEY;
    process.env.LSH_SECRETS_KEY = 'f'.repeat(64);

    originalStdinIsTTY = (process.stdin as { isTTY?: boolean }).isTTY;
    (process.stdin as { isTTY?: boolean }).isTTY = false;

    originalExitCode = process.exitCode;
    process.exitCode = undefined;

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // jest.config.js sets resetMocks:true, which wipes jest.fn() implementations before
    // each test — reinstate the answer here rather than at module scope.
    promptMock.mockResolvedValue({ keyChoice: 'generate' });
  });

  afterEach(() => {
    process.chdir(originalCwd);

    if (originalEditor === undefined) delete process.env.EDITOR;
    else process.env.EDITOR = originalEditor;

    if (originalSecretsKey === undefined) delete process.env.LSH_SECRETS_KEY;
    else process.env.LSH_SECRETS_KEY = originalSecretsKey;

    (process.stdin as { isTTY?: boolean }).isTTY = originalStdinIsTTY;
    process.exitCode = originalExitCode;

    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  function newProgram(): Command {
    const program = new Command();
    registerEditCommand(program);
    registerSyncCommand(program);
    return program;
  }

  function logOutput(): string {
    return consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
  }

  describe('edit --list', () => {
    it('lists secrets from .env, masked', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'KEY1=value1\nKEY2=value2\n');

      await newProgram().parseAsync(['node', 'test', 'edit', '--list']);

      const output = logOutput();
      expect(output).toContain('KEY1');
      expect(output).toContain('KEY2');
      expect(output).not.toContain('value1');
      expect(output).not.toContain('value2');
    });

    it('errors when the .env file itself is missing, rather than printing an empty table', async () => {
      await newProgram().parseAsync(['node', 'test', 'edit', '--list']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(`${EDIT_MESSAGES.NO_ENV_FILE_PREFIX}.env`);
      expect(process.exitCode).toBe(1);
      expect(logOutput()).toBe('');
    });

    it('skips comments and empty lines', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), '# Comment\n\nKEY=value\n# Another comment\n');

      await newProgram().parseAsync(['node', 'test', 'edit', '--list']);

      expect(logOutput()).toBe('KEY=***');
    });

    it('handles quoted values (masked in --list, raw in --get)', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'KEY1="value with spaces"\nKEY2=\'single quoted\'\n');

      await newProgram().parseAsync(['node', 'test', 'edit', '--list']);
      const listOutput = logOutput();
      expect(listOutput).toContain('KEY1');
      expect(listOutput).toContain('KEY2');
      expect(listOutput).not.toContain('value with spaces');

      consoleLogSpy.mockClear();
      await newProgram().parseAsync(['node', 'test', 'edit', '--get', 'KEY1']);
      expect(consoleLogSpy).toHaveBeenCalledWith('value with spaces');

      consoleLogSpy.mockClear();
      await newProgram().parseAsync(['node', 'test', 'edit', '--get', 'KEY2']);
      expect(consoleLogSpy).toHaveBeenCalledWith('single quoted');
    });
  });

  describe('sync --key', () => {
    it('shows the key when set via LSH_SECRETS_KEY', async () => {
      const testKey = 'a'.repeat(64);
      process.env.LSH_SECRETS_KEY = testKey;

      await newProgram().parseAsync(['node', 'test', 'sync', '--key']);

      expect(consoleLogSpy).toHaveBeenCalledWith(testKey);
      expect(process.exitCode).toBeUndefined();
    });

    it('falls back to the key in the local .env file when no env var is set', async () => {
      const fileKey = 'b'.repeat(64);
      delete process.env.LSH_SECRETS_KEY;
      fs.writeFileSync(path.join(testDir, '.env'), `LSH_SECRETS_KEY=${fileKey}\nOTHER=1\n`);

      await newProgram().parseAsync(['node', 'test', 'sync', '--key']);

      expect(consoleLogSpy).toHaveBeenCalledWith(fileKey);
    });

    it('errors when no key is configured anywhere reachable', async () => {
      delete process.env.LSH_SECRETS_KEY;
      // No local .env, and HOME is unset so the global ~/.env fallback can't resolve either.
      const originalHome = process.env.HOME;
      delete process.env.HOME;

      try {
        await newProgram().parseAsync(['node', 'test', 'sync', '--key']);
        expect(consoleErrorSpy).toHaveBeenCalledWith(SYNC_MESSAGES.KEY_NOT_FOUND);
        expect(process.exitCode).toBe(1);
      } finally {
        if (originalHome === undefined) delete process.env.HOME;
        else process.env.HOME = originalHome;
      }
    });
  });

  describe('sync --init', () => {
    it('generates a 64-character hex key and saves it to .env', async () => {
      await newProgram().parseAsync(['node', 'test', 'sync', '--init']);

      expect(promptMock).toHaveBeenCalled();
      const envContent = fs.readFileSync(path.join(testDir, '.env'), 'utf8');
      const match = envContent.match(/^LSH_SECRETS_KEY=([a-f0-9]+)$/m);
      expect(match).not.toBeNull();
      expect(match![1]).toHaveLength(64);
    });
  });

  describe('bare edit (create/open)', () => {
    it('creates a new .env file when none exists', async () => {
      await newProgram().parseAsync(['node', 'test', 'edit']);

      expect(fs.existsSync(path.join(testDir, '.env'))).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`${EDIT_MESSAGES.CREATED_FILE_PREFIX}.env`));
    });

    it('creates an empty file when none exists', async () => {
      await newProgram().parseAsync(['node', 'test', 'edit']);

      expect(fs.readFileSync(path.join(testDir, '.env'), 'utf8')).toBe('');
    });

    it('creates the file at a custom path via --file', async () => {
      await newProgram().parseAsync(['node', 'test', 'edit', '--file', '.env.custom']);

      expect(fs.existsSync(path.join(testDir, '.env.custom'))).toBe(true);
    });
  });

  describe('edit --get', () => {
    it('gets a specific secret value', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'API_KEY=secret123\nDB_URL=postgres://localhost\n');

      await newProgram().parseAsync(['node', 'test', 'edit', '--get', 'API_KEY']);

      expect(consoleLogSpy).toHaveBeenCalledWith('secret123');
    });

    it('errors when the key is not found (file exists, key does not)', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'API_KEY=secret123\n');

      await newProgram().parseAsync(['node', 'test', 'edit', '--get', 'NONEXISTENT']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(`${EDIT_MESSAGES.KEY_NOT_FOUND_PREFIX}NONEXISTENT`);
      expect(process.exitCode).toBe(1);
    });

    it('errors when the .env file itself is missing, distinguishing it from a missing key', async () => {
      await newProgram().parseAsync(['node', 'test', 'edit', '--get', 'SOMEKEY']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(`${EDIT_MESSAGES.NO_ENV_FILE_PREFIX}.env`);
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('Key not found'));
      expect(process.exitCode).toBe(1);
    });

    it('gets all secrets with --all', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'KEY1=value1\nKEY2=value2\n');

      await newProgram().parseAsync(['node', 'test', 'edit', '--get', '--all']);

      const output = logOutput();
      expect(output).toContain('KEY1=value1');
      expect(output).toContain('KEY2=value2');
    });

    it('errors with --get --all when the .env file itself is missing', async () => {
      await newProgram().parseAsync(['node', 'test', 'edit', '--get', '--all']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(`${EDIT_MESSAGES.NO_ENV_FILE_PREFIX}.env`);
      expect(process.exitCode).toBe(1);
    });
  });

  describe('edit --set', () => {
    it('sets a new secret value', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), '');

      await newProgram().parseAsync(['node', 'test', 'edit', '--set', 'NEW_KEY=new_value']);

      expect(fs.readFileSync(path.join(testDir, '.env'), 'utf8')).toContain('NEW_KEY=new_value');
    });

    it('updates an existing secret value', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'EXISTING_KEY=old_value\n');

      await newProgram().parseAsync(['node', 'test', 'edit', '--set', 'EXISTING_KEY=new_value']);

      const content = fs.readFileSync(path.join(testDir, '.env'), 'utf8');
      expect(content).toContain('EXISTING_KEY=new_value');
      expect(content).not.toContain('old_value');
    });

    it('creates .env if it does not exist', async () => {
      await newProgram().parseAsync(['node', 'test', 'edit', '--set', 'NEW_KEY=value']);

      expect(fs.existsSync(path.join(testDir, '.env'))).toBe(true);
      expect(fs.readFileSync(path.join(testDir, '.env'), 'utf8')).toContain('NEW_KEY=value');
    });

    it('quotes values with spaces, and reads them back correctly with --get', async () => {
      await newProgram().parseAsync(['node', 'test', 'edit', '--set', 'MESSAGE=hello world']);

      expect(fs.readFileSync(path.join(testDir, '.env'), 'utf8')).toContain('MESSAGE="hello world"');

      consoleLogSpy.mockClear();
      await newProgram().parseAsync(['node', 'test', 'edit', '--get', 'MESSAGE']);
      expect(consoleLogSpy).toHaveBeenCalledWith('hello world');
    });

    it('errors instead of writing when the target directory does not exist', async () => {
      const missingPath = path.join(testDir, 'no-such-subdir', '.env');

      await newProgram().parseAsync(['node', 'test', 'edit', '--set', 'KEY=value', '--file', missingPath]);

      expect(fs.existsSync(missingPath)).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(EDIT_MESSAGES.FAILED_TO_EDIT, expect.any(String));
      expect(process.exitCode).toBe(1);
    });

    it('preserves comments, blank lines, and an untouched inline-# value, and backs up the original', async () => {
      const envPath = path.join(testDir, '.env');
      const before = [
        '# Production database credentials',
        '# Owner: platform-team',
        '',
        'DB_HOST=db.internal',
        'DB_PASS=p@ss # rotated 2026-01-04',
        '# TODO: move STRIPE_KEY to prod vault',
        'STRIPE_KEY=fixture-stripe-key',
        '',
      ].join('\n');
      fs.writeFileSync(envPath, before);

      await newProgram().parseAsync(['node', 'test', 'edit', '--set', 'NEW_KEY=1', '--no-push']);

      const after = fs.readFileSync(envPath, 'utf8');
      expect(after).toBe(`${before.replace(/\n$/, '')}\nNEW_KEY=1\n`);
      expect(after).toContain('# Production database credentials');
      expect(after).toContain('# Owner: platform-team');
      expect(after).toContain('DB_PASS=p@ss # rotated 2026-01-04');
      expect(after).toContain('# TODO: move STRIPE_KEY to prod vault');

      const backups = fs.readdirSync(testDir).filter((name) => name.startsWith('.env.backup.'));
      expect(backups).toHaveLength(1);
      expect(fs.readFileSync(path.join(testDir, backups[0]), 'utf8')).toBe(before);
    });

    it('git-ignores the backup it writes, in a fresh repo with no prior .gitignore', async () => {
      execFileSync('git', ['init', '-q'], { cwd: testDir });
      fs.writeFileSync(path.join(testDir, '.env'), 'A=1\n');

      await newProgram().parseAsync(['node', 'test', 'edit', '--set', 'B=2', '--no-push']);

      const gitignorePath = path.join(testDir, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      expect(gitignoreContent).toContain('.env.backup.*');
      expect(gitignoreContent).toContain('.env.copyfrom.*');

      const backups = fs.readdirSync(testDir).filter((name) => name.startsWith('.env.backup.'));
      expect(backups).toHaveLength(1);

      const dryRun = execFileSync('git', ['add', '-A', '--dry-run'], { cwd: testDir }).toString();
      expect(dryRun).not.toContain('.env.backup.');
      expect(dryRun).not.toContain("add '.env'");

      const ignoreCheck = execFileSync('git', ['check-ignore', backups[0]], { cwd: testDir }).toString().trim();
      expect(ignoreCheck).toBe(backups[0]);
    });

    it('updates the value at a duplicated key so --get returns what --set just wrote', async () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'API_KEY=old1\nOTHER=x\nAPI_KEY=old2\n');

      await newProgram().parseAsync(['node', 'test', 'edit', '--set', 'API_KEY=NEWVAL', '--no-push']);

      consoleLogSpy.mockClear();
      await newProgram().parseAsync(['node', 'test', 'edit', '--get', 'API_KEY']);
      expect(consoleLogSpy).toHaveBeenCalledWith('NEWVAL');

      const content = fs.readFileSync(path.join(testDir, '.env'), 'utf8');
      const keyLines = content.split('\n').filter((line) => line.startsWith('API_KEY='));
      expect(keyLines).toEqual(['API_KEY=NEWVAL']);
      expect(content).toContain('OTHER=x');
    });

    it('git-ignores the backup and the target itself when --file names a custom file', async () => {
      execFileSync('git', ['init', '-q'], { cwd: testDir });
      fs.writeFileSync(path.join(testDir, 'app.env'), 'A=1\n');

      await newProgram().parseAsync(['node', 'test', 'edit', '--set', 'B=2', '--file', 'app.env', '--no-push']);

      const gitignoreContent = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf8');
      expect(gitignoreContent).toContain('app.env.backup.*');
      expect(gitignoreContent).toContain('app.env');

      const dryRun = execFileSync('git', ['add', '-A', '--dry-run'], { cwd: testDir }).toString();
      expect(dryRun).not.toMatch(/\.env|backup|copyfrom/);
    });

    it('git-ignores a custom --file target created fresh, with no prior file to back up', async () => {
      execFileSync('git', ['init', '-q'], { cwd: testDir });

      await newProgram().parseAsync(['node', 'test', 'edit', '--set', 'B=2', '--file', 'app.env', '--no-push']);

      const gitignoreContent = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf8');
      expect(gitignoreContent).toContain('app.env');

      const dryRun = execFileSync('git', ['add', '-A', '--dry-run'], { cwd: testDir }).toString();
      expect(dryRun).not.toMatch(/\.env|backup|copyfrom/);
    });

    it('still git-ignores the backup when .gitignore already has a bare .env line', async () => {
      execFileSync('git', ['init', '-q'], { cwd: testDir });
      fs.writeFileSync(path.join(testDir, '.gitignore'), '.env\n');
      fs.writeFileSync(path.join(testDir, '.env'), 'A=1\n');

      await newProgram().parseAsync(['node', 'test', 'edit', '--set', 'B=2', '--no-push']);

      const gitignoreContent = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf8');
      const envLines = gitignoreContent.split('\n').filter((line) => line.trim() === '.env');
      expect(envLines).toHaveLength(1);
      expect(gitignoreContent).toContain('.env.backup.*');

      const backups = fs.readdirSync(testDir).filter((name) => name.startsWith('.env.backup.'));
      expect(backups).toHaveLength(1);

      const ignoreCheck = execFileSync('git', ['check-ignore', backups[0]], { cwd: testDir }).toString().trim();
      expect(ignoreCheck).toBe(backups[0]);
    });
  });

  describe('edit --copy-from', () => {
    it('merges incoming keys into the existing .env without disturbing its comments', async () => {
      const envPath = path.join(testDir, '.env');
      fs.writeFileSync(envPath, '# local overrides\nLOCAL_ONLY=keep-me\nAPI_KEY=old\n');

      const pullSpy = jest
        .spyOn(SecretsManager.prototype, 'pull')
        .mockImplementation(async (tmpPath?: string) => {
          fs.writeFileSync(tmpPath as string, 'API_KEY=new\nEXTRA=1\n');
        });

      try {
        await newProgram().parseAsync(['node', 'test', 'edit', '--copy-from', 'staging', '--no-push']);

        const content = fs.readFileSync(envPath, 'utf8');
        expect(content).toContain('# local overrides');
        expect(content).toContain('LOCAL_ONLY=keep-me');
        expect(content).toContain('API_KEY=new');
        expect(content).toContain('EXTRA=1');
        expect(content).not.toContain('API_KEY=old');

        const backups = fs.readdirSync(testDir).filter((name) => name.startsWith('.env.backup.'));
        expect(backups).toHaveLength(1);
      } finally {
        pullSpy.mockRestore();
      }
    });
  });

  describe('edit --set --global', () => {
    it('does not touch a dotfiles-style ~/.gitignore when $HOME is itself a git repo', async () => {
      const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-global-home-'));
      execFileSync('git', ['init', '-q'], { cwd: fakeHome });
      const originalHome = process.env.HOME;
      process.env.HOME = fakeHome;

      try {
        await newProgram().parseAsync(['node', 'test', 'edit', '--set', 'A=1', '--global', '--no-push']);

        expect(fs.readFileSync(path.join(fakeHome, '.env'), 'utf8')).toContain('A=1');
        expect(fs.existsSync(path.join(fakeHome, '.gitignore'))).toBe(false);
      } finally {
        restoreHomeEnv(originalHome);
        fs.rmSync(fakeHome, { recursive: true, force: true });
      }
    });
  });

  describe('sync --repair', () => {
    it('clears local secrets metadata under HOME in addition to sync history', async () => {
      const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-repair-home-'));
      const originalHome = process.env.HOME;
      process.env.HOME = fakeHome;

      try {
        const lshDir = path.join(fakeHome, '.lsh');
        fs.mkdirSync(lshDir, { recursive: true });
        const metadataPath = path.join(lshDir, 'secrets-metadata.json');
        fs.writeFileSync(metadataPath, '{"dev":{"cid":"abc"}}');

        await newProgram().parseAsync(['node', 'test', 'sync', '--repair']);

        expect(fs.existsSync(metadataPath)).toBe(false);
      } finally {
        fs.rmSync(fakeHome, { recursive: true, force: true });
        restoreHomeEnv(originalHome);
      }
    });
  });
});
