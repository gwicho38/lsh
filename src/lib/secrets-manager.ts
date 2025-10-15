/**
 * LSH Secrets Manager
 * Sync .env files across machines using encrypted Supabase storage
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import DatabasePersistence from './database-persistence.js';
import { createLogger } from './logger.js';

const logger = createLogger('SecretsManager');

export interface Secret {
  key: string;
  value: string;
  environment: string; // dev, staging, prod
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SecretsManager {
  private persistence: DatabasePersistence;
  private encryptionKey: string;

  constructor(userId?: string, encryptionKey?: string) {
    this.persistence = new DatabasePersistence(userId);

    // Use provided key or generate from machine ID + user
    this.encryptionKey = encryptionKey || this.getDefaultEncryptionKey();
  }

  /**
   * Get default encryption key from environment or machine
   */
  private getDefaultEncryptionKey(): string {
    // Check for explicit key
    if (process.env.LSH_SECRETS_KEY) {
      return process.env.LSH_SECRETS_KEY;
    }

    // Generate from machine ID and user
    const machineId = process.env.HOSTNAME || 'localhost';
    const user = process.env.USER || 'unknown';
    const seed = `${machineId}-${user}-lsh-secrets`;

    // Create deterministic key
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  /**
   * Encrypt a value
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(this.encryptionKey, 'hex');
    const cipher = crypto.createCipheriv('aes-256-cbc', key.slice(0, 32), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a value
   */
  private decrypt(text: string): string {
    try {
      const parts = text.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const key = Buffer.from(this.encryptionKey, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-cbc', key.slice(0, 32), iv);

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      if (error.message.includes('bad decrypt') || error.message.includes('wrong final block length')) {
        throw new Error(
          'Decryption failed. This usually means:\n' +
          '  1. You need to set LSH_SECRETS_KEY environment variable\n' +
          '  2. The key must match the one used during encryption\n' +
          '  3. Generate a shared key with: lsh secrets key\n' +
          '  4. Add it to your .env: LSH_SECRETS_KEY=<key>\n' +
          '\nOriginal error: ' + error.message
        );
      }
      throw error;
    }
  }

  /**
   * Parse .env file into key-value pairs
   */
  private parseEnvFile(content: string): Record<string, string> {
    const env: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) {
        continue;
      }

      // Parse KEY=VALUE
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        env[key] = value;
      }
    }

    return env;
  }

  /**
   * Format env vars as .env file content
   */
  private formatEnvFile(vars: Record<string, string>): string {
    return Object.entries(vars)
      .map(([key, value]) => {
        // Quote values with spaces or special characters
        const needsQuotes = /[\s#]/.test(value);
        const quotedValue = needsQuotes ? `"${value}"` : value;
        return `${key}=${quotedValue}`;
      })
      .join('\n') + '\n';
  }

  /**
   * Push local .env to Supabase
   */
  async push(envFilePath: string = '.env', environment: string = 'dev'): Promise<void> {
    if (!fs.existsSync(envFilePath)) {
      throw new Error(`File not found: ${envFilePath}`);
    }

    // Warn if using default key
    if (!process.env.LSH_SECRETS_KEY) {
      logger.warn('⚠️  Warning: No LSH_SECRETS_KEY set. Using machine-specific key.');
      logger.warn('   To share secrets across machines, generate a key with: lsh secrets key');
      logger.warn('   Then add LSH_SECRETS_KEY=<key> to your .env on all machines');
      console.log();
    }

    logger.info(`Pushing ${envFilePath} to Supabase (${environment})...`);

    const content = fs.readFileSync(envFilePath, 'utf8');
    const env = this.parseEnvFile(content);

    // Encrypt entire .env content
    const encrypted = this.encrypt(content);

    // Store in Supabase (using job system for now)
    const secretData = {
      job_id: `secrets_${environment}_${Date.now()}`,
      command: 'secrets_sync',
      status: 'completed',
      output: encrypted,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      working_directory: process.cwd(),
    };

    await this.persistence.saveJob(secretData as any);

    logger.info(`✅ Pushed ${Object.keys(env).length} secrets to Supabase`);
  }

  /**
   * Pull .env from Supabase
   */
  async pull(envFilePath: string = '.env', environment: string = 'dev'): Promise<void> {
    logger.info(`Pulling ${environment} secrets from Supabase...`);

    // Get latest secrets
    const jobs = await this.persistence.getActiveJobs();
    const secretsJobs = jobs
      .filter(j => j.command === 'secrets_sync' && j.job_id.includes(environment))
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

    if (secretsJobs.length === 0) {
      throw new Error(`No secrets found for environment: ${environment}`);
    }

    const latestSecret = secretsJobs[0];
    if (!latestSecret.output) {
      throw new Error(`No encrypted data found for environment: ${environment}`);
    }
    const decrypted = this.decrypt(latestSecret.output);

    // Backup existing .env if it exists
    if (fs.existsSync(envFilePath)) {
      const backup = `${envFilePath}.backup.${Date.now()}`;
      fs.copyFileSync(envFilePath, backup);
      logger.info(`Backed up existing .env to ${backup}`);
    }

    // Write new .env
    fs.writeFileSync(envFilePath, decrypted, 'utf8');

    const env = this.parseEnvFile(decrypted);
    logger.info(`✅ Pulled ${Object.keys(env).length} secrets from Supabase`);
  }

  /**
   * List all stored environments
   */
  async listEnvironments(): Promise<string[]> {
    const jobs = await this.persistence.getActiveJobs();
    const secretsJobs = jobs.filter(j => j.command === 'secrets_sync');

    const envs = new Set<string>();
    for (const job of secretsJobs) {
      const match = job.job_id.match(/secrets_(.+?)_\d+/);
      if (match) {
        envs.add(match[1]);
      }
    }

    return Array.from(envs).sort();
  }

  /**
   * Show secrets (masked)
   */
  async show(environment: string = 'dev'): Promise<void> {
    const jobs = await this.persistence.getActiveJobs();
    const secretsJobs = jobs
      .filter(j => j.command === 'secrets_sync' && j.job_id.includes(environment))
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

    if (secretsJobs.length === 0) {
      console.log(`No secrets found for environment: ${environment}`);
      return;
    }

    const latestSecret = secretsJobs[0];
    if (!latestSecret.output) {
      throw new Error(`No encrypted data found for environment: ${environment}`);
    }
    const decrypted = this.decrypt(latestSecret.output);
    const env = this.parseEnvFile(decrypted);

    console.log(`\n📦 Secrets for ${environment} (${Object.keys(env).length} total):\n`);

    for (const [key, value] of Object.entries(env)) {
      const masked = value.length > 4
        ? value.substring(0, 4) + '*'.repeat(Math.min(value.length - 4, 20))
        : '****';
      console.log(`  ${key}=${masked}`);
    }
    console.log();
  }
}

export default SecretsManager;
