/**
 * File paths and system locations
 *
 * All file paths, directories, and system locations used throughout LSH.
 */
export declare const PATHS: {
    readonly PACKAGE_JSON_RELATIVE: "../package.json";
    readonly LSHRC_FILENAME: ".lshrc";
    readonly ROOT_DIR: "/";
    readonly DEFAULT_HISTORY_FILE: "~/.lsh_history";
    readonly DAEMON_SOCKET_TEMPLATE: "/tmp/lsh-job-daemon-${USER}.sock";
    readonly DAEMON_PID_FILE_TEMPLATE: "/tmp/lsh-job-daemon-${USER}.pid";
    readonly DAEMON_LOG_FILE_TEMPLATE: "/tmp/lsh-job-daemon-${USER}.log";
    readonly DAEMON_JOBS_FILE_TEMPLATE: "/tmp/lsh-daemon-jobs-${USER}.json";
    readonly DEFAULT_JOBS_PERSISTENCE_FILE: "/tmp/lsh-jobs.json";
    readonly JOB_REGISTRY_FILE: "/tmp/lsh-job-registry.json";
    readonly JOB_LOGS_DIR: "/tmp/lsh-job-logs";
};
export declare const PREFIXES: {
    readonly SESSION_ID: "lsh_";
    readonly SECRETS_SEED_SUFFIX: "lsh-secrets";
};
export declare const SYSTEM: {
    readonly UNKNOWN_USER: "unknown";
    readonly DEFAULT_HOSTNAME: "localhost";
};
