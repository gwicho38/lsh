/**
 * IPNS Key Manager Tests
 * Unit tests for deterministic key derivation (no network required)
 */

import * as crypto from 'crypto';
import { describe, it, expect } from '@jest/globals';
import { deriveKeyInfo, buildPemFromSeed } from '../src/lib/ipns-key-manager.js';

describe('IPNSKeyManager', () => {
  const testKey = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
  const testRepo = 'my-app';
  const testEnv = 'dev';

  describe('deriveKeyInfo', () => {
    it('should return deterministic results for same inputs', () => {
      const result1 = deriveKeyInfo(testKey, testRepo, testEnv);
      const result2 = deriveKeyInfo(testKey, testRepo, testEnv);

      expect(result1.keyName).toBe(result2.keyName);
      expect(result1.seed.equals(result2.seed)).toBe(true);
    });

    it('should produce different keys for different secrets keys', () => {
      const result1 = deriveKeyInfo(testKey, testRepo, testEnv);
      const result2 = deriveKeyInfo('different-key', testRepo, testEnv);

      expect(result1.keyName).not.toBe(result2.keyName);
      expect(result1.seed.equals(result2.seed)).toBe(false);
    });

    it('should produce different keys for different repos', () => {
      const result1 = deriveKeyInfo(testKey, 'repo-a', testEnv);
      const result2 = deriveKeyInfo(testKey, 'repo-b', testEnv);

      expect(result1.keyName).not.toBe(result2.keyName);
    });

    it('should produce different keys for different environments', () => {
      const result1 = deriveKeyInfo(testKey, testRepo, 'dev');
      const result2 = deriveKeyInfo(testKey, testRepo, 'prod');

      expect(result1.keyName).not.toBe(result2.keyName);
    });

    it('should produce a 32-byte seed', () => {
      const result = deriveKeyInfo(testKey, testRepo, testEnv);
      expect(result.seed.length).toBe(32);
    });

    it('should produce a key name with lsh- prefix and 20 chars total', () => {
      const result = deriveKeyInfo(testKey, testRepo, testEnv);
      expect(result.keyName).toMatch(/^lsh-[0-9a-f]{16}$/);
      expect(result.keyName.length).toBe(20);
    });
  });

  describe('buildPemFromSeed', () => {
    it('should produce a valid PEM string', () => {
      const { seed } = deriveKeyInfo(testKey, testRepo, testEnv);
      const pem = buildPemFromSeed(seed);

      expect(pem).toContain('-----BEGIN PRIVATE KEY-----');
      expect(pem).toContain('-----END PRIVATE KEY-----');
    });

    it('should produce a valid ed25519 key that Node.js crypto can parse', () => {
      const { seed } = deriveKeyInfo(testKey, testRepo, testEnv);
      const pem = buildPemFromSeed(seed);

      // Should not throw
      const keyObject = crypto.createPrivateKey(pem);
      expect(keyObject.type).toBe('private');
      expect(keyObject.asymmetricKeyType).toBe('ed25519');
    });

    it('should produce deterministic PEM for same seed', () => {
      const { seed } = deriveKeyInfo(testKey, testRepo, testEnv);
      const pem1 = buildPemFromSeed(seed);
      const pem2 = buildPemFromSeed(seed);

      expect(pem1).toBe(pem2);
    });

    it('should produce a public key that can be derived from the private key', () => {
      const { seed } = deriveKeyInfo(testKey, testRepo, testEnv);
      const pem = buildPemFromSeed(seed);

      const privateKey = crypto.createPrivateKey(pem);
      const publicKey = crypto.createPublicKey(privateKey);

      expect(publicKey.type).toBe('public');
      expect(publicKey.asymmetricKeyType).toBe('ed25519');
    });
  });
});
