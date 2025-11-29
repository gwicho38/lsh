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
     * Helper to get team
     */
    private getTeamById;
    /**
     * Map database secret to Secret type
     */
    private mapDbSecretToSecret;
}
/**
 * Singleton instance
 */
export declare const secretsService: SecretsService;
