import { jest } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isExportLine, printStatus, importKey, readKeyFrom, type SyncStatus } from '../commands/sync.js';
import { SYNC_MESSAGES } from '../constants/ui.js';

describe('isExportLine', () => {
  it('accepts a well-formed export line', () => {
    expect(isExportLine('export FOO="bar"')).toBe(true);
  });

  it('rejects a logger line', () => {
    expect(
      isExportLine('2026-08-28T14:17:48.126Z INFO  [IPFSClientManager] 🚀 Starting IPFS daemon...'),
    ).toBe(false);
  });

  it('rejects an empty line and arbitrary prose', () => {
    expect(isExportLine('')).toBe(false);
    expect(isExportLine('Downloaded and decrypted: /path/.env')).toBe(false);
  });
});

describe('printStatus', () => {
  const baseStatus: SyncStatus = {
    localExists: true,
    localKeys: 3,
    cloudExists: true,
    cloudKeys: 5,
    keySet: true,
    suggestions: [],
  };

  let logSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  function output(): string {
    return logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
  }

  it('prints the real remote key count when the daemon is reachable', () => {
    printStatus(baseStatus, 'dev', true);
    expect(output()).toContain('(5 keys)');
    expect(output()).not.toContain('unknown');
  });

  it('reports unknown and omits the cloud key count when the daemon is unreachable', () => {
    printStatus(baseStatus, 'dev', false);
    const text = output();
    expect(text).toContain('unknown');
    expect(text).not.toContain('(5 keys)');
  });
});

describe('readKeyFrom', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-readkey-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('returns the key from a quoted value', () => {
    const file = path.join(dir, '.env');
    fs.writeFileSync(file, 'LSH_SECRETS_KEY="abc123"\nOTHER=1\n');
    expect(readKeyFrom(file)).toBe('abc123');
  });

  it('returns null for a file with no key line', () => {
    const file = path.join(dir, '.env');
    fs.writeFileSync(file, 'OTHER=1\n');
    expect(readKeyFrom(file)).toBeNull();
  });

  it('returns null for a missing file', () => {
    expect(readKeyFrom(path.join(dir, 'missing.env'))).toBeNull();
  });
});

describe('importKey', () => {
  const KEY_A = 'a'.repeat(64);
  const KEY_B = 'b'.repeat(64);

  let dir: string;
  let file: string;
  let homeDir: string;
  let originalHome: string | undefined;
  let originalSecretsKey: string | undefined;
  let originalExitCode: number | undefined;
  let errorSpy: ReturnType<typeof jest.spyOn>;
  let logSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-importkey-'));
    file = path.join(dir, '.env');
    // findEncryptionKeyWithSource() falls back to ~/.env; isolate it so these tests can't
    // see (or be gated by) whatever real key is configured on the machine running them.
    homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-importkey-home-'));
    originalHome = process.env.HOME;
    process.env.HOME = homeDir;
    originalSecretsKey = process.env.LSH_SECRETS_KEY;
    delete process.env.LSH_SECRETS_KEY;
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    if (originalSecretsKey === undefined) delete process.env.LSH_SECRETS_KEY;
    else process.env.LSH_SECRETS_KEY = originalSecretsKey;
    process.exitCode = originalExitCode;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(homeDir, { recursive: true, force: true });
  });

  it('refuses to replace a different key without --force, leaving the file untouched', () => {
    fs.writeFileSync(file, `LSH_SECRETS_KEY=${KEY_A}\nALPHA=one\n`);
    const before = fs.readFileSync(file, 'utf-8');

    importKey(KEY_B, false, false, file);

    expect(process.exitCode).toBe(1);
    expect(fs.readFileSync(file, 'utf-8')).toBe(before);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(file));
  });

  it('treats importing the same key as an idempotent no-op', () => {
    fs.writeFileSync(file, `LSH_SECRETS_KEY=${KEY_A}\nALPHA=one\n`);
    const before = fs.readFileSync(file, 'utf-8');

    importKey(KEY_A, false, false, file);

    expect(process.exitCode).toBeUndefined();
    expect(fs.readFileSync(file, 'utf-8')).toBe(before);
  });

  it('rejects a malformed key before touching the file', () => {
    fs.writeFileSync(file, `LSH_SECRETS_KEY=${KEY_A}\nALPHA=one\n`);
    const before = fs.readFileSync(file, 'utf-8');

    importKey('not-a-valid-key', false, false, file);

    expect(process.exitCode).toBe(1);
    expect(fs.readFileSync(file, 'utf-8')).toBe(before);
  });

  it('replaces an existing key in place when --force is set, preserving other content', () => {
    fs.writeFileSync(file, `LSH_SECRETS_KEY=${KEY_A}\nALPHA=one\n`);

    importKey(KEY_B, true, false, file);

    const after = fs.readFileSync(file, 'utf-8');
    const keyLines = after.split('\n').filter((line) => line.startsWith('LSH_SECRETS_KEY='));
    expect(keyLines).toEqual([`LSH_SECRETS_KEY=${KEY_B}`]);
    expect(after).toContain('ALPHA=one');
  });

  it('appends the key when the file has no existing key line, preserving other content', () => {
    fs.writeFileSync(file, 'ALPHA=one\n');

    importKey(KEY_A, false, false, file);

    const after = fs.readFileSync(file, 'utf-8');
    expect(after).toContain('ALPHA=one');
    const keyLines = after.split('\n').filter((line) => line.startsWith('LSH_SECRETS_KEY='));
    expect(keyLines).toEqual([`LSH_SECRETS_KEY=${KEY_A}`]);
  });
});

describe('importKey shadow guard (effective key, not just the target file)', () => {
  const KEY_A = 'a'.repeat(64);
  const KEY_B = 'b'.repeat(64);

  let repoDir: string;
  let homeDir: string;
  let originalCwd: string;
  let originalHome: string | undefined;
  let originalSecretsKey: string | undefined;
  let originalExitCode: number | undefined;
  let errorSpy: ReturnType<typeof jest.spyOn>;
  let logSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-shadow-repo-'));
    homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-shadow-home-'));
    originalCwd = process.cwd();
    process.chdir(repoDir);

    originalHome = process.env.HOME;
    process.env.HOME = homeDir;

    originalSecretsKey = process.env.LSH_SECRETS_KEY;
    delete process.env.LSH_SECRETS_KEY;

    originalExitCode = process.exitCode;
    process.exitCode = undefined;

    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
    process.chdir(originalCwd);
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    if (originalSecretsKey === undefined) delete process.env.LSH_SECRETS_KEY;
    else process.env.LSH_SECRETS_KEY = originalSecretsKey;
    process.exitCode = originalExitCode;
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(homeDir, { recursive: true, force: true });
  });

  it('refuses a local write that would shadow a different key effective from ~/.env, touching neither file', () => {
    const homeEnv = path.join(homeDir, '.env');
    fs.writeFileSync(homeEnv, `LSH_SECRETS_KEY=${KEY_A}\n`);

    importKey(KEY_B, false, false, '.env');

    expect(process.exitCode).toBe(1);
    expect(fs.existsSync(path.join(repoDir, '.env'))).toBe(false);
    expect(fs.readFileSync(homeEnv, 'utf-8')).toBe(`LSH_SECRETS_KEY=${KEY_A}\n`);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(homeEnv));
  });

  it('proceeds and writes the local file when --force overrides the shadow refusal', () => {
    const homeEnv = path.join(homeDir, '.env');
    fs.writeFileSync(homeEnv, `LSH_SECRETS_KEY=${KEY_A}\n`);

    importKey(KEY_B, true, false, '.env');

    expect(process.exitCode).toBeUndefined();
    expect(fs.readFileSync(path.join(repoDir, '.env'), 'utf-8')).toContain(`LSH_SECRETS_KEY=${KEY_B}`);
    expect(fs.readFileSync(homeEnv, 'utf-8')).toBe(`LSH_SECRETS_KEY=${KEY_A}\n`);
  });

  it('persists a key that is already effective elsewhere when the target file itself lacks it', () => {
    fs.writeFileSync(path.join(homeDir, '.env'), `LSH_SECRETS_KEY=${KEY_A}\n`);

    importKey(KEY_A, false, false, '.env');

    expect(process.exitCode).toBeUndefined();
    expect(logSpy).not.toHaveBeenCalledWith(SYNC_MESSAGES.KEY_ALREADY_CONFIGURED);
    expect(fs.readFileSync(path.join(repoDir, '.env'), 'utf-8')).toContain(`LSH_SECRETS_KEY=${KEY_A}`);
  });

  it('is a true no-op only when the target file already holds the exact key', () => {
    fs.writeFileSync(path.join(repoDir, '.env'), `LSH_SECRETS_KEY=${KEY_A}\n`);

    importKey(KEY_A, false, false, '.env');

    expect(process.exitCode).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(SYNC_MESSAGES.KEY_ALREADY_CONFIGURED);
    expect(fs.readFileSync(path.join(repoDir, '.env'), 'utf-8')).toBe(`LSH_SECRETS_KEY=${KEY_A}\n`);
  });

  it('does not refuse a global write based on an env-var-sourced effective key it cannot shadow', () => {
    process.env.LSH_SECRETS_KEY = KEY_A;

    importKey(KEY_B, false, true, '.env');

    expect(process.exitCode).toBeUndefined();
    expect(fs.readFileSync(path.join(homeDir, '.env'), 'utf-8')).toContain(`LSH_SECRETS_KEY=${KEY_B}`);
  });

  it('onboarding: persists an exported key with --global even though it is already effective', () => {
    process.env.LSH_SECRETS_KEY = KEY_A;

    importKey(KEY_A, false, true, '.env');

    expect(process.exitCode).toBeUndefined();
    const globalEnv = path.join(homeDir, '.env');
    expect(fs.existsSync(globalEnv)).toBe(true);
    expect(fs.readFileSync(globalEnv, 'utf-8')).toContain(`LSH_SECRETS_KEY=${KEY_A}`);
  });

  it('never refuses a --global write on shadow grounds, even when a different key is effective elsewhere', () => {
    fs.writeFileSync(path.join(repoDir, '.env'), `LSH_SECRETS_KEY=${KEY_A}\n`);

    importKey(KEY_B, false, true, '.env');

    expect(process.exitCode).toBeUndefined();
    expect(fs.readFileSync(path.join(homeDir, '.env'), 'utf-8')).toContain(`LSH_SECRETS_KEY=${KEY_B}`);
  });

  it('does not invoke the shadow refusal for a --file target outside the 3-tier lookup path', () => {
    fs.writeFileSync(path.join(homeDir, '.env'), `LSH_SECRETS_KEY=${KEY_A}\n`);
    const otherRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-shadow-other-repo-'));
    const otherFile = path.join(otherRepoDir, '.env');

    try {
      importKey(KEY_B, false, false, otherFile);

      // otherFile is never consulted by findEncryptionKeyWithSource(), so writing a different
      // key there cannot shadow anything — the write must proceed, not refuse.
      expect(process.exitCode).toBeUndefined();
      expect(fs.readFileSync(otherFile, 'utf-8')).toContain(`LSH_SECRETS_KEY=${KEY_B}`);
    } finally {
      fs.rmSync(otherRepoDir, { recursive: true, force: true });
    }
  });
});
