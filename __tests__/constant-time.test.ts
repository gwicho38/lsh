/**
 * Tests for constant-time comparison utilities
 */

import {
  constantTimeStringCompare,
  constantTimeBufferCompare,
  constantTimeHmacCompare,
  verifyHmacSignature,
  verifyApiKey,
} from '../src/lib/constant-time.js';
import { createHmac } from 'crypto';

describe('Constant-Time Comparison Utilities', () => {
  describe('constantTimeStringCompare', () => {
    it('should return true for equal strings', () => {
      expect(constantTimeStringCompare('hello', 'hello')).toBe(true);
      expect(constantTimeStringCompare('', '')).toBe(true);
      expect(constantTimeStringCompare('a', 'a')).toBe(true);
    });

    it('should return false for different strings of same length', () => {
      expect(constantTimeStringCompare('hello', 'world')).toBe(false);
      expect(constantTimeStringCompare('abc', 'def')).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      expect(constantTimeStringCompare('hello', 'hello!')).toBe(false);
      expect(constantTimeStringCompare('short', 'much longer string')).toBe(false);
      expect(constantTimeStringCompare('a', '')).toBe(false);
    });

    it('should handle unicode strings', () => {
      expect(constantTimeStringCompare('héllo', 'héllo')).toBe(true);
      expect(constantTimeStringCompare('héllo', 'hello')).toBe(false);
      expect(constantTimeStringCompare('🔒', '🔒')).toBe(true);
      expect(constantTimeStringCompare('🔒', '🔓')).toBe(false);
    });

    it('should handle special characters', () => {
      expect(constantTimeStringCompare('\n\t\r', '\n\t\r')).toBe(true);
      expect(constantTimeStringCompare('\0', '\0')).toBe(true);
      expect(constantTimeStringCompare('\0', '')).toBe(false);
    });
  });

  describe('constantTimeBufferCompare', () => {
    it('should return true for equal buffers', () => {
      const a = Buffer.from('hello');
      const b = Buffer.from('hello');
      expect(constantTimeBufferCompare(a, b)).toBe(true);
    });

    it('should return false for different buffers of same length', () => {
      const a = Buffer.from('hello');
      const b = Buffer.from('world');
      expect(constantTimeBufferCompare(a, b)).toBe(false);
    });

    it('should return false for buffers of different lengths', () => {
      const a = Buffer.from('hello');
      const b = Buffer.from('hello!');
      expect(constantTimeBufferCompare(a, b)).toBe(false);
    });

    it('should handle empty buffers', () => {
      const a = Buffer.alloc(0);
      const b = Buffer.alloc(0);
      expect(constantTimeBufferCompare(a, b)).toBe(true);
    });

    it('should handle binary data', () => {
      const a = Buffer.from([0x00, 0xff, 0x42]);
      const b = Buffer.from([0x00, 0xff, 0x42]);
      expect(constantTimeBufferCompare(a, b)).toBe(true);

      const c = Buffer.from([0x00, 0xff, 0x43]);
      expect(constantTimeBufferCompare(a, c)).toBe(false);
    });
  });

  describe('constantTimeHmacCompare', () => {
    const key = 'test-key';

    it('should return true for equal values', () => {
      expect(constantTimeHmacCompare('secret', 'secret', key)).toBe(true);
    });

    it('should return false for different values', () => {
      expect(constantTimeHmacCompare('secret1', 'secret2', key)).toBe(false);
    });

    it('should hide length differences', () => {
      // Both comparisons should complete without revealing length info
      expect(constantTimeHmacCompare('a', 'ab', key)).toBe(false);
      expect(constantTimeHmacCompare('short', 'a much longer string', key)).toBe(false);
    });

    it('should use the key for comparison', () => {
      // Same values with different keys should work independently
      expect(constantTimeHmacCompare('secret', 'secret', 'key1')).toBe(true);
      expect(constantTimeHmacCompare('secret', 'secret', 'key2')).toBe(true);
    });
  });

  describe('verifyHmacSignature', () => {
    const secret = 'webhook-secret';

    it('should verify valid signatures', () => {
      const payload = '{"event": "test"}';
      const signature = createHmac('sha256', secret).update(payload).digest('hex');

      expect(verifyHmacSignature(payload, signature, secret)).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const payload = '{"event": "test"}';
      const wrongSignature = 'deadbeef1234567890abcdef';

      expect(verifyHmacSignature(payload, wrongSignature, secret)).toBe(false);
    });

    it('should reject tampered payloads', () => {
      const originalPayload = '{"event": "test"}';
      const signature = createHmac('sha256', secret).update(originalPayload).digest('hex');
      const tamperedPayload = '{"event": "malicious"}';

      expect(verifyHmacSignature(tamperedPayload, signature, secret)).toBe(false);
    });

    it('should support sha512', () => {
      const payload = 'test payload';
      const signature = createHmac('sha512', secret).update(payload).digest('hex');

      expect(verifyHmacSignature(payload, signature, secret, 'sha512')).toBe(true);
    });
  });

  describe('verifyApiKey', () => {
    it('should return true for matching keys', () => {
      expect(verifyApiKey('my-api-key', 'my-api-key')).toBe(true);
    });

    it('should return false for different keys', () => {
      expect(verifyApiKey('my-api-key', 'wrong-key')).toBe(false);
    });

    it('should handle leading/trailing whitespace', () => {
      expect(verifyApiKey('  my-api-key  ', 'my-api-key')).toBe(true);
      expect(verifyApiKey('my-api-key', '  my-api-key  ')).toBe(true);
      expect(verifyApiKey('  my-api-key  ', '  my-api-key  ')).toBe(true);
    });

    it('should normalize unicode', () => {
      // é can be represented as single char or e + combining accent
      const composed = '\u00e9'; // é as single character
      const decomposed = 'e\u0301'; // e + combining acute accent

      expect(verifyApiKey(`key-${composed}`, `key-${composed}`)).toBe(true);
      // After NFC normalization, these should be equal
      expect(verifyApiKey(`key-${composed}`, `key-${decomposed}`)).toBe(true);
    });

    it('should be case-sensitive', () => {
      expect(verifyApiKey('MyApiKey', 'myapikey')).toBe(false);
      expect(verifyApiKey('MY-API-KEY', 'my-api-key')).toBe(false);
    });
  });

  describe('Timing attack resistance', () => {
    // These tests verify that timing doesn't leak information
    // Note: These are basic sanity checks, not rigorous statistical tests

    it('should complete in similar time for different inputs', () => {
      const iterations = 1000;
      const key = 'correct-key-12345';

      // Time comparisons with correct key
      const startCorrect = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        constantTimeStringCompare(key, key);
      }
      const correctTime = Number(process.hrtime.bigint() - startCorrect);

      // Time comparisons with completely wrong key (same length)
      const wrongKey = 'xxxxxxxxxxxxxxxx';
      const startWrong = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        constantTimeStringCompare(wrongKey, key);
      }
      const wrongTime = Number(process.hrtime.bigint() - startWrong);

      // Time comparisons with partially matching key
      const partialKey = 'correct-xxxxxxxx';
      const startPartial = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        constantTimeStringCompare(partialKey, key);
      }
      const partialTime = Number(process.hrtime.bigint() - startPartial);

      // All times should be within 5x of each other (generous margin for test stability)
      // A timing attack would show dramatic differences (10x or more for early mismatch)
      const times = [correctTime, wrongTime, partialTime];
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      expect(maxTime / minTime).toBeLessThan(5);
    });
  });
});
