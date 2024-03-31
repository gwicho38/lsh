/**
 * When called from a child process with IPC enabled, it will send an error to the parent
 * process.
 *
 * @param error The error thrown
 */
export declare function reportSubProcessError(error: unknown): void;
