import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  openInEditor,
  shouldPrompt,
  resolveGetOrList,
  copyFromTempPath,
  parseConfirmAnswer,
  backupEnvFile,
} from '../commands/edit.js';

describe('shouldPrompt', () => {
  const original = process.stdin.isTTY;
  afterEach(() => {
    (process.stdin as { isTTY?: boolean }).isTTY = original;
  });

  it('is false when stdin is not a TTY', () => {
    (process.stdin as { isTTY?: boolean }).isTTY = false;
    expect(shouldPrompt()).toBe(false);
  });

  it('is true when stdin is a TTY', () => {
    (process.stdin as { isTTY?: boolean }).isTTY = true;
    expect(shouldPrompt()).toBe(true);
  });
});

describe('openInEditor', () => {
  let dir: string;
  let file: string;
  const originalEditor = process.env.EDITOR;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-edit-'));
    file = path.join(dir, '.env');
    fs.writeFileSync(file, 'A=1\n');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    if (originalEditor === undefined) delete process.env.EDITOR;
    else process.env.EDITOR = originalEditor;
  });

  it('resolves when the editor exits successfully', async () => {
    process.env.EDITOR = 'true';
    await expect(openInEditor(file)).resolves.toBeUndefined();
  });

  it('leaves the file untouched when the editor makes no change', async () => {
    process.env.EDITOR = 'true';
    await openInEditor(file);
    expect(fs.readFileSync(file, 'utf8')).toBe('A=1\n');
  });

  it('rejects when the editor exits non-zero', async () => {
    process.env.EDITOR = 'false';
    await expect(openInEditor(file)).rejects.toThrow(/exited with code 1/);
  });
});

describe('resolveGetOrList masking policy', () => {
  const vars = { API_KEY: 'fixture-api-key' };

  it('masks values for --list', () => {
    const result = resolveGetOrList(vars, { list: true, format: 'env' });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.output).not.toContain('fixture-api-key');
      expect(result.output).toContain('API_KEY');
    }
  });

  it('does NOT mask values for --get --all', () => {
    const result = resolveGetOrList(vars, { all: true, get: true, format: 'env' });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.output).toContain('fixture-api-key');
  });

  it('does NOT mask a single --get', () => {
    const result = resolveGetOrList(vars, { get: 'API_KEY', format: 'env' });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.output).toContain('fixture-api-key');
  });
});

describe('parseConfirmAnswer', () => {
  it('treats the default [Y/n] cases as yes', () => {
    expect(parseConfirmAnswer('')).toBe(true);
    expect(parseConfirmAnswer('y')).toBe(true);
    expect(parseConfirmAnswer('Y')).toBe(true);
    expect(parseConfirmAnswer('yes')).toBe(true);
  });

  it('treats "n" and "no" as cancel', () => {
    expect(parseConfirmAnswer('n')).toBe(false);
    expect(parseConfirmAnswer('N')).toBe(false);
    expect(parseConfirmAnswer('no')).toBe(false);
    expect(parseConfirmAnswer('No')).toBe(false);
  });

  it('treats unrecognized input as cancel, not as yes', () => {
    expect(parseConfirmAnswer('maybe')).toBe(false);
    expect(parseConfirmAnswer('nope')).toBe(false);
  });
});

describe('backupEnvFile', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-backup-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('copies an existing file to a .backup.<timestamp> sibling, leaving the original untouched', () => {
    const file = path.join(dir, '.env');
    fs.writeFileSync(file, 'A=1\n');

    backupEnvFile(file);

    const backups = fs.readdirSync(dir).filter((name) => name.startsWith('.env.backup.'));
    expect(backups).toHaveLength(1);
    expect(fs.readFileSync(path.join(dir, backups[0]), 'utf8')).toBe('A=1\n');
    expect(fs.readFileSync(file, 'utf8')).toBe('A=1\n');
  });

  it('does nothing when the file does not exist', () => {
    const file = path.join(dir, '.env');

    backupEnvFile(file);

    expect(fs.readdirSync(dir)).toEqual([]);
  });
});

describe('copyFromTempPath', () => {
  it('always produces a name SecretsManager.pull accepts', () => {
    for (const input of ['.env', 'custom.env', '/abs/path/other.env']) {
      expect(path.basename(copyFromTempPath(input)).startsWith('.env.')).toBe(true);
    }
  });

  it('keeps the temp file beside the target', () => {
    expect(path.dirname(copyFromTempPath('/abs/path/other.env'))).toBe('/abs/path');
  });
});
