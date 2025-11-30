/**
 * HTTP/API strings
 *
 * All API endpoints, HTTP headers, content types, and API-related constants.
 */

export const ENDPOINTS = {
  // Health and status
  HEALTH: '/health',
  ROOT: '/',

  // Authentication (legacy)
  AUTH: '/api/auth',
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGIN: '/auth/login',
  AUTH_API_KEY: '/auth/api-key',

  // Jobs API
  API_STATUS: '/api/status',
  API_JOBS: '/api/jobs',
  API_JOB_BY_ID: '/api/jobs/:id',
  API_JOB_START: '/api/jobs/:id/start',
  API_JOB_STOP: '/api/jobs/:id/stop',
  API_JOB_TRIGGER: '/api/jobs/:id/trigger',
  API_JOB_DELETE: '/api/jobs/:id',
  API_JOBS_BULK: '/api/jobs/bulk',

  // Events and webhooks
  API_EVENTS: '/api/events',
  API_WEBHOOKS: '/api/webhooks',

  // Export
  API_EXPORT_JOBS: '/api/export/jobs',

  // Supabase sync
  API_SUPABASE_SYNC: '/api/supabase/sync',

  // CI/CD Webhooks
  WEBHOOK_GITHUB: '/webhook/github',
  WEBHOOK_GITLAB: '/webhook/gitlab',
  WEBHOOK_JENKINS: '/webhook/jenkins',

  // Dashboard
  DASHBOARD_ROOT: '/dashboard/',
  DASHBOARD: '/dashboard/',
  DASHBOARD_ANALYTICS: '/dashboard/analytics',
  DASHBOARD_ADMIN: '/dashboard/admin',

  // Pipeline and metrics API
  API_PIPELINES: '/api/pipelines',
  API_METRICS: '/api/metrics',

  // Analytics endpoints
  API_ANALYTICS_REPORT: '/api/analytics/report',
  API_ANALYTICS_TRENDS: '/api/analytics/trends',
  API_ANALYTICS_ANOMALIES: '/api/analytics/anomalies',
  API_ANALYTICS_INSIGHTS: '/api/analytics/insights',
  API_ANALYTICS_PREDICTIONS: '/api/analytics/predictions',
  API_ANALYTICS_COSTS: '/api/analytics/costs',
  API_ANALYTICS_BOTTLENECKS: '/api/analytics/bottlenecks',

  // SaaS API v1 - Authentication
  API_V1_AUTH_SIGNUP: '/api/v1/auth/signup',
  API_V1_AUTH_LOGIN: '/api/v1/auth/login',
  API_V1_AUTH_VERIFY_EMAIL: '/api/v1/auth/verify-email',
  API_V1_AUTH_RESEND_VERIFICATION: '/api/v1/auth/resend-verification',
  API_V1_AUTH_REFRESH: '/api/v1/auth/refresh',
  API_V1_AUTH_ME: '/api/v1/auth/me',

  // SaaS API v1 - Organizations
  API_V1_ORGANIZATIONS: '/api/v1/organizations',
  API_V1_ORGANIZATION: '/api/v1/organizations/:organizationId',
  API_V1_ORGANIZATION_MEMBERS: '/api/v1/organizations/:organizationId/members',
  API_V1_ORGANIZATION_TEAMS: '/api/v1/organizations/:organizationId/teams',
  API_V1_ORGANIZATION_AUDIT: '/api/v1/organizations/:organizationId/audit',
  API_V1_ORGANIZATION_BILLING_SUBSCRIPTION: '/api/v1/organizations/:organizationId/billing/subscription',
  API_V1_ORGANIZATION_BILLING_CHECKOUT: '/api/v1/organizations/:organizationId/billing/checkout',

  // SaaS API v1 - Teams
  API_V1_TEAM_SECRETS: '/api/v1/teams/:teamId/secrets',
  API_V1_TEAM_SECRET: '/api/v1/teams/:teamId/secrets/:secretId',
  API_V1_TEAM_SECRET_RETRIEVE: '/api/v1/teams/:teamId/secrets/:secretId/retrieve',
  API_V1_TEAM_SECRETS_EXPORT: '/api/v1/teams/:teamId/secrets/export/env',
  API_V1_TEAM_SECRETS_IMPORT: '/api/v1/teams/:teamId/secrets/import/env',

  // SaaS API v1 - Webhooks
  API_V1_WEBHOOKS_STRIPE: '/api/v1/webhooks/stripe',
  API_V1_BILLING_WEBHOOKS: '/api/v1/billing/webhooks',
  API_V1_ORGANIZATION_AUDIT_LOGS: '/api/v1/organizations/:organizationId/audit-logs',

  // API Info/Documentation (patterns)
  API_V1_ROOT: '/api/v1',
  API_V1_AUTH_WILDCARD: '/api/v1/auth/*',
  API_V1_ORGANIZATIONS_WILDCARD: '/api/v1/organizations/*',
  API_V1_ORG_TEAMS_WILDCARD: '/api/v1/organizations/:id/teams/*',
  API_V1_TEAMS_SECRETS_WILDCARD: '/api/v1/teams/:id/secrets/*',
  API_V1_ORG_BILLING_WILDCARD: '/api/v1/organizations/:id/billing/*',
  API_V1_ORG_AUDIT_LOGS: '/api/v1/organizations/:id/audit-logs',
} as const;

export const HTTP_HEADERS = {
  // Standard headers
  CONTENT_TYPE: 'Content-Type',
  CACHE_CONTROL: 'Cache-Control',
  CONNECTION: 'Connection',
  AUTHORIZATION: 'authorization',

  // Custom headers
  X_API_KEY: 'x-api-key',
  X_ACCEL_BUFFERING: 'X-Accel-Buffering',

  // Webhook headers
  GITHUB_SIGNATURE: 'x-hub-signature-256',
  GITLAB_TOKEN: 'x-gitlab-token',
  JENKINS_TOKEN: 'x-jenkins-token',
} as const;

export const CONTENT_TYPES = {
  EVENT_STREAM: 'text/event-stream',
  JSON: 'application/json',
  TEXT_PLAIN: 'text/plain',
} as const;

export const CACHE_CONTROL_VALUES = {
  NO_CACHE: 'no-cache',
} as const;

export const CONNECTION_VALUES = {
  KEEP_ALIVE: 'keep-alive',
} as const;

export const X_ACCEL_BUFFERING_VALUES = {
  NO: 'no',
} as const;

export const AUTH = {
  BEARER_PREFIX: 'Bearer ',
} as const;

export const SOCKET_EVENTS = {
  PIPELINE_UPDATE: 'pipeline_event',
  METRICS_UPDATE: 'metrics_update',
} as const;

export const METRICS = {
  TOTAL_BUILDS: 'total_builds',
  SUCCESSFUL_BUILDS: 'successful_builds',
  FAILED_BUILDS: 'failed_builds',
} as const;

export const REDIS_KEY_TEMPLATES = {
  PIPELINE: 'pipeline:${eventId}',
} as const;
