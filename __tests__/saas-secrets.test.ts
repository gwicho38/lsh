/**
 * SaaS Secrets Service Tests
 * Tests for the SecretsService class
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, jest } from '@jest/globals';

// Create mock with proper chaining
let mockSingleFn: jest.Mock;
let mockOrderFn: jest.Mock;

const createMockSupabase = () => {
  mockSingleFn = jest.fn();
  mockOrderFn = jest.fn();

  const mockChain: Record<string, jest.Mock> = {
    from: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    select: jest.fn(),
    eq: jest.fn(),
    is: jest.fn(),
    order: mockOrderFn,
    single: mockSingleFn,
  };

  // Each method returns the chain for fluent API
  mockChain.from.mockImplementation(() => mockChain);
  mockChain.insert.mockImplementation(() => mockChain);
  mockChain.update.mockImplementation(() => mockChain);
  mockChain.select.mockImplementation(() => mockChain);
  mockChain.eq.mockImplementation(() => mockChain);
  mockChain.is.mockImplementation(() => mockChain);
  mockChain.order.mockImplementation(() => mockChain);

  return mockChain;
};

let mockSupabase = createMockSupabase();

jest.mock('../src/lib/supabase-client.js', () => ({
  get getSupabaseClient() {
    return () => mockSupabase;
  },
}));

// Mock encryption service
jest.mock('../src/lib/saas-encryption.js', () => ({
  encryptionService: {
    getTeamKey: jest.fn().mockResolvedValue({
      id: 'key-123',
      teamId: 'team-123',
      encryptedKey: 'encrypted-key',
      keyVersion: 1,
      isActive: true,
    }),
    generateTeamKey: jest.fn().mockResolvedValue({
      id: 'key-new',
      teamId: 'team-123',
      keyVersion: 1,
      isActive: true,
    }),
    encryptForTeam: jest.fn().mockResolvedValue('iv:encrypted-data'),
    decryptForTeam: jest.fn().mockResolvedValue('decrypted-value'),
  },
}));

// Mock audit logger
jest.mock('../src/lib/saas-audit.js', () => ({
  auditLogger: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock organizations service
jest.mock('../src/lib/saas-organizations.js', () => ({
  organizationService: {
    getOrganizationById: jest.fn().mockResolvedValue({
      id: 'org-123',
      subscriptionTier: 'pro',
    }),
    getUsageSummary: jest.fn().mockResolvedValue({
      secretCount: 10,
    }),
  },
}));

describe('SaaS Secrets Service', () => {
  let SecretsService: typeof import('../src/lib/saas-secrets.js').SecretsService;
  let secretsService: InstanceType<typeof SecretsService>;

  beforeAll(async () => {
    // Reset modules to ensure our mock is applied fresh
    jest.resetModules();

    // Re-establish the mock after reset
    jest.doMock('../src/lib/supabase-client.js', () => ({
      getSupabaseClient: () => mockSupabase,
    }));

    const module = await import('../src/lib/saas-secrets.js');
    SecretsService = module.SecretsService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
    secretsService = new SecretsService();
  });

  describe('createSecret', () => {
    it('should create a secret successfully', async () => {
      // Mock get team for tier check
      mockSingleFn.mockResolvedValueOnce({
        data: { id: 'team-123', organization_id: 'org-123' },
        error: null,
      });

      // Mock insert secret
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'secret-123',
          team_id: 'team-123',
          environment: 'dev',
          key: 'API_KEY',
          encrypted_value: 'iv:encrypted-data',
          encryption_key_id: 'key-123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'user-123',
        },
        error: null,
      });

      // Mock get team for audit log
      mockSingleFn.mockResolvedValueOnce({
        data: { id: 'team-123', organization_id: 'org-123' },
        error: null,
      });

      const secret = await secretsService.createSecret({
        teamId: 'team-123',
        environment: 'dev',
        key: 'API_KEY',
        value: 'sk_test_123',
        createdBy: 'user-123',
      });

      expect(secret).toBeDefined();
      expect(secret.key).toBe('API_KEY');
    });

    it('should throw error on database failure', async () => {
      // Mock get team
      mockSingleFn.mockResolvedValueOnce({
        data: { id: 'team-123', organization_id: 'org-123' },
        error: null,
      });

      // Mock insert fails
      mockSingleFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Duplicate key' },
      });

      await expect(
        secretsService.createSecret({
          teamId: 'team-123',
          environment: 'dev',
          key: 'API_KEY',
          value: 'sk_test_123',
          createdBy: 'user-123',
        })
      ).rejects.toThrow('Failed to create secret');
    });
  });

  describe('getSecretById', () => {
    it('should return secret', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'secret-123',
          team_id: 'team-123',
          environment: 'dev',
          key: 'API_KEY',
          encrypted_value: 'iv:encrypted-data',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      const secret = await secretsService.getSecretById('secret-123');

      expect(secret).toBeDefined();
      expect(secret?.id).toBe('secret-123');
    });

    it('should return null for non-existent secret', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const secret = await secretsService.getSecretById('nonexistent');

      expect(secret).toBeNull();
    });

    it('should decrypt when requested', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'secret-123',
          team_id: 'team-123',
          environment: 'dev',
          key: 'API_KEY',
          encrypted_value: 'iv:encrypted-data',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      const secret = await secretsService.getSecretById('secret-123', true);

      expect(secret).toBeDefined();
      expect(secret?.encryptedValue).toBe('decrypted-value');
    });
  });

  describe('getTeamSecrets', () => {
    it('should return secrets for team', async () => {
      mockOrderFn.mockResolvedValueOnce({
        data: [
          {
            id: 'secret-1',
            team_id: 'team-123',
            environment: 'dev',
            key: 'API_KEY',
            encrypted_value: 'encrypted',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'secret-2',
            team_id: 'team-123',
            environment: 'dev',
            key: 'DATABASE_URL',
            encrypted_value: 'encrypted',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      const secrets = await secretsService.getTeamSecrets('team-123');

      expect(secrets).toHaveLength(2);
    });

    it('should filter by environment', async () => {
      mockOrderFn.mockResolvedValueOnce({
        data: [
          {
            id: 'secret-1',
            team_id: 'team-123',
            environment: 'prod',
            key: 'API_KEY',
            encrypted_value: 'encrypted',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      const secrets = await secretsService.getTeamSecrets('team-123', 'prod');

      expect(secrets).toHaveLength(1);
      expect(mockSupabase.eq).toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      mockOrderFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(secretsService.getTeamSecrets('team-123')).rejects.toThrow(
        'Failed to get secrets'
      );
    });
  });

  describe('updateSecret', () => {
    it('should update secret value', async () => {
      // Get existing secret
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'secret-123',
          team_id: 'team-123',
          environment: 'dev',
          key: 'API_KEY',
          encrypted_value: 'old-encrypted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      // Update secret
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'secret-123',
          team_id: 'team-123',
          environment: 'dev',
          key: 'API_KEY',
          encrypted_value: 'new-encrypted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      // Get team for audit
      mockSingleFn.mockResolvedValueOnce({
        data: { id: 'team-123', organization_id: 'org-123' },
        error: null,
      });

      const secret = await secretsService.updateSecret('secret-123', {
        value: 'new-value',
        updatedBy: 'user-456',
      });

      expect(secret).toBeDefined();
    });

    it('should throw error for non-existent secret', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(
        secretsService.updateSecret('nonexistent', {
          value: 'new-value',
          updatedBy: 'user-456',
        })
      ).rejects.toThrow('Secret not found');
    });
  });

  describe('deleteSecret', () => {
    it('should soft delete secret', async () => {
      // Get existing secret (for getSecretById call)
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'secret-123',
          team_id: 'team-123',
          key: 'API_KEY',
          environment: 'dev',
          encrypted_value: 'encrypted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      // Get team for audit (for getTeamById call)
      mockSingleFn.mockResolvedValueOnce({
        data: { id: 'team-123', organization_id: 'org-123' },
        error: null,
      });

      // Need to handle .eq() as terminal for update call
      // Flow: getSecretById uses .eq().is().single(), update uses .eq() as terminal
      let eqCallCount = 0;
      mockSupabase.eq = jest.fn().mockImplementation(() => {
        eqCallCount++;
        // 2nd eq call is from update (terminal)
        if (eqCallCount === 2) {
          return Promise.resolve({ error: null });
        }
        // 1st and 3rd eq calls return chain
        return mockSupabase;
      }) as jest.Mock;

      await expect(secretsService.deleteSecret('secret-123', 'user-deleter')).resolves.not.toThrow();
    });

    it('should throw error for non-existent secret', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(secretsService.deleteSecret('nonexistent', 'user-deleter')).rejects.toThrow(
        'Secret not found'
      );
    });
  });

  describe('getSecretsSummary', () => {
    it('should return secrets summary', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: [
          {
            team_id: 'team-123',
            team_name: 'Engineering',
            environment: 'dev',
            secrets_count: 5,
            last_updated: new Date().toISOString(),
          },
          {
            team_id: 'team-123',
            team_name: 'Engineering',
            environment: 'prod',
            secrets_count: 10,
            last_updated: new Date().toISOString(),
          },
        ],
        error: null,
      });

      const summary = await secretsService.getSecretsSummary('team-123');

      expect(summary).toHaveLength(2);
      expect(summary[0].secretsCount).toBe(5);
    });
  });

  describe('exportToEnv', () => {
    it('should export secrets to env format', async () => {
      mockOrderFn.mockResolvedValueOnce({
        data: [
          {
            id: 'secret-1',
            team_id: 'team-123',
            environment: 'dev',
            key: 'API_KEY',
            encrypted_value: 'sk_test_123',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'secret-2',
            team_id: 'team-123',
            environment: 'dev',
            key: 'DATABASE_URL',
            encrypted_value: 'postgres://localhost',
            description: 'Main database',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      const envContent = await secretsService.exportToEnv('team-123', 'dev');

      expect(envContent).toContain('API_KEY=');
      expect(envContent).toContain('DATABASE_URL=');
    });
  });

  describe('importFromEnv', () => {
    it('should import secrets from env content', async () => {
      const envContent = `# Database config
DATABASE_URL=postgres://localhost/db
API_KEY=sk_test_123`;

      // For each secret: check existing, create/update
      // Check existing DATABASE_URL - not found
      mockSingleFn.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Get team for tier check (createSecret)
      mockSingleFn.mockResolvedValueOnce({
        data: { id: 'team-123', organization_id: 'org-123' },
        error: null,
      });

      // Create DATABASE_URL
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'secret-1',
          team_id: 'team-123',
          key: 'DATABASE_URL',
          encrypted_value: 'encrypted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      // Get team for audit
      mockSingleFn.mockResolvedValueOnce({
        data: { id: 'team-123', organization_id: 'org-123' },
        error: null,
      });

      // Check existing API_KEY - not found
      mockSingleFn.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Get team for tier check (createSecret)
      mockSingleFn.mockResolvedValueOnce({
        data: { id: 'team-123', organization_id: 'org-123' },
        error: null,
      });

      // Create API_KEY
      mockSingleFn.mockResolvedValueOnce({
        data: {
          id: 'secret-2',
          team_id: 'team-123',
          key: 'API_KEY',
          encrypted_value: 'encrypted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      // Get team for audit
      mockSingleFn.mockResolvedValueOnce({
        data: { id: 'team-123', organization_id: 'org-123' },
        error: null,
      });

      const result = await secretsService.importFromEnv('team-123', 'dev', envContent, 'user-123');

      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});
