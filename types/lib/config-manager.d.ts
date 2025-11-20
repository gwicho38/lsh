/**
 * Configuration Manager for LSH
 * Manages ~/.config/lsh/lshrc configuration file
 */
export declare const DEFAULT_CONFIG_DIR: string;
export declare const DEFAULT_CONFIG_FILE: string;
export interface LSHConfig {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    DATABASE_URL?: string;
    LSH_SECRETS_KEY?: string;
    LSH_MASTER_KEY?: string;
    LSH_API_ENABLED?: string;
    LSH_API_PORT?: string;
    LSH_API_KEY?: string;
    LSH_JWT_SECRET?: string;
    LSH_ENABLE_WEBHOOKS?: string;
    WEBHOOK_PORT?: string;
    GITHUB_WEBHOOK_SECRET?: string;
    GITLAB_WEBHOOK_SECRET?: string;
    JENKINS_WEBHOOK_SECRET?: string;
    LSH_ALLOW_DANGEROUS_COMMANDS?: string;
    LSH_DATA_DIR?: string;
    LSH_SAAS_API_PORT?: string;
    LSH_SAAS_API_HOST?: string;
    LSH_CORS_ORIGINS?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    BASE_URL?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    REDIS_URL?: string;
    NODE_ENV?: string;
    [key: string]: string | undefined;
}
/**
 * Default configuration template
 */
export declare const DEFAULT_CONFIG_TEMPLATE = "# LSH Configuration File\n# This file is in .env format and is automatically loaded on LSH startup\n# Location: ~/.config/lsh/lshrc\n#\n# Edit this file with: lsh config\n\n# ============================================================================\n# Storage Backend (choose one)\n# ============================================================================\n\n# Option 1: Local Storage (Default - No Configuration Needed)\n# Data stored in ~/.lsh/data/storage.json\n# Perfect for: Single-user, local development, getting started\n\n# Option 2: Supabase Cloud (Team Collaboration)\n# SUPABASE_URL=https://your-project.supabase.co\n# SUPABASE_ANON_KEY=your-anon-key-here\n\n# Option 3: Local PostgreSQL (via Docker)\n# DATABASE_URL=postgresql://lsh_user:lsh_password@localhost:5432/lsh\n\n# ============================================================================\n# Secrets Management\n# ============================================================================\n\n# Encryption key for secrets (generate with: lsh key)\n# Share this key with your team for collaboration\n# LSH_SECRETS_KEY=\n\n# Master encryption key for SaaS platform\n# LSH_MASTER_KEY=\n\n# ============================================================================\n# API Server (Optional)\n# ============================================================================\n\n# LSH_API_ENABLED=false\n# LSH_API_PORT=3030\n# LSH_API_KEY=\n# LSH_JWT_SECRET=\n\n# ============================================================================\n# Webhooks (Optional)\n# ============================================================================\n\n# LSH_ENABLE_WEBHOOKS=false\n# WEBHOOK_PORT=3033\n# GITHUB_WEBHOOK_SECRET=\n# GITLAB_WEBHOOK_SECRET=\n# JENKINS_WEBHOOK_SECRET=\n\n# ============================================================================\n# Security\n# ============================================================================\n\n# WARNING: Only enable if you fully trust all job sources\n# LSH_ALLOW_DANGEROUS_COMMANDS=false\n\n# ============================================================================\n# Advanced Configuration\n# ============================================================================\n\n# Custom data directory (default: ~/.lsh/data)\n# LSH_DATA_DIR=\n\n# Node environment\n# NODE_ENV=development\n\n# Redis (for caching)\n# REDIS_URL=redis://localhost:6379\n\n# ============================================================================\n# SaaS Platform (Advanced)\n# ============================================================================\n\n# LSH_SAAS_API_PORT=3031\n# LSH_SAAS_API_HOST=0.0.0.0\n# LSH_CORS_ORIGINS=http://localhost:3000,http://localhost:3031\n\n# Email Service (Resend)\n# RESEND_API_KEY=\n# EMAIL_FROM=noreply@yourdomain.com\n# BASE_URL=https://app.yourdomain.com\n\n# Stripe Billing\n# STRIPE_SECRET_KEY=\n# STRIPE_WEBHOOK_SECRET=\n";
/**
 * Parse .env format file into config object
 */
export declare function parseEnvFile(content: string): LSHConfig;
/**
 * Serialize config object to .env format
 */
export declare function serializeConfig(config: LSHConfig): string;
export declare class ConfigManager {
    private configFile;
    private config;
    constructor(configFile?: string);
    /**
     * Get config file path
     */
    getConfigPath(): string;
    /**
     * Check if config file exists
     */
    exists(): Promise<boolean>;
    /**
     * Check if config file exists (sync)
     */
    existsSync(): boolean;
    /**
     * Initialize config file with default template
     */
    initialize(): Promise<void>;
    /**
     * Load configuration from file
     */
    load(): Promise<LSHConfig>;
    /**
     * Load configuration from file (sync)
     */
    loadSync(): LSHConfig;
    /**
     * Save configuration to file
     */
    save(config: LSHConfig): Promise<void>;
    /**
     * Get a specific config value
     */
    get(key: string): string | undefined;
    /**
     * Set a specific config value
     */
    set(key: string, value: string): Promise<void>;
    /**
     * Delete a specific config value
     */
    delete(key: string): Promise<void>;
    /**
     * Get all config values
     */
    getAll(): LSHConfig;
    /**
     * Merge config with process.env
     * Config file values are loaded into process.env, but existing environment
     * variables take precedence (config provides defaults)
     */
    mergeWithEnv(): void;
}
/**
 * Get global config manager
 */
export declare function getConfigManager(): ConfigManager;
/**
 * Load global configuration and merge with process.env
 * This should be called early in the application startup
 */
export declare function loadGlobalConfig(): Promise<LSHConfig>;
/**
 * Load global configuration synchronously and merge with process.env
 */
export declare function loadGlobalConfigSync(): LSHConfig;
export default ConfigManager;
