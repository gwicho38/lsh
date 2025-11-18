/**
 * LSH SaaS Per-Team Encryption Service
 * Manages encryption keys for each team
 */
import type { EncryptionKey } from './saas-types.js';
/**
 * Encryption Service
 */
export declare class EncryptionService {
    private supabase;
    private masterKey;
    constructor();
    /**
     * Generate a new encryption key for a team
     */
    generateTeamKey(teamId: string, createdBy: string): Promise<EncryptionKey>;
    /**
     * Rotate team encryption key
     */
    rotateTeamKey(teamId: string, rotatedBy: string): Promise<EncryptionKey>;
    /**
     * Get active encryption key for a team
     */
    getTeamKey(teamId: string): Promise<EncryptionKey | null>;
    /**
     * Get decrypted team key (for encryption/decryption operations)
     */
    getDecryptedTeamKey(teamId: string): Promise<Buffer>;
    /**
     * Encrypt data with team's key
     */
    encryptForTeam(teamId: string, data: string): Promise<string>;
    /**
     * Decrypt data with team's key
     */
    decryptForTeam(teamId: string, encryptedData: string): Promise<string>;
    /**
     * Encrypt team key with master key
     */
    private encryptWithMasterKey;
    /**
     * Decrypt team key with master key
     */
    private decryptWithMasterKey;
    /**
     * Map database key to EncryptionKey type
     */
    private mapDbKeyToKey;
}
/**
 * Singleton instance
 */
export declare const encryptionService: EncryptionService;
