/**
 * LSH SaaS Per-Team Encryption Service
 * Manages encryption keys for each team
 */

import { randomBytes, createCipheriv, createDecipheriv, createHash, pbkdf2Sync } from 'crypto';
import type { EncryptionKey, CreateEncryptionKeyInput } from './saas-types.js';
import { getSupabaseClient } from './supabase-client.js';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

/**
 * Get master encryption key from environment
 * This key is used to encrypt/decrypt team encryption keys
 */
function getMasterKey(): Buffer {
  const masterKeyHex = process.env.LSH_MASTER_KEY || process.env.LSH_SECRETS_KEY;

  if (!masterKeyHex) {
    throw new Error(
      'LSH_MASTER_KEY or LSH_SECRETS_KEY environment variable must be set for encryption'
    );
  }

  // If it's a hex string, convert it
  if (/^[0-9a-fA-F]+$/.test(masterKeyHex)) {
    return Buffer.from(masterKeyHex, 'hex');
  }

  // Otherwise, derive a key from it using PBKDF2
  const salt = createHash('sha256').update('lsh-saas-master-key-salt').digest();
  return pbkdf2Sync(masterKeyHex, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encryption Service
 */
export class EncryptionService {
  private supabase = getSupabaseClient();
  private masterKey: Buffer;

  constructor() {
    this.masterKey = getMasterKey();
  }

  /**
   * Generate a new encryption key for a team
   */
  async generateTeamKey(teamId: string, createdBy: string): Promise<EncryptionKey> {
    // Generate random key
    const teamKey = randomBytes(KEY_LENGTH);

    // Encrypt the team key with the master key
    const encryptedKey = this.encryptWithMasterKey(teamKey);

    // Store in database
    const { data, error } = await this.supabase
      .from('encryption_keys')
      .insert({
        team_id: teamId,
        encrypted_key: encryptedKey,
        key_version: 1,
        algorithm: ALGORITHM,
        is_active: true,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create encryption key: ${error.message}`);
    }

    // Update team to use this key
    await this.supabase
      .from('teams')
      .update({ encryption_key_id: data.id })
      .eq('id', teamId);

    return this.mapDbKeyToKey(data);
  }

  /**
   * Rotate team encryption key
   */
  async rotateTeamKey(teamId: string, rotatedBy: string): Promise<EncryptionKey> {
    // Get current key version
    const { data: currentKeys } = await this.supabase
      .from('encryption_keys')
      .select('key_version')
      .eq('team_id', teamId)
      .order('key_version', { ascending: false })
      .limit(1);

    const newVersion = currentKeys && currentKeys.length > 0 ? currentKeys[0].key_version + 1 : 1;

    // Mark old keys as inactive
    await this.supabase
      .from('encryption_keys')
      .update({
        is_active: false,
        rotated_at: new Date().toISOString(),
      })
      .eq('team_id', teamId)
      .eq('is_active', true);

    // Generate new key
    const teamKey = randomBytes(KEY_LENGTH);
    const encryptedKey = this.encryptWithMasterKey(teamKey);

    // Store new key
    const { data, error } = await this.supabase
      .from('encryption_keys')
      .insert({
        team_id: teamId,
        encrypted_key: encryptedKey,
        key_version: newVersion,
        algorithm: ALGORITHM,
        is_active: true,
        created_by: rotatedBy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to rotate encryption key: ${error.message}`);
    }

    // Update team
    await this.supabase
      .from('teams')
      .update({ encryption_key_id: data.id })
      .eq('id', teamId);

    return this.mapDbKeyToKey(data);
  }

  /**
   * Get active encryption key for a team
   */
  async getTeamKey(teamId: string): Promise<EncryptionKey | null> {
    const { data, error } = await this.supabase
      .from('encryption_keys')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapDbKeyToKey(data);
  }

  /**
   * Get decrypted team key (for encryption/decryption operations)
   */
  async getDecryptedTeamKey(teamId: string): Promise<Buffer> {
    const key = await this.getTeamKey(teamId);
    if (!key) {
      throw new Error('No active encryption key found for team');
    }

    return this.decryptWithMasterKey(key.encryptedKey);
  }

  /**
   * Encrypt data with team's key
   */
  async encryptForTeam(teamId: string, data: string): Promise<string> {
    const teamKey = await this.getDecryptedTeamKey(teamId);

    // Generate random IV
    const iv = randomBytes(IV_LENGTH);

    // Encrypt
    const cipher = createCipheriv(ALGORITHM, teamKey, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt data with team's key
   */
  async decryptForTeam(teamId: string, encryptedData: string): Promise<string> {
    const teamKey = await this.getDecryptedTeamKey(teamId);

    // Split IV and encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    // Decrypt
    const decipher = createDecipheriv(ALGORITHM, teamKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt team key with master key
   */
  private encryptWithMasterKey(teamKey: Buffer): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.masterKey, iv);

    let encrypted = cipher.update(teamKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Return IV + encrypted key
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  /**
   * Decrypt team key with master key
   */
  private decryptWithMasterKey(encryptedKey: string): Buffer {
    const parts = encryptedKey.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted key format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');

    const decipher = createDecipheriv(ALGORITHM, this.masterKey, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  }

  /**
   * Map database key to EncryptionKey type
   */
  private mapDbKeyToKey(dbKey: any): EncryptionKey {
    return {
      id: dbKey.id,
      teamId: dbKey.team_id,
      encryptedKey: dbKey.encrypted_key,
      keyVersion: dbKey.key_version,
      algorithm: dbKey.algorithm,
      isActive: dbKey.is_active,
      rotatedAt: dbKey.rotated_at ? new Date(dbKey.rotated_at) : null,
      expiresAt: dbKey.expires_at ? new Date(dbKey.expires_at) : null,
      createdAt: new Date(dbKey.created_at),
      createdBy: dbKey.created_by,
    };
  }
}

/**
 * Singleton instance
 */
export const encryptionService = new EncryptionService();
