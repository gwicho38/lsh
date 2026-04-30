/**
 * Sync Key Store Tests
 *
 * The store keeps the LSH_SECRETS_KEY on disk at
 * ``$LSH_HOME/sync_key.json`` (default ``~/.config/lsh/sync_key.json``)
 * with mode 0600. ``findExistingKey()`` should fall back to it after
 * env var and .env files.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  SyncKeyStore,
  generateKey,
  HEX64_REGEX,
} from '../src/lib/sync-key-store.js';

describe('SyncKeyStore', () => {
  let tmpHome: string;
  let originalLshHome: string | undefined;
  let originalHome: string | undefined;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-keystore-'));
    originalLshHome = process.env.LSH_HOME;
    originalHome = process.env.HOME;
    process.env.LSH_HOME = tmpHome;
    // Make sure the global ~/.env lookup in findExistingKey doesn't leak.
    process.env.HOME = tmpHome;
  });

  afterEach(() => {
    if (originalLshHome === undefined) delete process.env.LSH_HOME;
    else process.env.LSH_HOME = originalLshHome;
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  describe('generateKey()', () => {
    it('returns a 64-char hex string', () => {
      const key = generateKey();
      expect(key).toMatch(HEX64_REGEX);
      expect(key).toHaveLength(64);
    });

    it('produces unique keys across calls', () => {
      const a = generateKey();
      const b = generateKey();
      expect(a).not.toBe(b);
    });
  });

  describe('SyncKeyStore.generate()', () => {
    it('persists the generated key under LSH_HOME', () => {
      const store = new SyncKeyStore();
      const key = store.generate();
      expect(store.get()).toBe(key);
    });

    it('writes the file with mode 0600', () => {
      const store = new SyncKeyStore();
      store.generate();
      const stat = fs.statSync(store.path);
      expect(stat.mode & 0o777).toBe(0o600);
    });

    it('refuses to overwrite without force', () => {
      const store = new SyncKeyStore();
      store.generate();
      expect(() => store.generate()).toThrow(/already exists/i);
    });

    it('overwrites with force=true', () => {
      const store = new SyncKeyStore();
      const first = store.generate();
      const second = store.generate(true);
      expect(first).not.toBe(second);
      expect(store.get()).toBe(second);
    });
  });

  describe('SyncKeyStore.set / get / clear', () => {
    it('rejects non-hex or wrong-length keys', () => {
      const store = new SyncKeyStore();
      expect(() => store.set('not-hex')).toThrow(/64-char hex/i);
      expect(() => store.set('abc')).toThrow(/64-char hex/i);
      expect(() => store.set('z'.repeat(64))).toThrow(/64-char hex/i);
    });

    it('accepts a valid 64-char hex key', () => {
      const valid = 'a'.repeat(64);
      const store = new SyncKeyStore();
      store.set(valid);
      expect(store.get()).toBe(valid);
    });

    it('returns null when no key is configured', () => {
      const store = new SyncKeyStore();
      expect(store.get()).toBeNull();
    });

    it('clear removes the persisted key', () => {
      const store = new SyncKeyStore();
      store.generate();
      expect(store.get()).not.toBeNull();
      store.clear();
      expect(store.get()).toBeNull();
    });
  });
});

describe('findExistingKey() fallback ordering', () => {
  let tmpHome: string;
  let cwd: string;
  let originalLshHome: string | undefined;
  let originalHome: string | undefined;
  let originalEnvKey: string | undefined;
  let originalCwd: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-keystore-'));
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-cwd-'));
    originalLshHome = process.env.LSH_HOME;
    originalHome = process.env.HOME;
    originalEnvKey = process.env.LSH_SECRETS_KEY;
    originalCwd = process.cwd();
    process.env.LSH_HOME = tmpHome;
    process.env.HOME = tmpHome;
    delete process.env.LSH_SECRETS_KEY;
    process.chdir(cwd);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (originalLshHome === undefined) delete process.env.LSH_HOME;
    else process.env.LSH_HOME = originalLshHome;
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    if (originalEnvKey === undefined) delete process.env.LSH_SECRETS_KEY;
    else process.env.LSH_SECRETS_KEY = originalEnvKey;
    fs.rmSync(tmpHome, { recursive: true, force: true });
    fs.rmSync(cwd, { recursive: true, force: true });
    jest.resetModules();
  });

  async function reload() {
    jest.resetModules();
    return await import('../src/lib/secrets-manager.js');
  }

  it('returns env var when set, ignoring the on-disk store', async () => {
    process.env.LSH_SECRETS_KEY = 'env-wins-value';
    new SyncKeyStore().set('b'.repeat(64));
    const mod = await reload();
    expect(mod.findEncryptionKey()).toBe('env-wins-value');
  });

  it('falls back to local .env when env var unset', async () => {
    fs.writeFileSync(path.join(cwd, '.env'), `LSH_SECRETS_KEY=${'c'.repeat(64)}\n`);
    const mod = await reload();
    expect(mod.findEncryptionKey()).toBe('c'.repeat(64));
  });

  it('falls back to the SyncKeyStore after env, local, and global .env are empty', async () => {
    new SyncKeyStore().set('d'.repeat(64));
    const mod = await reload();
    expect(mod.findEncryptionKey()).toBe('d'.repeat(64));
  });

  it('returns null when nothing is configured', async () => {
    const mod = await reload();
    expect(mod.findEncryptionKey()).toBeNull();
  });
});
