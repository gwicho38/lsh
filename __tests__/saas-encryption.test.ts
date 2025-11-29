/**
 * SaaS Encryption Service Tests
 * Tests for the EncryptionService class and helper functions
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, jest } from '@jest/globals';
import { randomBytes } from 'crypto';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

jest.mock('../src/lib/supabase-client.js', () => ({
  getSupabaseClient: () => mockSupabase,
}));

// Store original env
const originalEnv = { ...process.env };

describe('SaaS Encryption Service', () => {
  let EncryptionService: typeof import('../src/lib/saas-encryption.js').EncryptionService;
  let encryptionService: InstanceType<typeof EncryptionService>;

  beforeAll(async () => {
    // Reset modules to ensure our mock is applied fresh
    jest.resetModules();

    // Re-establish the mock after reset
    jest.doMock('../src/lib/supabase-client.js', () => ({
      getSupabaseClient: () => mockSupabase,
    }));

    // Set required env var before importing
    process.env.LSH_MASTER_KEY = randomBytes(32).toString('hex');

    const module = await import('../src/lib/saas-encryption.js');
    EncryptionService = module.EncryptionService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset env for each test
    process.env.LSH_MASTER_KEY = randomBytes(32).toString('hex');
    encryptionService = new EncryptionService();
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('Master Key Handling', () => {
    it('should use LSH_MASTER_KEY if set', () => {
      const masterKey = randomBytes(32).toString('hex');
      process.env.LSH_MASTER_KEY = masterKey;
      delete process.env.LSH_SECRETS_KEY;

      // Should not throw
      expect(() => new EncryptionService()).not.toThrow();
    });

    it('should fall back to LSH_SECRETS_KEY if LSH_MASTER_KEY not set', () => {
      delete process.env.LSH_MASTER_KEY;
      process.env.LSH_SECRETS_KEY = randomBytes(32).toString('hex');

      // Should not throw
      expect(() => new EncryptionService()).not.toThrow();
    });

    it('should throw if neither key is set', async () => {
      // Store current keys
      const savedMasterKey = process.env.LSH_MASTER_KEY;
      const savedSecretsKey = process.env.LSH_SECRETS_KEY;

      try {
        delete process.env.LSH_MASTER_KEY;
        delete process.env.LSH_SECRETS_KEY;

        // Need to re-import to get fresh module
        jest.resetModules();

        // Re-mock after reset
        jest.doMock('../src/lib/supabase-client.js', () => ({
          getSupabaseClient: () => mockSupabase,
        }));

        // The module will throw when loaded due to singleton initialization
        await expect(import('../src/lib/saas-encryption.js')).rejects.toThrow(
          /LSH_MASTER_KEY or LSH_SECRETS_KEY/
        );
      } finally {
        // Restore for other tests
        if (savedMasterKey) process.env.LSH_MASTER_KEY = savedMasterKey;
        if (savedSecretsKey) process.env.LSH_SECRETS_KEY = savedSecretsKey;
        else process.env.LSH_MASTER_KEY = randomBytes(32).toString('hex');
      }
    });

    it('should derive key from non-hex string using PBKDF2', () => {
      // Use a regular string instead of hex
      process.env.LSH_MASTER_KEY = 'my-password-based-master-key';

      // Should not throw - will derive key using PBKDF2
      expect(() => new EncryptionService()).not.toThrow();
    });
  });

  describe('Team Key Generation', () => {
    it('should generate a new team key', async () => {
      const teamId = 'team-123';
      const createdBy = 'user-456';

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'key-789',
          team_id: teamId,
          encrypted_key: 'encrypted-key-data',
          key_version: 1,
          algorithm: 'aes-256-cbc',
          is_active: true,
          created_by: createdBy,
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      mockSupabase.eq.mockReturnValueOnce({
        then: (resolve: (result: { error: null }) => void) => resolve({ error: null }),
      });

      const key = await encryptionService.generateTeamKey(teamId, createdBy);

      expect(key).toBeDefined();
      expect(key.teamId).toBe(teamId);
      expect(key.keyVersion).toBe(1);
      expect(key.isActive).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('encryption_keys');
    });

    it('should throw error if database insert fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        encryptionService.generateTeamKey('team-123', 'user-456')
      ).rejects.toThrow('Failed to create encryption key');
    });
  });

  describe('Team Key Retrieval', () => {
    it('should get active team key', async () => {
      const teamId = 'team-123';

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'key-789',
          team_id: teamId,
          encrypted_key: 'iv-hex:encrypted-data',
          key_version: 1,
          algorithm: 'aes-256-cbc',
          is_active: true,
          created_by: 'user-456',
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      const key = await encryptionService.getTeamKey(teamId);

      expect(key).toBeDefined();
      expect(key?.teamId).toBe(teamId);
      expect(key?.isActive).toBe(true);
    });

    it('should return null for non-existent team', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const key = await encryptionService.getTeamKey('nonexistent');

      expect(key).toBeNull();
    });
  });

  describe('Data Encryption/Decryption', () => {
    it('should encrypt and decrypt data for a team', async () => {
      const teamId = 'team-123';
      const plaintext = 'sensitive data to encrypt';

      // Generate a valid encrypted key format
      const teamKey = randomBytes(32);
      const iv = randomBytes(16);
      const { createCipheriv } = await import('crypto');
      const cipher = createCipheriv('aes-256-cbc', encryptionService['masterKey'], iv);
      let encryptedTeamKey = cipher.update(teamKey);
      encryptedTeamKey = Buffer.concat([encryptedTeamKey, cipher.final()]);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'key-789',
          team_id: teamId,
          encrypted_key: iv.toString('hex') + ':' + encryptedTeamKey.toString('hex'),
          key_version: 1,
          algorithm: 'aes-256-cbc',
          is_active: true,
          created_by: 'user-456',
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      const encrypted = await encryptionService.encryptForTeam(teamId, plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).toContain(':'); // IV:data format
      expect(encrypted).not.toBe(plaintext);

      const decrypted = await encryptionService.decryptForTeam(teamId, encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid encrypted data format', async () => {
      const teamId = 'team-123';

      // Generate valid team key
      const teamKey = randomBytes(32);
      const iv = randomBytes(16);
      const { createCipheriv } = await import('crypto');
      const cipher = createCipheriv('aes-256-cbc', encryptionService['masterKey'], iv);
      let encryptedTeamKey = cipher.update(teamKey);
      encryptedTeamKey = Buffer.concat([encryptedTeamKey, cipher.final()]);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'key-789',
          team_id: teamId,
          encrypted_key: iv.toString('hex') + ':' + encryptedTeamKey.toString('hex'),
          key_version: 1,
          algorithm: 'aes-256-cbc',
          is_active: true,
          created_by: 'user-456',
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      await expect(
        encryptionService.decryptForTeam(teamId, 'invalid-format-no-colon')
      ).rejects.toThrow('Invalid encrypted data format');
    });

    it('should throw error when no team key exists', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      await expect(
        encryptionService.encryptForTeam('nonexistent-team', 'data')
      ).rejects.toThrow('No active encryption key found');
    });
  });

  describe('Key Rotation', () => {
    it('should rotate team key with incremented version', async () => {
      const teamId = 'team-123';
      const rotatedBy = 'user-456';

      // Create a fresh mock with proper chaining for rotation
      const rotationMock = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn(),
        single: jest.fn(),
      };

      // Mock sequence for rotateTeamKey:
      // 1. Get current key version
      rotationMock.limit.mockResolvedValueOnce({
        data: [{ key_version: 2 }],
        error: null,
      });

      // 2. Mark old keys inactive (returns from eq chain)
      rotationMock.eq.mockImplementation(() => rotationMock);

      // 3. Insert new key
      rotationMock.single.mockResolvedValueOnce({
        data: {
          id: 'key-new',
          team_id: teamId,
          encrypted_key: 'new-encrypted-key',
          key_version: 3,
          algorithm: 'aes-256-cbc',
          is_active: true,
          created_by: rotatedBy,
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      // Create a new service instance that uses our rotation mock
      const savedMasterKey = process.env.LSH_MASTER_KEY;
      process.env.LSH_MASTER_KEY = randomBytes(32).toString('hex');

      jest.resetModules();
      jest.doMock('../src/lib/supabase-client.js', () => ({
        getSupabaseClient: () => rotationMock,
      }));

      const { EncryptionService: RotationService } = await import('../src/lib/saas-encryption.js');
      const rotationEncryptionService = new RotationService();

      const newKey = await rotationEncryptionService.rotateTeamKey(teamId, rotatedBy);

      expect(newKey).toBeDefined();
      expect(newKey.keyVersion).toBe(3);
      expect(newKey.isActive).toBe(true);

      // Restore
      process.env.LSH_MASTER_KEY = savedMasterKey!;
    });
  });
});
