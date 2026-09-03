import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { backupEnvFile, readLocalEnv, writeEnvUpdate } from '../lib/env-store.js';

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

describe('writeEnvUpdate', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-env-store-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('patches an existing file in place, preserving comments and untouched keys', () => {
    const file = path.join(dir, '.env');
    fs.writeFileSync(file, '# header\nA=1\nB=2\n');

    writeEnvUpdate(file, { B: '9' }, { A: '1', B: '9' });

    expect(fs.readFileSync(file, 'utf8')).toBe('# header\nA=1\nB=9\n');
  });

  it('creates a missing file from the full content with owner-only permissions', () => {
    const file = path.join(dir, '.env');

    writeEnvUpdate(file, { A: '1' }, { A: '1' });

    expect(readLocalEnv(file)).toEqual({ A: '1' });
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });

  it('backs the file up before overwriting it', () => {
    const file = path.join(dir, '.env');
    fs.writeFileSync(file, 'A=1\n');

    writeEnvUpdate(file, { A: '2' }, { A: '2' });

    const backups = fs.readdirSync(dir).filter((name) => name.startsWith('.env.backup.'));
    expect(backups).toHaveLength(1);
    expect(fs.readFileSync(path.join(dir, backups[0]), 'utf8')).toBe('A=1\n');
  });
});

describe('readLocalEnv', () => {
  it('returns an empty map for a file that does not exist', () => {
    expect(readLocalEnv(path.join(os.tmpdir(), 'lsh-absent-.env'))).toEqual({});
  });
});
