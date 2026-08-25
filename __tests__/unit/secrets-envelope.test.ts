/**
 * Unit tests for the versioned AEAD secrets envelope (issue #221).
 *
 * These tests are deliberately network-free and Kubo-free so they run in the CI gate.
 */

import crypto from 'crypto';
import {
  ENVELOPE_ALGORITHM,
  ENVELOPE_VERSION,
  encryptEnvelope,
  decryptEnvelope,
  isLegacyEnvelope,
  MAX_ENVELOPE_BYTES,
} from '../../src/lib/secrets-envelope.js';

const KEY = 'a'.repeat(64);
const OTHER_KEY = 'b'.repeat(64);
const PLAINTEXT = 'API_KEY=sk_live_1234\nDATABASE_URL=postgres://localhost/app\n';

/** Reproduce the legacy two-part `ivHex:ciphertextHex` AES-256-CBC payload. */
function legacyCbcPayload(plaintext: string, encryptionKey: string): string {
  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

describe('secrets-envelope', () => {
  describe('encryptEnvelope', () => {
    it('should produce a versioned AEAD envelope naming the algorithm', () => {
      const payload = encryptEnvelope(PLAINTEXT, KEY);
      const parsed = JSON.parse(payload);

      expect(parsed.v).toBe(ENVELOPE_VERSION);
      expect(parsed.alg).toBe(ENVELOPE_ALGORITHM);
      expect(ENVELOPE_ALGORITHM).toBe('aes-256-gcm');
      expect(typeof parsed.iv).toBe('string');
      expect(typeof parsed.tag).toBe('string');
      expect(typeof parsed.ct).toBe('string');
    });

    it('should never emit the plaintext in the envelope', () => {
      const payload = encryptEnvelope(PLAINTEXT, KEY);
      expect(payload).not.toContain('sk_live_1234');
      expect(payload).not.toContain('DATABASE_URL');
    });

    it('should use a fresh nonce for every call', () => {
      const first = JSON.parse(encryptEnvelope(PLAINTEXT, KEY));
      const second = JSON.parse(encryptEnvelope(PLAINTEXT, KEY));
      expect(first.iv).not.toBe(second.iv);
      expect(first.ct).not.toBe(second.ct);
    });

    it('should carry bounded authenticated metadata', () => {
      const payload = encryptEnvelope(PLAINTEXT, KEY, {
        environment: 'prod',
        repo: 'lsh',
        payload: 'env-text',
      });
      const parsed = JSON.parse(payload);
      expect(parsed.meta).toEqual({ environment: 'prod', repo: 'lsh', payload: 'env-text' });
    });

    it('should reject metadata that exceeds the bound', () => {
      expect(() =>
        encryptEnvelope(PLAINTEXT, KEY, { environment: 'x'.repeat(5000) })
      ).toThrow();
    });

    it('should reject an empty encryption key', () => {
      expect(() => encryptEnvelope(PLAINTEXT, '')).toThrow();
    });
  });

  describe('decryptEnvelope round trip', () => {
    it('should round trip plaintext through the AEAD envelope', () => {
      const result = decryptEnvelope(encryptEnvelope(PLAINTEXT, KEY), KEY);
      expect(result.plaintext).toBe(PLAINTEXT);
      expect(result.legacy).toBe(false);
    });

    it('should round trip metadata', () => {
      const payload = encryptEnvelope(PLAINTEXT, KEY, { environment: 'dev', payload: 'secrets-json' });
      const result = decryptEnvelope(payload, KEY);
      expect(result.meta).toEqual({ environment: 'dev', payload: 'secrets-json' });
    });

    it('should round trip an empty plaintext', () => {
      const result = decryptEnvelope(encryptEnvelope('', KEY), KEY);
      expect(result.plaintext).toBe('');
    });

    it('should round trip multi-byte UTF-8 plaintext', () => {
      const utf8 = 'TOKEN=Ω≈ç√∫˜µ\nNAME=日本語\n';
      expect(decryptEnvelope(encryptEnvelope(utf8, KEY), KEY).plaintext).toBe(utf8);
    });
  });

  describe('authentication failures', () => {
    it('should fail when the ciphertext is tampered with', () => {
      const parsed = JSON.parse(encryptEnvelope(PLAINTEXT, KEY));
      const ctBytes = Buffer.from(parsed.ct, 'hex');
      ctBytes[0] ^= 0xff;
      parsed.ct = ctBytes.toString('hex');
      expect(() => decryptEnvelope(JSON.stringify(parsed), KEY)).toThrow();
    });

    it('should fail when the nonce is tampered with', () => {
      const parsed = JSON.parse(encryptEnvelope(PLAINTEXT, KEY));
      const ivBytes = Buffer.from(parsed.iv, 'hex');
      ivBytes[0] ^= 0xff;
      parsed.iv = ivBytes.toString('hex');
      expect(() => decryptEnvelope(JSON.stringify(parsed), KEY)).toThrow();
    });

    it('should fail when the authentication tag is tampered with', () => {
      const parsed = JSON.parse(encryptEnvelope(PLAINTEXT, KEY));
      const tagBytes = Buffer.from(parsed.tag, 'hex');
      tagBytes[0] ^= 0xff;
      parsed.tag = tagBytes.toString('hex');
      expect(() => decryptEnvelope(JSON.stringify(parsed), KEY)).toThrow();
    });

    it('should fail when authenticated metadata is tampered with', () => {
      const parsed = JSON.parse(encryptEnvelope(PLAINTEXT, KEY, { environment: 'dev' }));
      parsed.meta = { environment: 'prod' };
      expect(() => decryptEnvelope(JSON.stringify(parsed), KEY)).toThrow();
    });

    it('should fail when the declared version is tampered with', () => {
      const parsed = JSON.parse(encryptEnvelope(PLAINTEXT, KEY));
      parsed.v = ENVELOPE_VERSION + 1;
      expect(() => decryptEnvelope(JSON.stringify(parsed), KEY)).toThrow();
    });

    it('should fail when the declared algorithm is downgraded', () => {
      const parsed = JSON.parse(encryptEnvelope(PLAINTEXT, KEY));
      parsed.alg = 'aes-256-cbc';
      expect(() => decryptEnvelope(JSON.stringify(parsed), KEY)).toThrow();
    });

    it('should fail with the wrong key', () => {
      expect(() => decryptEnvelope(encryptEnvelope(PLAINTEXT, KEY), OTHER_KEY)).toThrow();
    });

    it('should fail on a truncated envelope', () => {
      const payload = encryptEnvelope(PLAINTEXT, KEY);
      expect(() => decryptEnvelope(payload.slice(0, payload.length - 10), KEY)).toThrow();
    });

    it('should fail on a truncated ciphertext', () => {
      const parsed = JSON.parse(encryptEnvelope(PLAINTEXT, KEY));
      parsed.ct = parsed.ct.slice(0, Math.max(0, parsed.ct.length - 4));
      expect(() => decryptEnvelope(JSON.stringify(parsed), KEY)).toThrow();
    });

    it('should fail on a missing authentication tag', () => {
      const parsed = JSON.parse(encryptEnvelope(PLAINTEXT, KEY));
      delete parsed.tag;
      expect(() => decryptEnvelope(JSON.stringify(parsed), KEY)).toThrow();
    });

    it('should fail on an empty payload', () => {
      expect(() => decryptEnvelope('', KEY)).toThrow();
    });

    it('should fail on an oversized payload before parsing', () => {
      const oversized = '{' + 'x'.repeat(MAX_ENVELOPE_BYTES);
      expect(() => decryptEnvelope(oversized, KEY)).toThrow();
    });
  });

  describe('legacy CBC compatibility', () => {
    it('should identify a legacy two-part payload', () => {
      expect(isLegacyEnvelope(legacyCbcPayload(PLAINTEXT, KEY))).toBe(true);
    });

    it('should not identify an AEAD envelope as legacy', () => {
      expect(isLegacyEnvelope(encryptEnvelope(PLAINTEXT, KEY))).toBe(false);
    });

    it('should read a legacy CBC payload and flag it as legacy', () => {
      const result = decryptEnvelope(legacyCbcPayload(PLAINTEXT, KEY), KEY);
      expect(result.plaintext).toBe(PLAINTEXT);
      expect(result.legacy).toBe(true);
    });

    it('should fail to read a legacy payload with the wrong key', () => {
      expect(() => decryptEnvelope(legacyCbcPayload(PLAINTEXT, KEY), OTHER_KEY)).toThrow();
    });

    it('should never write the legacy format', () => {
      expect(isLegacyEnvelope(encryptEnvelope(PLAINTEXT, KEY, { environment: 'dev' }))).toBe(false);
    });

    it('should flag a legacy read as unauthenticated, because CBC is malleable', () => {
      // This documents a residual risk rather than a guarantee. CBC has no MAC, so an
      // attacker who can serve the bytes can flip IV bits to make controlled edits to the
      // first plaintext block. The read therefore MUST be reported as `legacy: true` so
      // callers can warn before trusting or writing it. Only the AEAD envelope has integrity.
      const payload = legacyCbcPayload(PLAINTEXT, KEY);
      const [ivHex, ctHex] = payload.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const known = Buffer.from(PLAINTEXT.slice(0, 16), 'utf8');
      const forged = Buffer.from('EVIL_KEY=pwned!!', 'utf8');
      for (let i = 0; i < 16; i++) iv[i] ^= known[i] ^ forged[i];

      const opened = decryptEnvelope(`${iv.toString('hex')}:${ctHex}`, KEY);

      expect(opened.legacy).toBe(true);
      expect(opened.plaintext.startsWith('EVIL_KEY=pwned!!')).toBe(true);
    });

    it('should authenticate the AEAD envelope against the same class of edit', () => {
      const parsed = JSON.parse(encryptEnvelope(PLAINTEXT, KEY));
      const iv = Buffer.from(parsed.iv, 'hex');
      iv[0] ^= 0x01;
      parsed.iv = iv.toString('hex');

      expect(() => decryptEnvelope(JSON.stringify(parsed), KEY)).toThrow(/could not be authenticated/);
    });
  });

  describe('deterministic vectors', () => {
    it('should decrypt a fixed AEAD envelope produced from known material', () => {
      // Deterministic vector: fixed key, fixed nonce, fixed plaintext.
      const derived = crypto.createHash('sha256').update(KEY).digest();
      const iv = Buffer.alloc(12, 7);
      const meta = {};
      const aad = Buffer.from(
        JSON.stringify({ v: ENVELOPE_VERSION, alg: ENVELOPE_ALGORITHM, meta }),
        'utf8'
      );
      const cipher = crypto.createCipheriv('aes-256-gcm', derived, iv);
      cipher.setAAD(aad);
      const ct = Buffer.concat([cipher.update(PLAINTEXT, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();

      const envelope = JSON.stringify({
        v: ENVELOPE_VERSION,
        alg: ENVELOPE_ALGORITHM,
        meta,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        ct: ct.toString('hex'),
      });

      expect(decryptEnvelope(envelope, KEY).plaintext).toBe(PLAINTEXT);
    });
  });
});
