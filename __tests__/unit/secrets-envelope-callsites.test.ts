/**
 * Guards that every active sync path encrypts through the versioned AEAD envelope (issue #221).
 *
 * Network-free and Kubo-free: the storage adapter's crypto helpers are pure, and the
 * command surface is checked by scanning its source for raw cipher construction.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { IPFSSecretsStorage } from '../../src/lib/ipfs-secrets-storage.js';
import type { Secret } from '../../src/lib/secrets-manager.js';
import { isLegacyEnvelope } from '../../src/lib/secrets-envelope.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const KEY = 'c'.repeat(64);
const OTHER_KEY = 'd'.repeat(64);

const SECRETS: Secret[] = [
  { key: 'API_KEY', value: 'sk_live_abcdef', environment: 'prod' } as Secret,
  { key: 'DATABASE_URL', value: 'postgres://localhost/app', environment: 'prod' } as Secret,
];

/** Reach the adapter's private crypto helpers without a live Kubo daemon. */
interface StorageCrypto {
  encryptSecrets(secrets: Secret[], key: string, environment?: string, gitRepo?: string): string;
  decryptSecrets(payload: string, key: string): Secret[];
}

function storageCrypto(): StorageCrypto {
  return new IPFSSecretsStorage() as unknown as StorageCrypto;
}

function legacySecretsPayload(secrets: Secret[], encryptionKey: string): string {
  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(secrets), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

describe('active sync paths use the AEAD envelope', () => {
  describe('lsh push / lsh pull (IPFSSecretsStorage)', () => {
    it('should write a versioned envelope rather than the legacy format', () => {
      const payload = storageCrypto().encryptSecrets(SECRETS, KEY, 'prod', 'lsh');
      expect(isLegacyEnvelope(payload)).toBe(false);

      const parsed = JSON.parse(payload);
      expect(parsed.alg).toBe('aes-256-gcm');
      expect(parsed.meta).toEqual({ environment: 'prod', payload: 'secrets-json', repo: 'lsh' });
    });

    it('should round trip secrets through the envelope', () => {
      const adapter = storageCrypto();
      const payload = adapter.encryptSecrets(SECRETS, KEY, 'prod', 'lsh');
      expect(adapter.decryptSecrets(payload, KEY)).toEqual(SECRETS);
    });

    it('should reject a tampered ciphertext before JSON parsing', () => {
      const adapter = storageCrypto();
      const parsed = JSON.parse(adapter.encryptSecrets(SECRETS, KEY, 'prod', 'lsh'));
      const ct = Buffer.from(parsed.ct, 'hex');
      ct[0] ^= 0xff;
      parsed.ct = ct.toString('hex');

      expect(() => adapter.decryptSecrets(JSON.stringify(parsed), KEY)).toThrow();
    });

    it('should reject a tampered environment in the authenticated metadata', () => {
      const adapter = storageCrypto();
      const parsed = JSON.parse(adapter.encryptSecrets(SECRETS, KEY, 'prod', 'lsh'));
      parsed.meta.environment = 'dev';

      expect(() => adapter.decryptSecrets(JSON.stringify(parsed), KEY)).toThrow();
    });

    it('should reject the wrong key', () => {
      const adapter = storageCrypto();
      const payload = adapter.encryptSecrets(SECRETS, KEY, 'prod', 'lsh');
      expect(() => adapter.decryptSecrets(payload, OTHER_KEY)).toThrow();
    });

    it('should still read a legacy CBC payload for migration', () => {
      const adapter = storageCrypto();
      expect(adapter.decryptSecrets(legacySecretsPayload(SECRETS, KEY), KEY)).toEqual(SECRETS);
    });
  });

  describe('source-level regression guard', () => {
    const guarded = [
      'src/commands/sync.ts',
      'src/lib/ipfs-secrets-storage.ts',
      'src/lib/secrets-manager.ts',
    ];

    it.each(guarded)('should not construct a raw cipher in %s', (relativePath) => {
      const source = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');
      expect(source).not.toContain('createCipheriv');
      expect(source).not.toContain('createDecipheriv');
      expect(source).not.toContain('aes-256-cbc');
    });

    it('should route every sync-path encryption through secrets-envelope', () => {
      const syncSource = fs.readFileSync(path.join(REPO_ROOT, 'src/commands/sync.ts'), 'utf-8');
      expect(syncSource).toContain("from '../lib/secrets-envelope.js'");
      expect(syncSource).toContain('encryptEnvelope(');
      expect(syncSource).toContain('decryptEnvelope(');
    });
  });
});
