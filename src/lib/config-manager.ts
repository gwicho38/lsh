/**
 * Configuration Manager for LSH
 * Manages ~/.config/lsh/lshrc configuration file
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';

export const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.config', 'lsh');
export const DEFAULT_CONFIG_FILE = path.join(DEFAULT_CONFIG_DIR, 'lshrc');

export interface LSHConfig {
  // Supabase Configuration
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;

  // Database Configuration
  DATABASE_URL?: string;

  // Secrets Management
  LSH_SECRETS_KEY?: string;
  LSH_MASTER_KEY?: string;

  // API Configuration
  LSH_API_ENABLED?: string;
  LSH_API_PORT?: string;
  LSH_API_KEY?: string;
  LSH_JWT_SECRET?: string;

  // Webhook Configuration
  LSH_ENABLE_WEBHOOKS?: string;
  WEBHOOK_PORT?: string;
  GITHUB_WEBHOOK_SECRET?: string;
  GITLAB_WEBHOOK_SECRET?: string;
  JENKINS_WEBHOOK_SECRET?: string;

  // Security
  LSH_ALLOW_DANGEROUS_COMMANDS?: string;

  // Storage
  LSH_DATA_DIR?: string;

  // SaaS Configuration
  LSH_SAAS_API_PORT?: string;
  LSH_SAAS_API_HOST?: string;
  LSH_CORS_ORIGINS?: string;

  // Email Configuration
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  BASE_URL?: string;

  // Stripe Configuration
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;

  // Redis
  REDIS_URL?: string;

  // Node Environment
  NODE_ENV?: string;

  // Other
  [key: string]: string | undefined;
}

/**
 * Default configuration template
 */
export const DEFAULT_CONFIG_TEMPLATE = `# LSH Configuration File
# This file is in .env format and is automatically loaded on LSH startup
# Location: ~/.config/lsh/lshrc
#
# Edit this file with: lsh config

# ============================================================================
# Storage Backend (choose one)
# ============================================================================

# Option 1: Local Storage (Default - No Configuration Needed)
# Data stored in ~/.lsh/data/storage.json
# Perfect for: Single-user, local development, getting started

# Option 2: Supabase Cloud (Team Collaboration)
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-anon-key-here

# Option 3: Local PostgreSQL (via Docker)
# DATABASE_URL=postgresql://lsh_user:lsh_password@localhost:5432/lsh

# ============================================================================
# Secrets Management
# ============================================================================

# Encryption key for secrets (generate with: lsh key)
# Share this key with your team for collaboration
# LSH_SECRETS_KEY=

# Master encryption key for SaaS platform
# LSH_MASTER_KEY=

# ============================================================================
# API Server (Optional)
# ============================================================================

# LSH_API_ENABLED=false
# LSH_API_PORT=3030
# LSH_API_KEY=
# LSH_JWT_SECRET=

# ============================================================================
# Webhooks (Optional)
# ============================================================================

# LSH_ENABLE_WEBHOOKS=false
# WEBHOOK_PORT=3033
# GITHUB_WEBHOOK_SECRET=
# GITLAB_WEBHOOK_SECRET=
# JENKINS_WEBHOOK_SECRET=

# ============================================================================
# Security
# ============================================================================

# WARNING: Only enable if you fully trust all job sources
# LSH_ALLOW_DANGEROUS_COMMANDS=false

# ============================================================================
# Advanced Configuration
# ============================================================================

# Custom data directory (default: ~/.lsh/data)
# LSH_DATA_DIR=

# Node environment
# NODE_ENV=development

# Redis (for caching)
# REDIS_URL=redis://localhost:6379

# ============================================================================
# SaaS Platform (Advanced)
# ============================================================================

# LSH_SAAS_API_PORT=3031
# LSH_SAAS_API_HOST=0.0.0.0
# LSH_CORS_ORIGINS=http://localhost:3000,http://localhost:3031

# Email Service (Resend)
# RESEND_API_KEY=
# EMAIL_FROM=noreply@yourdomain.com
# BASE_URL=https://app.yourdomain.com

# Stripe Billing
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
`;

/**
 * Parse .env format file into config object
 */
export function parseEnvFile(content: string): LSHConfig {
  const config: LSHConfig = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      config[key] = value;
    }
  }

  return config;
}

/**
 * Serialize config object to .env format
 */
export function serializeConfig(config: LSHConfig): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined && value !== '') {
      // Quote values that contain spaces or special characters
      const needsQuotes = /[\s#"']/.test(value);
      const serializedValue = needsQuotes ? `"${value}"` : value;
      lines.push(`${key}=${serializedValue}`);
    }
  }

  return lines.join('\n');
}

export class ConfigManager {
  private configFile: string;
  private config: LSHConfig = {};

  constructor(configFile: string = DEFAULT_CONFIG_FILE) {
    this.configFile = configFile;
  }

  /**
   * Get config file path
   */
  getConfigPath(): string {
    return this.configFile;
  }

  /**
   * Check if config file exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.configFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if config file exists (sync)
   */
  existsSync(): boolean {
    return fsSync.existsSync(this.configFile);
  }

  /**
   * Initialize config file with default template
   */
  async initialize(): Promise<void> {
    const configDir = path.dirname(this.configFile);

    // Create config directory if it doesn't exist
    await fs.mkdir(configDir, { recursive: true });

    // Check if config file already exists
    const exists = await this.exists();
    if (exists) {
      console.log(`Config file already exists at ${this.configFile}`);
      return;
    }

    // Write default template
    await fs.writeFile(this.configFile, DEFAULT_CONFIG_TEMPLATE, 'utf-8');
    console.log(`✓ Created config file at ${this.configFile}`);
    console.log(`  Edit with: lsh config`);
  }

  /**
   * Load configuration from file
   */
  async load(): Promise<LSHConfig> {
    try {
      // Initialize if doesn't exist
      if (!(await this.exists())) {
        await this.initialize();
      }

      const content = await fs.readFile(this.configFile, 'utf-8');
      this.config = parseEnvFile(content);
      return this.config;
    } catch (error) {
      console.error(`Failed to load config from ${this.configFile}:`, error);
      return {};
    }
  }

  /**
   * Load configuration from file (sync)
   */
  loadSync(): LSHConfig {
    try {
      // Check if exists
      if (!this.existsSync()) {
        // Can't initialize synchronously safely, return empty config
        return {};
      }

      const content = fsSync.readFileSync(this.configFile, 'utf-8');
      this.config = parseEnvFile(content);
      return this.config;
    } catch (error) {
      console.error(`Failed to load config from ${this.configFile}:`, error);
      return {};
    }
  }

  /**
   * Save configuration to file
   */
  async save(config: LSHConfig): Promise<void> {
    try {
      const configDir = path.dirname(this.configFile);
      await fs.mkdir(configDir, { recursive: true });

      // Merge with existing config
      this.config = { ...this.config, ...config };

      const content = serializeConfig(this.config);
      await fs.writeFile(this.configFile, content, 'utf-8');
      console.log(`✓ Saved config to ${this.configFile}`);
    } catch (error) {
      console.error(`Failed to save config to ${this.configFile}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific config value
   */
  get(key: string): string | undefined {
    return this.config[key];
  }

  /**
   * Set a specific config value
   */
  async set(key: string, value: string): Promise<void> {
    this.config[key] = value;
    await this.save(this.config);
  }

  /**
   * Delete a specific config value
   */
  async delete(key: string): Promise<void> {
    delete this.config[key];
    await this.save(this.config);
  }

  /**
   * Get all config values
   */
  getAll(): LSHConfig {
    return { ...this.config };
  }

  /**
   * Merge config with process.env
   * Config file values take precedence over environment variables
   */
  mergeWithEnv(): void {
    for (const [key, value] of Object.entries(this.config)) {
      if (value !== undefined && value !== '') {
        process.env[key] = value;
      }
    }
  }
}

/**
 * Global config manager instance
 */
let _globalConfigManager: ConfigManager | null = null;

/**
 * Get global config manager
 */
export function getConfigManager(): ConfigManager {
  if (!_globalConfigManager) {
    _globalConfigManager = new ConfigManager();
  }
  return _globalConfigManager;
}

/**
 * Load global configuration and merge with process.env
 * This should be called early in the application startup
 */
export async function loadGlobalConfig(): Promise<LSHConfig> {
  const manager = getConfigManager();
  const config = await manager.load();
  manager.mergeWithEnv();
  return config;
}

/**
 * Load global configuration synchronously and merge with process.env
 */
export function loadGlobalConfigSync(): LSHConfig {
  const manager = getConfigManager();
  const config = manager.loadSync();
  manager.mergeWithEnv();
  return config;
}

export default ConfigManager;
