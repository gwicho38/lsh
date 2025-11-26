/**
 * LSH SaaS Secrets Management Service
 * Multi-tenant secrets with per-team encryption
 */

import type {
  Secret,
  CreateSecretInput,
  UpdateSecretInput,
  SecretSummary,
} from './saas-types.js';
import { getSupabaseClient } from './supabase-client.js';
import { encryptionService } from './saas-encryption.js';
import { auditLogger } from './saas-audit.js';
import { organizationService } from './saas-organizations.js';

/**
 * Secrets Service
 */
export class SecretsService {
  private supabase = getSupabaseClient();

  /**
   * Create a new secret
   */
  async createSecret(input: CreateSecretInput): Promise<Secret> {
    // Check tier limits
    await this.checkSecretsLimit(input.teamId);

    // Get or create encryption key for team
    let encryptionKey = await encryptionService.getTeamKey(input.teamId);
    if (!encryptionKey) {
      // Auto-create encryption key for team
      const team = await this.getTeamById(input.teamId);
      if (!team) {
        throw new Error('Team not found');
      }
      encryptionKey = await encryptionService.generateTeamKey(input.teamId, input.createdBy);
    }

    // Encrypt the secret value
    const encryptedValue = await encryptionService.encryptForTeam(input.teamId, input.value);

    // Store secret
    const { data, error } = await this.supabase
      .from('secrets')
      .insert({
        team_id: input.teamId,
        environment: input.environment,
        key: input.key,
        encrypted_value: encryptedValue,
        encryption_key_id: encryptionKey.id,
        description: input.description || null,
        tags: JSON.stringify(input.tags || []),
        rotation_interval_days: input.rotationIntervalDays || null,
        created_by: input.createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create secret: ${error.message}`);
    }

    // Audit log
    const team = await this.getTeamById(input.teamId);
    if (team) {
      await auditLogger.log({
        organizationId: team.organization_id,
        teamId: input.teamId,
        userId: input.createdBy,
        action: 'secret.create',
        resourceType: 'secret',
        resourceId: data.id,
        newValue: {
          key: input.key,
          environment: input.environment,
        },
      });
    }

    return this.mapDbSecretToSecret(data);
  }

  /**
   * Get secret by ID
   */
  async getSecretById(id: string, decrypt = false): Promise<Secret | null> {
    const { data, error } = await this.supabase
      .from('secrets')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return null;
    }

    const secret = this.mapDbSecretToSecret(data);

    // Decrypt if requested
    if (decrypt) {
      const decryptedValue = await encryptionService.decryptForTeam(
        secret.teamId,
        secret.encryptedValue
      );
      return { ...secret, encryptedValue: decryptedValue };
    }

    return secret;
  }

  /**
   * Get secrets for team/environment
   */
  async getTeamSecrets(
    teamId: string,
    environment?: string,
    decrypt = false
  ): Promise<Secret[]> {
    let query = this.supabase
      .from('secrets')
      .select('*')
      .eq('team_id', teamId)
      .is('deleted_at', null);

    if (environment) {
      query = query.eq('environment', environment);
    }

    query = query.order('key', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get secrets: ${error.message}`);
    }

    const secrets = (data || []).map(this.mapDbSecretToSecret);

    // Decrypt if requested
    if (decrypt) {
      return Promise.all(
        secrets.map(async (secret) => {
          try {
            const decryptedValue = await encryptionService.decryptForTeam(
              teamId,
              secret.encryptedValue
            );
            return { ...secret, encryptedValue: decryptedValue };
          } catch (error) {
            console.error(`Failed to decrypt secret ${secret.id}:`, error);
            return secret;
          }
        })
      );
    }

    return secrets;
  }

  /**
   * Update secret
   */
  async updateSecret(id: string, input: UpdateSecretInput): Promise<Secret> {
    const secret = await this.getSecretById(id);
    if (!secret) {
      throw new Error('Secret not found');
    }

    const updateData: any = {
      updated_by: input.updatedBy,
      updated_at: new Date().toISOString(),
    };

    // Encrypt new value if provided
    if (input.value) {
      updateData.encrypted_value = await encryptionService.encryptForTeam(
        secret.teamId,
        input.value
      );
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.tags) {
      updateData.tags = JSON.stringify(input.tags);
    }

    if (input.rotationIntervalDays !== undefined) {
      updateData.rotation_interval_days = input.rotationIntervalDays;
    }

    const { data, error } = await this.supabase
      .from('secrets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update secret: ${error.message}`);
    }

    // Audit log
    const team = await this.getTeamById(secret.teamId);
    if (team) {
      await auditLogger.log({
        organizationId: team.organization_id,
        teamId: secret.teamId,
        userId: input.updatedBy,
        action: 'secret.update',
        resourceType: 'secret',
        resourceId: id,
        oldValue: { description: secret.description },
        newValue: { description: input.description },
      });
    }

    return this.mapDbSecretToSecret(data);
  }

  /**
   * Delete secret (soft delete)
   */
  async deleteSecret(id: string, deletedBy: string): Promise<void> {
    const secret = await this.getSecretById(id);
    if (!secret) {
      throw new Error('Secret not found');
    }

    const { error } = await this.supabase
      .from('secrets')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete secret: ${error.message}`);
    }

    // Audit log
    const team = await this.getTeamById(secret.teamId);
    if (team) {
      await auditLogger.log({
        organizationId: team.organization_id,
        teamId: secret.teamId,
        userId: deletedBy,
        action: 'secret.delete',
        resourceType: 'secret',
        resourceId: id,
        oldValue: {
          key: secret.key,
          environment: secret.environment,
        },
      });
    }
  }

  /**
   * Get secrets summary by team
   */
  async getSecretsSummary(teamId: string): Promise<SecretSummary[]> {
    const { data, error } = await this.supabase
      .from('secrets_summary')
      .select('*')
      .eq('team_id', teamId);

    if (error) {
      throw new Error(`Failed to get secrets summary: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      teamId: row.team_id,
      teamName: row.team_name,
      environment: row.environment,
      secretsCount: row.secrets_count || 0,
      lastUpdated: row.last_updated ? new Date(row.last_updated) : null,
    }));
  }

  /**
   * Export secrets to .env format
   */
  async exportToEnv(teamId: string, environment: string): Promise<string> {
    const secrets = await this.getTeamSecrets(teamId, environment, true);

    const envLines = secrets.map((secret) => {
      // Escape special characters in values (backslashes first, then quotes)
      const value = secret.encryptedValue.includes(' ')
        ? `"${secret.encryptedValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
        : secret.encryptedValue;

      const comment = secret.description ? `# ${secret.description}\n` : '';
      return `${comment}${secret.key}=${value}`;
    });

    return envLines.join('\n');
  }

  /**
   * Import secrets from .env format
   */
  async importFromEnv(
    teamId: string,
    environment: string,
    envContent: string,
    createdBy: string
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    const lines = envContent.split('\n');
    const secrets: { key: string; value: string; description?: string }[] = [];
    let currentDescription = '';

    // Parse .env file
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        currentDescription = '';
        continue;
      }

      // Comment line (description)
      if (trimmed.startsWith('#')) {
        currentDescription = trimmed.substring(1).trim();
        continue;
      }

      // Key=value line
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        let value = match[2];

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        secrets.push({
          key: match[1],
          value,
          description: currentDescription || undefined,
        });

        currentDescription = '';
      }
    }

    // Import secrets
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const secret of secrets) {
      try {
        // Check if secret already exists
        const { data: existing } = await this.supabase
          .from('secrets')
          .select('id')
          .eq('team_id', teamId)
          .eq('environment', environment)
          .eq('key', secret.key)
          .is('deleted_at', null)
          .single();

        if (existing) {
          // Update existing
          await this.updateSecret(existing.id, {
            value: secret.value,
            description: secret.description,
            updatedBy: createdBy,
          });
          updated++;
        } else {
          // Create new
          await this.createSecret({
            teamId,
            environment,
            key: secret.key,
            value: secret.value,
            description: secret.description,
            createdBy,
          });
          created++;
        }
      } catch (error: any) {
        errors.push(`${secret.key}: ${error.message}`);
      }
    }

    return { created, updated, errors };
  }

  /**
   * Check secrets limit for tier
   */
  private async checkSecretsLimit(teamId: string): Promise<void> {
    const team = await this.getTeamById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const org = await organizationService.getOrganizationById(team.organization_id);
    if (!org) {
      throw new Error('Organization not found');
    }

    const usage = await organizationService.getUsageSummary(team.organization_id);
    const { TIER_LIMITS } = await import('./saas-types.js');
    const limits = TIER_LIMITS[org.subscriptionTier];

    if (usage.secretCount >= limits.secrets) {
      throw new Error(
        'TIER_LIMIT_EXCEEDED: Secret limit reached. Please upgrade your plan.'
      );
    }
  }

  /**
   * Helper to get team
   */
  private async getTeamById(teamId: string): Promise<any> {
    const { data } = await this.supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();
    return data;
  }

  /**
   * Map database secret to Secret type
   */
  private mapDbSecretToSecret(dbSecret: any): Secret {
    return {
      id: dbSecret.id,
      teamId: dbSecret.team_id,
      environment: dbSecret.environment,
      key: dbSecret.key,
      encryptedValue: dbSecret.encrypted_value,
      encryptionKeyId: dbSecret.encryption_key_id,
      description: dbSecret.description,
      tags: typeof dbSecret.tags === 'string' ? JSON.parse(dbSecret.tags) : (dbSecret.tags || []),
      lastRotatedAt: dbSecret.last_rotated_at ? new Date(dbSecret.last_rotated_at) : null,
      rotationIntervalDays: dbSecret.rotation_interval_days,
      createdAt: new Date(dbSecret.created_at),
      createdBy: dbSecret.created_by,
      updatedAt: new Date(dbSecret.updated_at),
      updatedBy: dbSecret.updated_by,
      deletedAt: dbSecret.deleted_at ? new Date(dbSecret.deleted_at) : null,
      deletedBy: dbSecret.deleted_by,
    };
  }
}

/**
 * Singleton instance
 */
export const secretsService = new SecretsService();
