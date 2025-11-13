/**
 * Command names and CLI strings
 *
 * All command names, subcommands, and CLI-related strings.
 */
export declare const CLI: {
    readonly NAME: "lsh";
    readonly DESCRIPTION: "LSH - Encrypted secrets manager with automatic rotation and team sync";
    readonly BANNER: "LSH - Encrypted Secrets Manager with Automatic Rotation";
};
export declare const COMMANDS: {
    readonly SCRIPT: "script <file>";
    readonly CONFIG: "config";
    readonly ZSH: "zsh";
    readonly HELP: "help";
    readonly PUSH: "push";
    readonly PULL: "pull";
    readonly LIST: "list";
    readonly ENV: "env [environment]";
    readonly KEY: "key";
    readonly CREATE: "create";
    readonly SYNC: "sync";
    readonly STATUS: "status";
    readonly INFO: "info";
    readonly GET: "get [key]";
    readonly SET: "set [key] [value]";
    readonly DELETE: "delete";
};
export declare const JOB_COMMANDS: {
    readonly SECRETS_SYNC: "secrets_sync";
};
export declare const JOB_STATUSES: {
    readonly CREATED: "created";
    readonly RUNNING: "running";
    readonly STOPPED: "stopped";
    readonly COMPLETED: "completed";
    readonly FAILED: "failed";
    readonly KILLED: "killed";
};
export declare const JOB_TYPES: {
    readonly SHELL: "shell";
    readonly SYSTEM: "system";
    readonly SCHEDULED: "scheduled";
    readonly SERVICE: "service";
};
export declare const IPC_COMMANDS: {
    readonly STATUS: "status";
    readonly ADD_JOB: "addJob";
    readonly START_JOB: "startJob";
    readonly TRIGGER_JOB: "triggerJob";
    readonly STOP_JOB: "stopJob";
    readonly LIST_JOBS: "listJobs";
    readonly GET_JOB: "getJob";
    readonly REMOVE_JOB: "removeJob";
    readonly RESTART: "restart";
    readonly STOP: "stop";
};
export declare const PLATFORMS: {
    readonly GITHUB: "github";
    readonly GITLAB: "gitlab";
    readonly JENKINS: "jenkins";
};
