/**
 * Configuration keys and environment variables
 *
 * All environment variable names, configuration keys, and default values.
 */
export declare const ENV_VARS: {
    readonly NODE_ENV: "NODE_ENV";
    readonly USER: "USER";
    readonly HOSTNAME: "HOSTNAME";
    readonly LSH_API_ENABLED: "LSH_API_ENABLED";
    readonly LSH_API_PORT: "LSH_API_PORT";
    readonly LSH_API_KEY: "LSH_API_KEY";
    readonly LSH_JWT_SECRET: "LSH_JWT_SECRET";
    readonly LSH_ALLOW_DANGEROUS_COMMANDS: "LSH_ALLOW_DANGEROUS_COMMANDS";
    readonly LSH_SECRETS_KEY: "LSH_SECRETS_KEY";
    readonly LSH_ENABLE_WEBHOOKS: "LSH_ENABLE_WEBHOOKS";
    readonly WEBHOOK_PORT: "WEBHOOK_PORT";
    readonly GITHUB_WEBHOOK_SECRET: "GITHUB_WEBHOOK_SECRET";
    readonly GITLAB_WEBHOOK_SECRET: "GITLAB_WEBHOOK_SECRET";
    readonly JENKINS_WEBHOOK_SECRET: "JENKINS_WEBHOOK_SECRET";
    readonly DATABASE_URL: "DATABASE_URL";
    readonly SUPABASE_URL: "SUPABASE_URL";
    readonly SUPABASE_ANON_KEY: "SUPABASE_ANON_KEY";
    readonly REDIS_URL: "REDIS_URL";
    readonly MONITORING_API_PORT: "MONITORING_API_PORT";
};
export declare const DEFAULTS: {
    readonly VERSION: "0.5.1";
    readonly API_PORT: 3030;
    readonly WEBHOOK_PORT: 3033;
    readonly MONITORING_API_PORT: 3031;
    readonly REDIS_URL: "redis://localhost:6379";
    readonly DATABASE_URL: "postgresql://localhost:5432/cicd";
    readonly CHECK_INTERVAL_MS: 2000;
    readonly REQUEST_TIMEOUT_MS: 10000;
    readonly MAX_BUFFER_SIZE_BYTES: number;
    readonly MAX_LOG_SIZE_BYTES: number;
    readonly MAX_COMMAND_LENGTH: 10000;
    readonly MAX_COMMAND_CHAINS: 5;
    readonly MAX_PIPE_USAGE: 3;
    readonly REDIS_CACHE_EXPIRY_SECONDS: 3600;
    readonly METRICS_RETENTION_SECONDS: number;
};
