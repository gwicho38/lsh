/**
 * HTTP/API strings
 *
 * All API endpoints, HTTP headers, content types, and API-related constants.
 */
export declare const ENDPOINTS: {
    readonly HEALTH: "/health";
    readonly ROOT: "/";
    readonly AUTH: "/api/auth";
    readonly AUTH_REGISTER: "/auth/register";
    readonly AUTH_LOGIN: "/auth/login";
    readonly AUTH_API_KEY: "/auth/api-key";
    readonly API_STATUS: "/api/status";
    readonly API_JOBS: "/api/jobs";
    readonly API_JOB_BY_ID: "/api/jobs/:id";
    readonly API_JOB_START: "/api/jobs/:id/start";
    readonly API_JOB_STOP: "/api/jobs/:id/stop";
    readonly API_JOB_TRIGGER: "/api/jobs/:id/trigger";
    readonly API_JOB_DELETE: "/api/jobs/:id";
    readonly API_JOBS_BULK: "/api/jobs/bulk";
    readonly API_EVENTS: "/api/events";
    readonly API_WEBHOOKS: "/api/webhooks";
    readonly API_EXPORT_JOBS: "/api/export/jobs";
    readonly API_SUPABASE_SYNC: "/api/supabase/sync";
    readonly WEBHOOK_GITHUB: "/webhook/github";
    readonly WEBHOOK_GITLAB: "/webhook/gitlab";
    readonly WEBHOOK_JENKINS: "/webhook/jenkins";
    readonly DASHBOARD_ROOT: "/dashboard/";
    readonly DASHBOARD: "/dashboard/";
    readonly DASHBOARD_ANALYTICS: "/dashboard/analytics";
    readonly DASHBOARD_ADMIN: "/dashboard/admin";
    readonly API_PIPELINES: "/api/pipelines";
    readonly API_METRICS: "/api/metrics";
    readonly API_ANALYTICS_REPORT: "/api/analytics/report";
    readonly API_ANALYTICS_TRENDS: "/api/analytics/trends";
    readonly API_ANALYTICS_ANOMALIES: "/api/analytics/anomalies";
    readonly API_ANALYTICS_INSIGHTS: "/api/analytics/insights";
    readonly API_ANALYTICS_PREDICTIONS: "/api/analytics/predictions";
    readonly API_ANALYTICS_COSTS: "/api/analytics/costs";
    readonly API_ANALYTICS_BOTTLENECKS: "/api/analytics/bottlenecks";
};
export declare const HTTP_HEADERS: {
    readonly CONTENT_TYPE: "Content-Type";
    readonly CACHE_CONTROL: "Cache-Control";
    readonly CONNECTION: "Connection";
    readonly AUTHORIZATION: "authorization";
    readonly X_API_KEY: "x-api-key";
    readonly X_ACCEL_BUFFERING: "X-Accel-Buffering";
    readonly GITHUB_SIGNATURE: "x-hub-signature-256";
    readonly GITLAB_TOKEN: "x-gitlab-token";
    readonly JENKINS_TOKEN: "x-jenkins-token";
};
export declare const CONTENT_TYPES: {
    readonly EVENT_STREAM: "text/event-stream";
    readonly JSON: "application/json";
    readonly TEXT_PLAIN: "text/plain";
};
export declare const CACHE_CONTROL_VALUES: {
    readonly NO_CACHE: "no-cache";
};
export declare const CONNECTION_VALUES: {
    readonly KEEP_ALIVE: "keep-alive";
};
export declare const X_ACCEL_BUFFERING_VALUES: {
    readonly NO: "no";
};
export declare const AUTH: {
    readonly BEARER_PREFIX: "Bearer ";
};
export declare const SOCKET_EVENTS: {
    readonly PIPELINE_UPDATE: "pipeline_event";
    readonly METRICS_UPDATE: "metrics_update";
};
export declare const METRICS: {
    readonly TOTAL_BUILDS: "total_builds";
    readonly SUCCESSFUL_BUILDS: "successful_builds";
    readonly FAILED_BUILDS: "failed_builds";
};
export declare const REDIS_KEY_TEMPLATES: {
    readonly PIPELINE: "pipeline:${eventId}";
};
