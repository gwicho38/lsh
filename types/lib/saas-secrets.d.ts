/**
 * LSH SaaS Secrets Management Service
 * Multi-tenant secrets with per-team encryption
 */
import { type Secret, type CreateSecretInput, type UpdateSecretInput, type SecretSummary } from './saas-types.js';
/**
 * Secrets Service
 */
export declare class SecretsService {
    private supabase;
    /**
     * Create a new secret
     */
    createSecret(input: CreateSecretInput): Promise<Secret>;
    /**
     * Get secret by ID
     */
    getSecretById(id: string, decrypt?: boolean): Promise<Secret | null>;
    /**
     * Get secrets for team/environment
     */
    getTeamSecrets(teamId: string, environment?: string, decrypt?: boolean): Promise<Secret[]>;
    /**
     * Update secret
     */
    updateSecret(id: string, input: UpdateSecretInput): Promise<Secret>;
    /**
     * Delete secret (soft delete)
     */
    deleteSecret(id: string, deletedBy: string): Promise<void>;
    /**
     * Get secrets summary by team
     */
    getSecretsSummary(teamId: string): Promise<SecretSummary[]>;
    /**
     * Export secrets to .env format
     */
    exportToEnv(teamId: string, environment: string): Promise<string>;
    /**
     * Import secrets from .env format
     */
    importFromEnv(teamId: string, environment: string, envContent: string, createdBy: string): Promise<{
        created: number;
        updated: number;
        errors: string[];
    }>;
    /**
     * Check secrets limit for tier
     */
    private checkSecretsLimit;
    /**
     * Helper to get team record from database.
     *
     * Fetches raw team record from 'teams' table. Used internally to get
     * organization_id for audit logging and tier limit checks.
     *
     * @param teamId - UUID of team to fetch
     * @returns Raw Supabase team record or null if not found
     * @see DbTeamRecord in database-types.ts for return shape
     */
    private getTeamById;
    /**
     * Transform Supabase secret record to domain model.
     *
     * Maps database snake_case columns to TypeScript camelCase properties:
     * - `team_id` → `teamId`
     * - `encrypted_value` → `encryptedValue` (AES-256 encrypted)
     * - `encryption_key_id` → `encryptionKeyId` (FK to team's encryption key)
     * - `last_rotated_at` → `lastRotatedAt` (nullable Date)
     * - `rotation_interval_days` → `rotationIntervalDays` (nullable number)
     * - `created_by` → `createdBy` (FK to users.id)
     * - `updated_by` → `updatedBy` (FK to users.id)
     * - `deleted_by` → `deletedBy` (FK to users.id, for soft delete audit)
     *
     * Special handling:
     * - `tags`: Parses JSON string to string[] if stored as string, passes through if already array
     *
     * Note: The `encryptedValue` field contains the encrypted secret. Use
     * `encryptionService.decryptForTeam()` to decrypt it when needed.
     *
     * @param dbSecret - Supabase record from 'secrets' table
     * @returns Domain Secret object with parsed tags
     * @see DbSecretRecord in database-types.ts for input shape
     * @see Secret in saas-types.ts for output shape
     */
    private mapDbSecretToSecret;
}
/**
 * Singleton instance
 */
export declare const secretsService: SecretsService;
