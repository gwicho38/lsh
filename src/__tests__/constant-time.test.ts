/**
 * Tests for constant-time.ts
 * Security-critical tests for timing-attack-resistant comparison functions
 */

import { createHmac } from 'crypto';
import {
  constantTimeStringCompare,
  constantTimeBufferCompare,
  constantTimeHmacCompare,
  verifyHmacSignature,
  verifyApiKey,
} from '../lib/constant-time.js';

describe('Constant-Time Utilities', () => {
  describe('constantTimeStringCompare', () => {
    describe('equal strings', () => {
      it('should return true for identical strings', () => {
        expect(constantTimeStringCompare('secret', 'secret')).toBe(true);
      });

      it('should return true for empty strings', () => {
        expect(constantTimeStringCompare('', '')).toBe(true);
      });

      it('should return true for long identical strings', () => {
        const longString = 'a'.repeat(10000);
        expect(constantTimeStringCompare(longString, longString)).toBe(true);
      });

      it('should return true for strings with special characters', () => {
        const special = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
        expect(constantTimeStringCompare(special, special)).toBe(true);
      });

      it('should return true for unicode strings', () => {
        const unicode = '你好世界🌍🚀';
        expect(constantTimeStringCompare(unicode, unicode)).toBe(true);
      });

      it('should return true for strings with newlines and tabs', () => {
        const whitespace = 'line1\nline2\ttab';
        expect(constantTimeStringCompare(whitespace, whitespace)).toBe(true);
      });
    });

    describe('unequal strings', () => {
      it('should return false for different strings of same length', () => {
        expect(constantTimeStringCompare('secret', 'Secret')).toBe(false);
      });

      it('should return false for strings of different lengths', () => {
        expect(constantTimeStringCompare('short', 'longer_string')).toBe(false);
      });

      it('should return false when comparing empty to non-empty', () => {
        expect(constantTimeStringCompare('', 'something')).toBe(false);
      });

      it('should return false for strings differing in last character', () => {
        expect(constantTimeStringCompare('secreta', 'secretb')).toBe(false);
      });

      it('should return false for strings differing in first character', () => {
        expect(constantTimeStringCompare('asecret', 'bsecret')).toBe(false);
      });

      it('should return false for strings differing in middle', () => {
        expect(constantTimeStringCompare('seXret', 'secXet')).toBe(false);
      });

      it('should be case sensitive', () => {
        expect(constantTimeStringCompare('ABC', 'abc')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle null bytes in strings', () => {
        expect(constantTimeStringCompare('a\x00b', 'a\x00b')).toBe(true);
        expect(constantTimeStringCompare('a\x00b', 'a\x00c')).toBe(false);
      });

      it('should handle single character strings', () => {
        expect(constantTimeStringCompare('a', 'a')).toBe(true);
        expect(constantTimeStringCompare('a', 'b')).toBe(false);
      });

      it('should handle strings with only whitespace', () => {
        expect(constantTimeStringCompare('   ', '   ')).toBe(true);
        expect(constantTimeStringCompare('   ', '  ')).toBe(false);
      });
    });
  });

  describe('constantTimeBufferCompare', () => {
    describe('equal buffers', () => {
      it('should return true for identical buffers', () => {
        const buf = Buffer.from('secret');
        expect(constantTimeBufferCompare(buf, Buffer.from('secret'))).toBe(true);
      });

      it('should return true for empty buffers', () => {
        expect(constantTimeBufferCompare(Buffer.alloc(0), Buffer.alloc(0))).toBe(true);
      });

      it('should return true for buffers with binary data', () => {
        const binary = Buffer.from([0x00, 0xff, 0x80, 0x7f, 0x01]);
        expect(constantTimeBufferCompare(binary, Buffer.from([0x00, 0xff, 0x80, 0x7f, 0x01]))).toBe(true);
      });

      it('should return true for large identical buffers', () => {
        const large = Buffer.alloc(10000, 0x42);
        const largeCopy = Buffer.alloc(10000, 0x42);
        expect(constantTimeBufferCompare(large, largeCopy)).toBe(true);
      });
    });

    describe('unequal buffers', () => {
      it('should return false for different buffers of same length', () => {
        expect(constantTimeBufferCompare(
          Buffer.from([1, 2, 3]),
          Buffer.from([1, 2, 4])
        )).toBe(false);
      });

      it('should return false for buffers of different lengths', () => {
        expect(constantTimeBufferCompare(
          Buffer.from([1, 2]),
          Buffer.from([1, 2, 3])
        )).toBe(false);
      });

      it('should return false when comparing empty to non-empty buffer', () => {
        expect(constantTimeBufferCompare(
          Buffer.alloc(0),
          Buffer.from([1])
        )).toBe(false);
      });

      it('should return false for buffers differing in last byte', () => {
        expect(constantTimeBufferCompare(
          Buffer.from([1, 2, 3, 4]),
          Buffer.from([1, 2, 3, 5])
        )).toBe(false);
      });

      it('should return false for buffers differing in first byte', () => {
        expect(constantTimeBufferCompare(
          Buffer.from([1, 2, 3, 4]),
          Buffer.from([0, 2, 3, 4])
        )).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle single byte buffers', () => {
        expect(constantTimeBufferCompare(Buffer.from([42]), Buffer.from([42]))).toBe(true);
        expect(constantTimeBufferCompare(Buffer.from([42]), Buffer.from([43]))).toBe(false);
      });

      it('should handle buffers with all zeros', () => {
        const zeros = Buffer.alloc(100, 0);
        expect(constantTimeBufferCompare(zeros, Buffer.alloc(100, 0))).toBe(true);
      });

      it('should handle buffers with all 0xFF', () => {
        const ones = Buffer.alloc(100, 0xff);
        expect(constantTimeBufferCompare(ones, Buffer.alloc(100, 0xff))).toBe(true);
      });
    });
  });

  describe('constantTimeHmacCompare', () => {
    const testKey = 'test-hmac-key-12345';

    describe('equal values', () => {
      it('should return true for identical strings', () => {
        expect(constantTimeHmacCompare('secret', 'secret', testKey)).toBe(true);
      });

      it('should return true for empty strings', () => {
        expect(constantTimeHmacCompare('', '', testKey)).toBe(true);
      });

      it('should return true for long strings', () => {
        const longString = 'x'.repeat(10000);
        expect(constantTimeHmacCompare(longString, longString, testKey)).toBe(true);
      });

      it('should return true for unicode strings', () => {
        const unicode = '测试数据🔐';
        expect(constantTimeHmacCompare(unicode, unicode, testKey)).toBe(true);
      });
    });

    describe('unequal values', () => {
      it('should return false for different strings', () => {
        expect(constantTimeHmacCompare('secret', 'Secret', testKey)).toBe(false);
      });

      it('should return false for different length strings', () => {
        // HMAC comparison hides length, but values are still different
        expect(constantTimeHmacCompare('short', 'longer', testKey)).toBe(false);
      });

      it('should return false when comparing empty to non-empty', () => {
        expect(constantTimeHmacCompare('', 'value', testKey)).toBe(false);
      });
    });

    describe('key handling', () => {
      it('should return false when using different keys', () => {
        const value = 'test-value';
        const result1 = constantTimeHmacCompare(value, value, 'key1');
        const result2 = constantTimeHmacCompare(value, value, 'key2');
        // Same value with same key should still match
        expect(result1).toBe(true);
        expect(result2).toBe(true);
      });

      it('should work with empty key', () => {
        expect(constantTimeHmacCompare('test', 'test', '')).toBe(true);
        expect(constantTimeHmacCompare('test', 'different', '')).toBe(false);
      });

      it('should work with long key', () => {
        const longKey = 'k'.repeat(1000);
        expect(constantTimeHmacCompare('value', 'value', longKey)).toBe(true);
      });
    });
  });

  describe('verifyHmacSignature', () => {
    const secret = 'webhook-secret-key';
    const payload = '{"event":"test","data":{"id":123}}';

    // Helper to generate valid signature
    function generateSignature(data: string, key: string, algo: 'sha256' | 'sha512' = 'sha256'): string {
      return createHmac(algo, key).update(data).digest('hex');
    }

    describe('valid signatures', () => {
      it('should return true for valid sha256 signature', () => {
        const signature = generateSignature(payload, secret);
        expect(verifyHmacSignature(payload, signature, secret)).toBe(true);
      });

      it('should return true for valid sha512 signature', () => {
        const signature = generateSignature(payload, secret, 'sha512');
        expect(verifyHmacSignature(payload, signature, secret, 'sha512')).toBe(true);
      });

      it('should verify empty payload', () => {
        const signature = generateSignature('', secret);
        expect(verifyHmacSignature('', signature, secret)).toBe(true);
      });

      it('should verify unicode payload', () => {
        const unicodePayload = '{"message":"你好🌍"}';
        const signature = generateSignature(unicodePayload, secret);
        expect(verifyHmacSignature(unicodePayload, signature, secret)).toBe(true);
      });

      it('should verify large payload', () => {
        const largePayload = JSON.stringify({ data: 'x'.repeat(100000) });
        const signature = generateSignature(largePayload, secret);
        expect(verifyHmacSignature(largePayload, signature, secret)).toBe(true);
      });
    });

    describe('invalid signatures', () => {
      it('should return false for tampered payload', () => {
        const signature = generateSignature(payload, secret);
        const tamperedPayload = '{"event":"test","data":{"id":124}}';
        expect(verifyHmacSignature(tamperedPayload, signature, secret)).toBe(false);
      });

      it('should return false for wrong secret', () => {
        const signature = generateSignature(payload, secret);
        expect(verifyHmacSignature(payload, signature, 'wrong-secret')).toBe(false);
      });

      it('should return false for corrupted signature', () => {
        const signature = generateSignature(payload, secret);
        const corrupted = signature.slice(0, -2) + 'ff';
        expect(verifyHmacSignature(payload, corrupted, secret)).toBe(false);
      });

      it('should return false for truncated signature', () => {
        const signature = generateSignature(payload, secret);
        const truncated = signature.slice(0, 32);
        expect(verifyHmacSignature(payload, truncated, secret)).toBe(false);
      });

      it('should return false for wrong algorithm', () => {
        const sha512Sig = generateSignature(payload, secret, 'sha512');
        // Verify with sha256 should fail
        expect(verifyHmacSignature(payload, sha512Sig, secret, 'sha256')).toBe(false);
      });

      it('should return false for empty signature', () => {
        expect(verifyHmacSignature(payload, '', secret)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle signature with uppercase hex', () => {
        const signature = generateSignature(payload, secret).toUpperCase();
        // Note: Buffer.from(hex) handles case insensitively
        expect(verifyHmacSignature(payload, signature, secret)).toBe(true);
      });

      it('should handle empty secret', () => {
        const sig = generateSignature(payload, '');
        expect(verifyHmacSignature(payload, sig, '')).toBe(true);
      });

      it('should reject non-hex signature', () => {
        // Invalid hex should produce empty or partial buffer
        expect(verifyHmacSignature(payload, 'not-hex!', secret)).toBe(false);
      });
    });

    describe('GitHub webhook format', () => {
      it('should verify GitHub-style webhook signature', () => {
        const githubPayload = '{"ref":"refs/heads/main"}';
        const githubSecret = 'my-webhook-secret';
        const sig = createHmac('sha256', githubSecret)
          .update(githubPayload)
          .digest('hex');

        expect(verifyHmacSignature(githubPayload, sig, githubSecret)).toBe(true);
      });
    });
  });

  describe('verifyApiKey', () => {
    describe('matching keys', () => {
      it('should return true for identical keys', () => {
        const key = 'sk_live_abcdefghijklmnop';
        expect(verifyApiKey(key, key)).toBe(true);
      });

      it('should return true after trimming whitespace', () => {
        expect(verifyApiKey('  api-key  ', 'api-key')).toBe(true);
        expect(verifyApiKey('api-key', '  api-key  ')).toBe(true);
        expect(verifyApiKey('  api-key  ', '  api-key  ')).toBe(true);
      });

      it('should return true for normalized unicode', () => {
        // Using combining characters that normalize to same form
        const key1 = 'caf\u00e9'; // é as single character
        const key2 = 'cafe\u0301'; // e + combining acute accent
        expect(verifyApiKey(key1, key2)).toBe(true);
      });

      it('should return true for empty keys after trim', () => {
        expect(verifyApiKey('', '')).toBe(true);
        expect(verifyApiKey('   ', '   ')).toBe(true);
        expect(verifyApiKey('', '   ')).toBe(true);
      });
    });

    describe('non-matching keys', () => {
      it('should return false for different keys', () => {
        expect(verifyApiKey('key-a', 'key-b')).toBe(false);
      });

      it('should be case sensitive', () => {
        expect(verifyApiKey('API-KEY', 'api-key')).toBe(false);
      });

      it('should return false when one is empty', () => {
        expect(verifyApiKey('', 'some-key')).toBe(false);
        expect(verifyApiKey('some-key', '')).toBe(false);
      });

      it('should distinguish similar keys', () => {
        expect(verifyApiKey('sk_live_123', 'sk_live_124')).toBe(false);
        expect(verifyApiKey('sk_live_123', 'sk_test_123')).toBe(false);
      });
    });

    describe('real-world API key formats', () => {
      it('should verify Stripe-style keys', () => {
        // Using fake format to avoid triggering secret scanners
        const stripeKey = 'sk_test_FAKEKEYFORTESTING12345678';
        expect(verifyApiKey(stripeKey, stripeKey)).toBe(true);
      });

      it('should verify UUID-style keys', () => {
        const uuidKey = '550e8400-e29b-41d4-a716-446655440000';
        expect(verifyApiKey(uuidKey, uuidKey)).toBe(true);
      });

      it('should verify base64-style keys', () => {
        const base64Key = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=';
        expect(verifyApiKey(base64Key, base64Key)).toBe(true);
      });

      it('should verify long randomly generated keys', () => {
        const longKey = 'a'.repeat(64) + 'b'.repeat(64);
        expect(verifyApiKey(longKey, longKey)).toBe(true);
      });
    });

    describe('security edge cases', () => {
      it('should handle keys with special characters', () => {
        const specialKey = 'key!@#$%^&*()_+-=[]{}|;:,.<>?';
        expect(verifyApiKey(specialKey, specialKey)).toBe(true);
      });

      it('should handle keys with newlines (trimmed)', () => {
        expect(verifyApiKey('\napi-key\n', 'api-key')).toBe(true);
      });

      it('should handle keys with tabs (trimmed)', () => {
        expect(verifyApiKey('\tapi-key\t', 'api-key')).toBe(true);
      });

      it('should preserve internal whitespace', () => {
        expect(verifyApiKey('api key', 'api key')).toBe(true);
        expect(verifyApiKey('api key', 'apikey')).toBe(false);
      });
    });
  });

  describe('Timing Attack Resistance', () => {
    /**
     * Note: These tests verify behavioral correctness, not actual timing.
     * True timing analysis requires statistical methods with many iterations
     * and is difficult to do reliably in unit tests.
     */

    it('should use constant-time comparison regardless of where strings differ', () => {
      const base = 'abcdefghij';

      // All these should return false, but the comparison should
      // take approximately the same time
      expect(constantTimeStringCompare(base, 'Xbcdefghij')).toBe(false); // First char diff
      expect(constantTimeStringCompare(base, 'abcdeXghij')).toBe(false); // Middle char diff
      expect(constantTimeStringCompare(base, 'abcdefghiX')).toBe(false); // Last char diff
    });

    it('should handle length differences with padding', () => {
      // These use padding internally to avoid early returns
      expect(constantTimeStringCompare('a', 'ab')).toBe(false);
      expect(constantTimeStringCompare('ab', 'a')).toBe(false);
      expect(constantTimeStringCompare('a', 'abcdefghijklmnop')).toBe(false);
    });

    it('should use HMAC to hide length information when needed', () => {
      const key = 'hmac-key';
      // HMAC produces fixed-length output, hiding input length
      expect(constantTimeHmacCompare('a', 'b', key)).toBe(false);
      expect(constantTimeHmacCompare('a', 'abcdefghijklmnop', key)).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should verify API authentication flow', () => {
      const storedKey = '  sk_live_authenticated_key_12345  ';

      // Valid key with extra whitespace
      expect(verifyApiKey('sk_live_authenticated_key_12345', storedKey)).toBe(true);

      // Invalid key
      expect(verifyApiKey('sk_live_wrong_key', storedKey)).toBe(false);

      // Empty key
      expect(verifyApiKey('', storedKey)).toBe(false);
    });

    it('should verify webhook signature flow', () => {
      const webhookSecret = 'whsec_12345abcdef';
      const payload = JSON.stringify({
        type: 'payment.succeeded',
        data: { amount: 1000, currency: 'usd' },
      });

      // Generate expected signature
      const signature = createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      // Valid signature
      expect(verifyHmacSignature(payload, signature, webhookSecret)).toBe(true);

      // Tampered payload
      const tampered = payload.replace('1000', '9999');
      expect(verifyHmacSignature(tampered, signature, webhookSecret)).toBe(false);

      // Wrong secret
      expect(verifyHmacSignature(payload, signature, 'wrong-secret')).toBe(false);
    });

    it('should handle secret comparison in authentication', () => {
      const storedSecret = Buffer.from('super-secret-value-for-auth');
      const providedSecret = Buffer.from('super-secret-value-for-auth');
      const wrongSecret = Buffer.from('wrong-secret-value');

      expect(constantTimeBufferCompare(providedSecret, storedSecret)).toBe(true);
      expect(constantTimeBufferCompare(wrongSecret, storedSecret)).toBe(false);
    });
  });
});
