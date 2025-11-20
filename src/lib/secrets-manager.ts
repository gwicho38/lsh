/**
 * LSH Secrets Manager
 * Sync .env files across machines using encrypted Supabase storage
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import DatabasePersistence from './database-persistence.js';
import { createLogger, LogLevel } from './logger.js';
import { getGitRepoInfo, hasEnvExample, ensureEnvInGitignore, type GitRepoInfo } from './git-utils.js';

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
  private gitInfo?: GitRepoInfo;

  constructor(userId?: string, encryptionKey?: string, detectGit: boolean = true) {
    this.persistence = new DatabasePersistence(userId);

    // Use provided key or generate from machine ID + user
    this.encryptionKey = encryptionKey || this.getDefaultEncryptionKey();

    // Auto-detect git repo context
    if (detectGit) {
      this.gitInfo = getGitRepoInfo();
    }
  }

  /**
   * Cleanup resources (stop timers, close connections)
   * Call this when done to allow process to exit
   */
  async cleanup(): Promise<void> {
    await this.persistence.cleanup();
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
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('bad decrypt') || err.message.includes('wrong final block length')) {
        throw new Error(
          'Decryption failed. This usually means:\n' +
          '  1. You need to set LSH_SECRETS_KEY environment variable\n' +
          '  2. The key must match the one used during encryption\n' +
          '  3. Generate a shared key with: lsh secrets key\n' +
          '  4. Add it to your .env: LSH_SECRETS_KEY=<key>\n' +
          '\nOriginal error: ' + err.message
        );
      }
      throw err;
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
   * Detect destructive changes (filled secrets becoming empty)
   */
  private detectDestructiveChanges(
    cloudSecrets: Record<string, string>,
    localSecrets: Record<string, string>
  ): Array<{ key: string; cloudValue: string; localValue: string }> {
    const destructive: Array<{ key: string; cloudValue: string; localValue: string }> = [];

    for (const [key, cloudValue] of Object.entries(cloudSecrets)) {
      // Only check if key exists in local AND cloud has a non-empty value
      if (key in localSecrets && cloudValue.trim() !== '') {
        const localValue = localSecrets[key];
        // If cloud had value but local is now empty/whitespace - this is destructive
        if (localValue.trim() === '') {
          destructive.push({ key, cloudValue, localValue });
        }
      }
    }

    return destructive;
  }

  /**
   * Format error message for destructive changes
   */
  private formatDestructiveChangesError(
    destructive: Array<{ key: string; cloudValue: string; localValue: string }>
  ): string {
    const count = destructive.length;
    const plural = count === 1 ? 'secret' : 'secrets';

    let message = `⚠️  Destructive change detected!\n\n`;
    message += `${count} ${plural} would go from filled → empty:\n\n`;

    for (const { key, cloudValue } of destructive) {
      // Mask the value for security (show first 4-5 chars)
      const preview = cloudValue.length > 5
        ? cloudValue.substring(0, 5) + '****'
        : '****';
      message += `  • ${key}: "${preview}" → "" (empty)\n`;
    }

    message += `\nThis is likely unintentional and could break your application.\n\n`;
    message += `To proceed anyway, use the --force flag:\n`;
    message += `  lsh lib secrets push --force\n`;
    message += `  lsh lib secrets sync --force\n`;

    return message;
  }

  /**
   * Push local .env to Supabase
   */
  async push(envFilePath: string = '.env', environment: string = 'dev', force: boolean = false): Promise<void> {
    if (!fs.existsSync(envFilePath)) {
      throw new Error(`File not found: ${envFilePath}`);
    }

    // Validate filename pattern for custom files
    const filename = path.basename(envFilePath);
    if (filename !== '.env' && !filename.startsWith('.env.')) {
      throw new Error(`Invalid filename: ${filename}. Must be '.env' or start with '.env.'`);
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

    // Check for destructive changes unless force is true
    if (!force) {
      try {
        const jobs = await this.persistence.getActiveJobs();
        const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const secretsJobs = jobs
          .filter(j => {
            return j.command === 'secrets_sync' &&
                   j.job_id.includes(environment) &&
                   j.job_id.includes(safeFilename);
          })
          .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

        if (secretsJobs.length > 0) {
          const latestSecret = secretsJobs[0];
          if (latestSecret.output) {
            try {
              const decrypted = this.decrypt(latestSecret.output);
              const cloudEnv = this.parseEnvFile(decrypted);

              const destructive = this.detectDestructiveChanges(cloudEnv, env);
              if (destructive.length > 0) {
                throw new Error(this.formatDestructiveChangesError(destructive));
              }
            } catch (error) {
      const err = error as Error;
              // If decryption fails, it's a key mismatch - let it proceed
              // (will fail later with proper error)
              if (!err.message.includes('Destructive change')) {
                // Only ignore decryption errors, re-throw destructive change errors
                throw err;
              }
              throw err;
            }
          }
        }
      } catch (error) {
      const err = error as Error;
        // Re-throw any errors (including destructive change errors)
        if (err.message.includes('Destructive change') || err.message.includes('Decryption failed')) {
          throw err;
        }
        // Ignore other errors (like connection issues) and proceed
      }
    }

    // Encrypt entire .env content
    const encrypted = this.encrypt(content);

    // Include filename in job_id for tracking multiple .env files
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const secretData = {
      job_id: `secrets_${environment}_${safeFilename}_${Date.now()}`,
      command: 'secrets_sync',
      status: 'completed',
      output: encrypted,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      working_directory: process.cwd(),
    };

    await this.persistence.saveJob(secretData as Parameters<typeof this.persistence.saveJob>[0]);

    logger.info(`✅ Pushed ${Object.keys(env).length} secrets from ${filename} to Supabase`);
  }

  /**
   * Pull .env from Supabase
   */
  async pull(envFilePath: string = '.env', environment: string = 'dev', force: boolean = false): Promise<void> {
    // Validate filename pattern for custom files
    const filename = path.basename(envFilePath);
    if (filename !== '.env' && !filename.startsWith('.env.')) {
      throw new Error(`Invalid filename: ${filename}. Must be '.env' or start with '.env.'`);
    }

    logger.info(`Pulling ${filename} (${environment}) from Supabase...`);

    // Get latest secrets for this specific file
    const jobs = await this.persistence.getActiveJobs();
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const secretsJobs = jobs
      .filter(j => {
        // Match secrets for this environment and filename
        return j.command === 'secrets_sync' &&
               j.job_id.includes(environment) &&
               j.job_id.includes(safeFilename);
      })
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

    if (secretsJobs.length === 0) {
      throw new Error(`No secrets found for file '${filename}' in environment: ${environment}`);
    }

    const latestSecret = secretsJobs[0];
    if (!latestSecret.output) {
      throw new Error(`No encrypted data found for environment: ${environment}`);
    }
    const decrypted = this.decrypt(latestSecret.output);

    // Backup existing .env if it exists (unless force is true)
    if (fs.existsSync(envFilePath) && !force) {
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
      // Updated regex to handle new format with filename
      const match = job.job_id.match(/secrets_([^_]+)_/);
      if (match) {
        envs.add(match[1]);
      }
    }

    return Array.from(envs).sort();
  }

  /**
   * List all tracked .env files
   */
  async listAllFiles(): Promise<Array<{ filename: string; environment: string; updated: string }>> {
    const jobs = await this.persistence.getActiveJobs();
    const secretsJobs = jobs.filter(j => j.command === 'secrets_sync');

    // Group by environment and filename to get latest of each
    const fileMap = new Map<string, { filename: string; environment: string; updated: string }>();

    for (const job of secretsJobs) {
      // Parse job_id: secrets_${environment}_${safeFilename}_${timestamp}
      const parts = job.job_id.split('_');
      if (parts.length >= 3 && parts[0] === 'secrets') {
        const environment = parts[1];

        // Handle both old and new format
        let filename = '.env';
        if (parts.length >= 4) {
          // New format with filename
          const _timestamp = parts[parts.length - 1];
          // Reconstruct filename from middle parts
          const filenameParts = parts.slice(2, -1);
          if (filenameParts.length > 0) {
            // Convert underscores back to dots for the extension
            filename = filenameParts.join('_');
            // Fix the extension dots that were replaced
            filename = filename.replace(/^env_/, '.env.');
            if (filename === 'env') {
              filename = '.env';
            }
          }
        }

        const key = `${environment}_${filename}`;
        const existing = fileMap.get(key);

        if (!existing || new Date(job.completed_at || job.started_at) > new Date(existing.updated)) {
          fileMap.set(key, {
            filename,
            environment,
            updated: new Date(job.completed_at || job.started_at).toLocaleString()
          });
        }
      }
    }

    return Array.from(fileMap.values()).sort((a, b) =>
      a.filename.localeCompare(b.filename) || a.environment.localeCompare(b.environment)
    );
  }

  /**
   * Show secrets (masked)
   */
  async show(environment: string = 'dev', format: 'env' | 'json' | 'yaml' | 'toml' | 'export' = 'env'): Promise<void> {
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

    // Convert to array format for formatSecrets
    const secrets = Object.entries(env).map(([key, value]) => ({ key, value }));

    // Use format utilities if not default env format
    if (format !== 'env') {
      const { formatSecrets } = await import('./format-utils.js');
      const output = formatSecrets(secrets, format, false); // No masking for structured formats
      console.log(output);
      return;
    }

    // Default env format with masking (legacy behavior)
    console.log(`\n📦 Secrets for ${environment} (${Object.keys(env).length} total):\n`);

    for (const [key, value] of Object.entries(env)) {
      const masked = value.length > 4
        ? value.substring(0, 4) + '*'.repeat(Math.min(value.length - 4, 20))
        : '****';
      console.log(`  ${key}=${masked}`);
    }
    console.log();
  }

  /**
   * Get status of secrets for an environment
   */
  async status(envFilePath: string = '.env', environment: string = 'dev'): Promise<{
    localExists: boolean;
    localKeys: number;
    localModified?: Date;
    cloudExists: boolean;
    cloudKeys: number;
    cloudModified?: Date;
    keySet: boolean;
    keyMatches?: boolean;
    suggestions: string[];
  }> {
    const status = {
      localExists: false,
      localKeys: 0,
      localModified: undefined as Date | undefined,
      cloudExists: false,
      cloudKeys: 0,
      cloudModified: undefined as Date | undefined,
      keySet: !!process.env.LSH_SECRETS_KEY,
      keyMatches: undefined as boolean | undefined,
      suggestions: [] as string[],
    };

    // Check local file
    if (fs.existsSync(envFilePath)) {
      status.localExists = true;
      const stat = fs.statSync(envFilePath);
      status.localModified = stat.mtime;
      const content = fs.readFileSync(envFilePath, 'utf8');
      const env = this.parseEnvFile(content);
      status.localKeys = Object.keys(env).length;
    }

    // Check cloud storage
    try {
      const jobs = await this.persistence.getActiveJobs();
      const secretsJobs = jobs
        .filter(j => j.command === 'secrets_sync' && j.job_id.includes(environment))
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

      if (secretsJobs.length > 0) {
        status.cloudExists = true;
        const latestSecret = secretsJobs[0];
        status.cloudModified = new Date(latestSecret.completed_at || latestSecret.started_at);

        // Try to decrypt to check if key matches
        if (latestSecret.output) {
          try {
            const decrypted = this.decrypt(latestSecret.output);
            const env = this.parseEnvFile(decrypted);
            status.cloudKeys = Object.keys(env).length;
            status.keyMatches = true;
          } catch (_error) {
            status.keyMatches = false;
          }
        }
      }
    } catch (_error) {
      // Cloud check failed, likely no connection
    }

    return status;
  }

  /**
   * Get repo-aware environment namespace
   * Returns environment name with repo context if in a git repo
   */
  private getRepoAwareEnvironment(environment: string): string {
    if (this.gitInfo?.repoName) {
      return `${this.gitInfo.repoName}_${environment}`;
    }
    return environment;
  }

  /**
   * Generate encryption key if not set
   */
  private async ensureEncryptionKey(): Promise<boolean> {
    if (process.env.LSH_SECRETS_KEY) {
      return true; // Key already set
    }

    logger.warn('⚠️  No encryption key found. Generating a new key...');

    const key = crypto.randomBytes(32).toString('hex');

    // Try to add to .env file
    const envPath = path.join(process.cwd(), '.env');

    try {
      let content = '';

      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
        if (!content.endsWith('\n')) {
          content += '\n';
        }
      }

      // Check if LSH_SECRETS_KEY already exists (but empty)
      if (content.includes('LSH_SECRETS_KEY=')) {
        content = content.replace(/LSH_SECRETS_KEY=.*$/m, `LSH_SECRETS_KEY=${key}`);
      } else {
        content += `\n# LSH Secrets Encryption Key (do not commit!)\nLSH_SECRETS_KEY=${key}\n`;
      }

      fs.writeFileSync(envPath, content, 'utf8');

      // Set in current process
      process.env.LSH_SECRETS_KEY = key;
      this.encryptionKey = key;

      logger.info('✅ Generated and saved encryption key to .env');
      logger.info('💡 Load it now: export LSH_SECRETS_KEY=' + key.substring(0, 8) + '...');

      return true;
    } catch (error) {
      const _err = error as Error;
      logger.error(`Failed to save encryption key: ${_err.message}`);
      logger.info('Please set it manually:');
      logger.info(`export LSH_SECRETS_KEY=${key}`);
      return false;
    }
  }

  /**
   * Create .env from .env.example if available
   */
  private async createEnvFromExample(envFilePath: string): Promise<boolean> {
    const examplePath = hasEnvExample(process.cwd());

    if (!examplePath) {
      // Create minimal template
      const template = `# Environment Configuration
# Generated by LSH Secrets Manager

# Application
NODE_ENV=development

# Database
DATABASE_URL=

# API Keys
API_KEY=

# LSH Secrets Encryption Key (auto-generated)
LSH_SECRETS_KEY=${this.encryptionKey}

# Add your environment variables below
`;

      try {
        fs.writeFileSync(envFilePath, template, 'utf8');
        logger.info(`✅ Created ${envFilePath} from template`);
        return true;
      } catch (error) {
        const _err = error as Error;
        logger.error(`Failed to create ${envFilePath}: ${_err.message}`);
        return false;
      }
    }

    // Copy from example
    try {
      const content = fs.readFileSync(examplePath, 'utf8');
      let newContent = content;

      // Add encryption key if not present
      if (!content.includes('LSH_SECRETS_KEY')) {
        newContent += `\n# LSH Secrets Encryption Key (auto-generated)\nLSH_SECRETS_KEY=${this.encryptionKey}\n`;
      }

      fs.writeFileSync(envFilePath, newContent, 'utf8');
      logger.info(`✅ Created ${envFilePath} from ${path.basename(examplePath)}`);
      return true;
    } catch (error) {
      const _err = error as Error;
      logger.error(`Failed to create ${envFilePath}: ${_err.message}`);
      return false;
    }
  }

  /**
   * Generate shell export commands for loading .env file
   */
  private generateExportCommands(envFilePath: string): string {
    if (!fs.existsSync(envFilePath)) {
      return '# No .env file found\n';
    }

    const content = fs.readFileSync(envFilePath, 'utf8');
    const lines = content.split('\n');
    const exports: string[] = [];

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

        // Remove quotes if present (we'll add them back for the export)
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Escape special characters for shell
        const escapedValue = value
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\$/g, '\\$')
          .replace(/`/g, '\\`');

        exports.push(`export ${key}="${escapedValue}"`);
      }
    }

    return exports.join('\n') + '\n';
  }

  /**
   * Smart sync command - automatically set up and synchronize secrets
   * This is the new enhanced sync that does everything automatically
   */
  async smartSync(envFilePath: string = '.env', environment: string = 'dev', autoExecute: boolean = true, loadMode: boolean = false, force: boolean = false): Promise<void> {
    // In load mode, suppress all logger output to prevent zsh glob interpretation
    // Save original level and restore at the end
    const originalLogLevel = loadMode ? logger['config'].level : undefined;
    if (loadMode) {
      logger.setLevel(LogLevel.NONE);
    }

    try {
      // Use repo-aware environment if in git repo
      const effectiveEnv = this.getRepoAwareEnvironment(environment);
      const displayEnv = this.gitInfo?.repoName ? `${this.gitInfo.repoName}/${environment}` : environment;

      // In load mode, suppress all output except the final export commands
      const out = loadMode ? () => {} : console.log;

      out(`\n🔍 Smart sync for: ${displayEnv}\n`);

    // Show git repo context if detected
    if (this.gitInfo?.isGitRepo) {
      out('📁 Git Repository:');
      out(`   Repo: ${this.gitInfo.repoName || 'unknown'}`);
      if (this.gitInfo.currentBranch) {
        out(`   Branch: ${this.gitInfo.currentBranch}`);
      }
      out();
    }

    // Step 1: Ensure encryption key exists
    if (!process.env.LSH_SECRETS_KEY) {
      logger.info('🔑 No encryption key found...');
      await this.ensureEncryptionKey();
      out();
    }

    // Step 2: Ensure .gitignore includes .env
    if (this.gitInfo?.isGitRepo) {
      ensureEnvInGitignore(process.cwd());
    }

    // Step 3: Check current status
    const status = await this.status(envFilePath, effectiveEnv);

    out('📊 Current Status:');
    out(`   Encryption key: ${status.keySet ? '✅' : '❌'}`);
    out(`   Local ${envFilePath}: ${status.localExists ? `✅ (${status.localKeys} keys)` : '❌'}`);
    out(`   Cloud storage: ${status.cloudExists ? `✅ (${status.cloudKeys} keys)` : '❌'}`);

    if (status.cloudExists && status.keyMatches !== undefined) {
      out(`   Key matches: ${status.keyMatches ? '✅' : '❌'}`);
    }

    out();

    // Step 4: Determine action and execute if auto mode
    let _action: 'push' | 'pull' | 'create-and-push' | 'in-sync' | 'key-mismatch' = 'in-sync';

    if (status.cloudExists && status.keyMatches === false) {
      _action = 'key-mismatch';
      out('⚠️  Encryption key mismatch!');
      out('   The local key does not match the cloud storage.');
      out('   Please use the original key or push new secrets with:');
      out(`   lsh lib secrets push -f ${envFilePath} -e ${environment}`);
      out();
      return;
    }

    if (!status.localExists && !status.cloudExists) {
      _action = 'create-and-push';
      out('🆕 No secrets found locally or in cloud');
      out('   Creating new .env file...');

      if (autoExecute) {
        await this.createEnvFromExample(envFilePath);
        out('   Pushing to cloud...');
        await this.push(envFilePath, effectiveEnv, force);
        out();
        out('✅ Setup complete! Edit your .env and run sync again to update.');
      } else {
        out('💡 Run: lsh lib secrets create && lsh lib secrets push');
      }
      out();

      // Output export commands in load mode
      if (loadMode && fs.existsSync(envFilePath)) {
        console.log(this.generateExportCommands(envFilePath));
      }
      return;
    }

    if (status.localExists && !status.cloudExists) {
      _action = 'push';
      out('⬆️  Local .env exists but not in cloud');

      if (autoExecute) {
        out('   Pushing to cloud...');
        await this.push(envFilePath, effectiveEnv, force);
        out('✅ Secrets pushed to cloud!');
      } else {
        out(`💡 Run: lsh lib secrets push -f ${envFilePath} -e ${environment}`);
      }
      out();

      // Output export commands in load mode
      if (loadMode && fs.existsSync(envFilePath)) {
        console.log(this.generateExportCommands(envFilePath));
      }
      return;
    }

    if (!status.localExists && status.cloudExists && status.keyMatches) {
      _action = 'pull';
      out('⬇️  Cloud secrets available but no local file');

      if (autoExecute) {
        out('   Pulling from cloud...');
        await this.pull(envFilePath, effectiveEnv, false);
        out('✅ Secrets pulled from cloud!');
      } else {
        out(`💡 Run: lsh lib secrets pull -f ${envFilePath} -e ${environment}`);
      }
      out();

      // Output export commands in load mode
      if (loadMode && fs.existsSync(envFilePath)) {
        console.log(this.generateExportCommands(envFilePath));
      }
      return;
    }

    if (status.localExists && status.cloudExists && status.keyMatches) {
      if (status.localModified && status.cloudModified) {
        const localNewer = status.localModified > status.cloudModified;
        const timeDiff = Math.abs(status.localModified.getTime() - status.cloudModified.getTime());
        const minutesDiff = Math.floor(timeDiff / (1000 * 60));

        // If difference is less than 1 minute, consider in sync
        if (minutesDiff < 1) {
          out('✅ Local and cloud are in sync!');
          out();

          if (!loadMode) {
            this.showLoadInstructions(envFilePath);
          } else if (fs.existsSync(envFilePath)) {
            console.log(this.generateExportCommands(envFilePath));
          }
          return;
        }

        if (localNewer) {
          _action = 'push';
          out('⬆️  Local file is newer than cloud');
          out(`   Local: ${status.localModified.toLocaleString()}`);
          out(`   Cloud: ${status.cloudModified.toLocaleString()}`);

          if (autoExecute) {
            out('   Pushing to cloud...');
            await this.push(envFilePath, effectiveEnv, force);
            out('✅ Secrets synced to cloud!');
          } else {
            out(`💡 Run: lsh lib secrets push -f ${envFilePath} -e ${environment}`);
          }
        } else {
          _action = 'pull';
          out('⬇️  Cloud is newer than local file');
          out(`   Local: ${status.localModified.toLocaleString()}`);
          out(`   Cloud: ${status.cloudModified.toLocaleString()}`);

          if (autoExecute) {
            out('   Pulling from cloud (backup created)...');
            await this.pull(envFilePath, effectiveEnv, false);
            out('✅ Secrets synced from cloud!');
          } else {
            out(`💡 Run: lsh lib secrets pull -f ${envFilePath} -e ${environment}`);
          }
        }

        out();

        if (!loadMode) {
          this.showLoadInstructions(envFilePath);
        } else if (fs.existsSync(envFilePath)) {
          console.log(this.generateExportCommands(envFilePath));
        }
        return;
      }
    }

      // Default: everything is in sync
      out('✅ Secrets are synchronized!');
      out();

      if (!loadMode) {
        this.showLoadInstructions(envFilePath);
      } else if (fs.existsSync(envFilePath)) {
        console.log(this.generateExportCommands(envFilePath));
      }
    } finally {
      // Restore original logger level if it was changed
      if (loadMode && originalLogLevel !== undefined) {
        logger.setLevel(originalLogLevel);
      }
    }
  }

  /**
   * Show instructions for loading secrets
   */
  private showLoadInstructions(envFilePath: string): void {
    console.log('📝 To load secrets in your current shell:');
    console.log();
    console.log('   bash/zsh:');
    console.log(`   set -a && source ${envFilePath} && set +a`);
    console.log();
    console.log('   fish:');
    console.log(`   export (cat ${envFilePath} | grep -v '^#')`);
    console.log();
    console.log('   Or use lsh to load:');
    console.log(`   eval "$(lsh get --all --export)"`);
    console.log();
  }

  /**
   * Sync command - check status and suggest actions (legacy, kept for compatibility)
   */
  async sync(envFilePath: string = '.env', environment: string = 'dev'): Promise<void> {
    console.log(`\n🔍 Checking secrets status for environment: ${environment}\n`);

    const status = await this.status(envFilePath, environment);

    // Display status
    console.log('📊 Status:');
    console.log(`  Encryption key set: ${status.keySet ? '✅' : '❌'}`);
    console.log(`  Local .env file: ${status.localExists ? `✅ (${status.localKeys} keys)` : '❌'}`);
    console.log(`  Cloud storage: ${status.cloudExists ? `✅ (${status.cloudKeys} keys)` : '❌'}`);

    if (status.cloudExists && status.keyMatches !== undefined) {
      console.log(`  Key matches cloud: ${status.keyMatches ? '✅' : '❌'}`);
    }

    console.log();

    // Generate suggestions
    const suggestions: string[] = [];

    if (!status.keySet) {
      suggestions.push('⚠️  No encryption key set!');
      suggestions.push('   Generate a key: lsh lib secrets key');
      suggestions.push('   Add it to .env: LSH_SECRETS_KEY=<your-key>');
      suggestions.push('   Load it: export $(cat .env | xargs)');
    }

    if (status.cloudExists && status.keyMatches === false) {
      suggestions.push('⚠️  Encryption key does not match cloud storage!');
      suggestions.push('   Either use the original key, or push new secrets:');
      suggestions.push(`   lsh lib secrets push -f ${envFilePath} -e ${environment}`);
    }

    if (!status.localExists && status.cloudExists && status.keyMatches) {
      suggestions.push('💡 Cloud secrets available but no local file');
      suggestions.push(`   Pull from cloud: lsh lib secrets pull -f ${envFilePath} -e ${environment}`);
    }

    if (status.localExists && !status.cloudExists) {
      suggestions.push('💡 Local .env exists but not in cloud');
      suggestions.push(`   Push to cloud: lsh lib secrets push -f ${envFilePath} -e ${environment}`);
    }

    if (status.localExists && status.cloudExists && status.keyMatches) {
      if (status.localModified && status.cloudModified) {
        const localNewer = status.localModified > status.cloudModified;
        const timeDiff = Math.abs(status.localModified.getTime() - status.cloudModified.getTime());
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        if (localNewer && daysDiff > 0) {
          suggestions.push('💡 Local file is newer than cloud');
          suggestions.push(`   Push to cloud: lsh lib secrets push -f ${envFilePath} -e ${environment}`);
        } else if (!localNewer && daysDiff > 0) {
          suggestions.push('💡 Cloud is newer than local file');
          suggestions.push(`   Pull from cloud: lsh lib secrets pull -f ${envFilePath} -e ${environment}`);
        } else {
          suggestions.push('✅ Local and cloud are in sync!');
        }
      }
    }

    // Show how to load secrets in current shell
    if (status.localExists && status.keySet) {
      suggestions.push('');
      suggestions.push('📝 To load secrets in your current shell:');
      suggestions.push('');
      suggestions.push('   bash/zsh:');
      suggestions.push(`   set -a && source ${envFilePath} && set +a`);
      suggestions.push('');
      suggestions.push('   fish:');
      suggestions.push(`   export (cat ${envFilePath} | grep -v '^#')`);
      suggestions.push('');
      suggestions.push('💡 Add to your shell profile for auto-loading:');
      suggestions.push(`   echo "set -a && source ${path.resolve(envFilePath)} && set +a" >> ~/.zshrc`);
    }

    // Display suggestions
    if (suggestions.length > 0) {
      console.log('📋 Recommendations:\n');
      suggestions.forEach(s => console.log(s));
      console.log();
    }
  }
}

export default SecretsManager;
