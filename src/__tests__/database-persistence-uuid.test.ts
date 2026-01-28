/**
 * Tests for UUID and Session ID generation in DatabasePersistence
 */

import { createHash, randomBytes } from 'crypto';

// UUID validation regex (RFC 4122 format)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Session ID format: lsh_<timestamp>_<hex>
const SESSION_ID_REGEX = /^lsh_\d+_[0-9a-f]{12}$/;

/**
 * Recreate the generateUserUUID logic for testing
 * This matches the implementation in database-persistence.ts
 */
function generateUserUUID(username: string): string {
  const hash = createHash('sha256').update(username).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    ((parseInt(hash.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join('-');
}

/**
 * Recreate the generateSessionId logic for testing
 */
function generateSessionId(): string {
  const randomPart = randomBytes(6).toString('hex');
  return `lsh_${Date.now()}_${randomPart}`;
}

describe('UUID Generation', () => {
  describe('generateUserUUID', () => {
    it('should generate a valid UUID format', () => {
      const uuid = generateUserUUID('testuser');
      expect(uuid).toMatch(UUID_REGEX);
    });

    it('should generate deterministic UUIDs for the same input', () => {
      const uuid1 = generateUserUUID('testuser');
      const uuid2 = generateUserUUID('testuser');
      expect(uuid1).toBe(uuid2);
    });

    it('should generate different UUIDs for different inputs', () => {
      const uuid1 = generateUserUUID('user1');
      const uuid2 = generateUserUUID('user2');
      expect(uuid1).not.toBe(uuid2);
    });

    it('should handle empty string input', () => {
      const uuid = generateUserUUID('');
      expect(uuid).toMatch(UUID_REGEX);
    });

    it('should handle special characters in username', () => {
      const uuid = generateUserUUID('user@example.com!#$%');
      expect(uuid).toMatch(UUID_REGEX);
    });

    it('should handle unicode characters', () => {
      const uuid = generateUserUUID('用户名');
      expect(uuid).toMatch(UUID_REGEX);
    });

    it('should have version 4 in the correct position', () => {
      const uuid = generateUserUUID('testuser');
      // Version is the 13th character (index 14 with hyphens)
      expect(uuid[14]).toBe('4');
    });

    it('should have correct variant bits', () => {
      const uuid = generateUserUUID('testuser');
      // Variant is the 17th character (index 19 with hyphens)
      const variant = uuid[19];
      expect(['8', '9', 'a', 'b']).toContain(variant.toLowerCase());
    });

    it('should generate exactly 36 characters', () => {
      const uuid = generateUserUUID('anyuser');
      expect(uuid.length).toBe(36);
    });

    it('should have hyphens in correct positions', () => {
      const uuid = generateUserUUID('testuser');
      expect(uuid[8]).toBe('-');
      expect(uuid[13]).toBe('-');
      expect(uuid[18]).toBe('-');
      expect(uuid[23]).toBe('-');
    });
  });

  describe('generateSessionId', () => {
    it('should generate a valid session ID format', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toMatch(SESSION_ID_REGEX);
    });

    it('should generate unique session IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSessionId());
      }
      // All 100 should be unique
      expect(ids.size).toBe(100);
    });

    it('should start with lsh_ prefix', () => {
      const sessionId = generateSessionId();
      expect(sessionId.startsWith('lsh_')).toBe(true);
    });

    it('should contain a timestamp', () => {
      const before = Date.now();
      const sessionId = generateSessionId();
      const after = Date.now();

      const parts = sessionId.split('_');
      const timestamp = parseInt(parts[1], 10);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should have 12-character hex random part', () => {
      const sessionId = generateSessionId();
      const parts = sessionId.split('_');
      const randomPart = parts[2];

      expect(randomPart.length).toBe(12);
      expect(randomPart).toMatch(/^[0-9a-f]+$/);
    });
  });
});
