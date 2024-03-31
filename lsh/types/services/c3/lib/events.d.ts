import SUBPROCESS from "./SUBPROCESS";
type FailEvent = {
    type: "FAIL";
    message: string;
};
type UpdateTokenEvent = {
    type: "UPDATE_TOKEN";
    token: string;
};
type IncrementalFileUpdateEvent = BundlerProcessEvent & {
    type: "INCREMENTAL_FILE_UPDATE";
    fileName?: string;
    loaderType?: string;
};
type RefreshTokenEvent = {
    type: "REFRESH_AUTH_TOKEN";
};
/**
 * All the events that the sub process machine can handle
 */
type SubProcessMachineEvent = {
    type: "START";
} | {
    type: "RESTART";
} | FailEvent | {
    type: "RESET";
} | LogEvent | {
    type: "STOP";
} | SubProcessEvent | UpdateTokenEvent | RefreshTokenEvent;
/**
 * Events emmitted by sub processes. This is different from SubProcessMachineEvent because
 * the SubProcessMachine uses events to transition between states, and these other events are
 * not driving the SubProcessMachine state logic, they are just inter-process communication.
 */
type SubProcessEvent = BundleFinishedEvent | InvalidateDraftEvent | SubProcessErrorEvent | UpdateTokenEvent | StateFinishedEvent | IncrementalFileUpdateEvent;
/**
 * An event representing a log message from a sub process
 */
type LogEvent = {
    type: "LOG";
    /**
     * The name of the sub process
     */
    name: SUBPROCESS;
    /**
     * The log message
     */
    message: string;
    /**
     * Time stamp indicating when the log message was sent
     */
    timestamp: number;
    /**
     * Whether this is an error event
     */
    isError?: boolean;
};
type BundlerProcessEvent = {
    timestamp?: number;
};
type StateFinishedEvent = {
    type: "DONE";
    maxMemory: number;
    subProcessSetupTime?: number;
    npmInstallTime?: number;
};
type SetupWorkDirStartEvent = BundlerProcessEvent & {
    type?: "SETUP_WORK_DIR_START";
    maxMemory?: number;
};
type SetupWorkDirCompleteEvent = BundlerProcessEvent & {
    type?: "SETUP_WORK_DIR_COMPLETE";
    npmInstallTime?: number;
    subProcessSetupTime?: number;
    maxMemory?: number;
};
type RepoWatcherStartEvent = BundlerProcessEvent & {
    type?: "REPO_WATCHER_START";
    maxMemory?: number;
};
type RepoWatcherEndEvent = BundlerProcessEvent & {
    type?: "REPO_WATCHER_END";
    subProcessSetupTime?: number;
    maxMemory?: number;
};
type BundleStartEvent = BundlerProcessEvent & {
    type?: "BUNDLE_START";
    maxMemory?: number;
};
type BundleFinishedEvent = BundlerProcessEvent & {
    type: "BUNDLE_FINISHED";
    maxMemory?: number;
    port?: number;
    subProcessSetupTime?: number;
    isIncrementalFileUpdate?: boolean;
    fileName?: string;
    loaderType?: string;
};
type InvalidateDraftEvent = {
    type: "INVALIDATE_DRAFT";
};
type SubProcessErrorEvent = {
    type: "error";
    message: string;
    stack: string[];
};
export { SubProcessMachineEvent, SubProcessEvent, FailEvent, LogEvent, StateFinishedEvent, IncrementalFileUpdateEvent, InvalidateDraftEvent, UpdateTokenEvent, BundlerProcessEvent, SetupWorkDirStartEvent, SetupWorkDirCompleteEvent, RepoWatcherStartEvent, RepoWatcherEndEvent, BundleStartEvent, BundleFinishedEvent, };
