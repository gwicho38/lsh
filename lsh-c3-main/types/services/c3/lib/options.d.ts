import SubProcessMachineContext from "./SubProcessMachineContext";
import Logger from "./Logger";
import * as Events from "./events";
declare const usageMessage: (executable: string) => string;
type ConnectionSettings = {
    url: string;
    actionId?: string;
    authToken: string;
    user?: string;
    pvtKey?: string;
    tenant?: string;
    tag?: string;
    appUrl?: string;
};
/**
 * Contains the necessary information to start and manage the sub processes.
 *
 * These are mapped from the CliArguments type to represent the same values but
 * in a different shape and naming conventions, taking into consideration JS
 * best practices instead of CLI. (for example: camelCase instead of kebab-case,
 * or no reserved words like 'package')
 */
interface SubProcessMachineOptions {
    connection: ConnectionSettings;
    rootPackageName: string;
    uiNamespace: string;
    /**
     * The C3 application repositories as a single path
     */
    c3Apps: string;
    /**
     * Whether to run the setup work directory sub process.
     */
    setup: boolean;
    /**
     * The working directory where the UI files will be installed and bundled
     */
    workDir: string;
    /**
     * Whether to run the repository watcher sub process.
     */
    watcher: boolean;
    /**
     * Whether to run the bundler
     */
    bundler: boolean;
    /**
     * Controls how much memory is allocated for the bundler sub process.
     */
    bundlerMaxMem: number;
    /**
     * Webpack dev server port
     */
    port: number;
    /**
     * The webpack mode
     */
    mode: "production" | "development";
    /**
     * The root directory of this package.
     */
    rootDir: string;
    /**
     * Whether to include test files and plugins for testing (like rewire, code coverage, etc)
     */
    withTests: boolean;
    /**
     * Whether to instrument files for code coverage report generation after test run
     */
    codeCoverage: boolean;
    /**
     * The names of the configs to build, separated by semicolon ";"
     */
    configNames?: string;
    /**
     * When defined, indicates the config index to be bundled, otherwise all configs are bundled
     */
    singleConfig?: number;
    /**
     * When true, the process will exit upon completion instead of staying alive and awaiting file changes.
     */
    singleRun: boolean;
    /**
     * When defined, the bundled files will be written to this directory. Otherwise, they only remain in-memory.
     */
    outDir?: string;
    /**
     * When enabled, the emitted bundle files will be sent to the connected server.
     */
    emitToServer?: boolean;
    /**
     * When defined, the subprocesses will create `.out` (STDOUT) and `.err` (STDERR) files.
     */
    logDir?: string;
    logger: Logger;
    /**
     * Whether to skip initial loading in repoWatcher subprocess
     */
    skipInitialLoader: boolean;
    /**
     * Server version
     */
    serverVersion?: string;
}
/**
 * The allowed arguments from the command line.
 *
 * These follow the same patterns that C3 CLI uses, like kebab-case and single letter aliases.
 */
interface CliArguments {
    help: boolean;
    h: boolean;
    version: boolean;
    url: string;
    e: string;
    authToken: string;
    "auth-token": string;
    T: string;
    adminUser: string;
    pvtKey: string;
    tenant: string;
    t: string;
    tag: string;
    g: string;
    c3Apps: string;
    c3apps: string;
    a: string;
    package: string;
    c: string;
    setup: boolean;
    "work-dir": string;
    W: string;
    watcher: boolean;
    "skip-initial-loader": boolean;
    bundler: boolean;
    "bundler-port": number;
    "bundler-max-mem": number;
    "ui-namespace": string;
    "with-tests": boolean;
    "code-coverage": boolean;
    mode: "production" | "development";
    "out-dir": string;
    "single-config": number;
    "single-run": boolean;
    "emit-to-server": boolean;
    "config-names": string;
    "log-dir": string;
}
type PartialSubProcessMachineOptions = Partial<Omit<SubProcessMachineOptions, "connection">> & {
    connection: Partial<ConnectionSettings>;
};
type ListenerFunk = (context: SubProcessMachineContext, event?: Events.BundlerProcessEvent, memoryUsage?: number) => void;
type ListenerOptions = {
    /**
     * Executed when the setupWorkDir process starts
     */
    onSetupWorkDirStart?: ListenerFunk;
    /**
     * Executed when the setupWorkDir process finishes
     */
    onSetupWorkDirComplete?: ListenerFunk;
    /**
     * Executed when the repoWatcher process starts
     */
    onRepoWatcherStart?: ListenerFunk;
    /**
     * Executed when the repoWatcher process finishes
     */
    onRepoWatcherComplete?: ListenerFunk;
    /**
     * Executed when the bundling process starts
     */
    onBundlerStart?: ListenerFunk;
    /**
     * Executed when the bundling process finishes
     */
    onBundlerComplete?: ListenerFunk;
    /**
     * Executed on log event
     */
    onLog?: ListenerFunk;
    /**
     * Executed when the main process is finished
     */
    onDone?: ListenerFunk;
    /**
     * Executed when the process is reset back to setupWorkDir
     */
    onReset?: ListenerFunk;
    /**
     * Executed on error event
     */
    onError?: ListenerFunk;
    /**
     * Executed when a request to the server url redirects for authentication.
     */
    onConnectionRedirect?: ListenerFunk;
};
declare class Options {
    values: SubProcessMachineOptions;
    /**
     * Don't use directly because you will want to ensure defaults are added.
     *
     * Instead use fromArgs or initialize, those handle adding default values.
     *
     * @param options The options that this object will hold
     */
    constructor(options: SubProcessMachineOptions);
    static initialize(options: PartialSubProcessMachineOptions): Promise<Options>;
    static fromArgs(args: Partial<CliArguments>): Promise<Options>;
    static addDefaults(options: PartialSubProcessMachineOptions): Promise<SubProcessMachineOptions>;
}
export { SubProcessMachineOptions, CliArguments, Options, ListenerOptions, usageMessage, };
