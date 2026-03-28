/**
 * IPFS Client Manager
 * Detects, installs, and manages IPFS clients across platforms
 */
export interface IPFSClientInfo {
    installed: boolean;
    version?: string;
    path?: string;
    type?: 'kubo' | 'helia' | 'js-ipfs' | 'go-ipfs';
}
export interface InstallOptions {
    force?: boolean;
    version?: string;
    installPath?: string;
}
/**
 * IPFS Client Manager
 *
 * Manages IPFS client installation and configuration:
 * 1. Kubo (formerly go-ipfs) - Official Go implementation
 * 2. Helia - Modern JavaScript implementation
 * 3. js-ipfs - Legacy JavaScript implementation (deprecated)
 */
export declare class IPFSClientManager {
    private lshDir;
    private ipfsDir;
    private binDir;
    constructor();
    /**
     * Detect if IPFS client is installed
     */
    detect(): Promise<IPFSClientInfo>;
    /**
     * Install IPFS client
     */
    install(options?: InstallOptions): Promise<void>;
    /**
     * Uninstall LSH-managed IPFS client
     */
    uninstall(): Promise<void>;
    /**
     * Initialize IPFS repository
     */
    init(): Promise<void>;
    /**
     * Get the IPFS repo path used by lsh
     */
    getRepoPath(): string;
    /**
     * Start IPFS daemon
     */
    start(): Promise<void>;
    /**
     * Wait for daemon API to become ready
     */
    private waitForDaemon;
    /**
     * Stop IPFS daemon
     */
    stop(): Promise<void>;
    /**
     * Get latest Kubo version from GitHub releases
     */
    private getLatestKuboVersion;
    /**
     * Install Kubo on macOS
     */
    private installKuboMacOS;
    /**
     * Install Kubo on Linux
     */
    private installKuboLinux;
    /**
     * Install Kubo on Windows
     */
    private installKuboWindows;
    /**
     * Ensure IPFS daemon is installed and running.
     * Prompts once for install consent, then auto-manages daemon lifecycle.
     */
    ensureDaemonRunning(): Promise<void>;
    /**
     * Check if daemon API is responding
     */
    private isDaemonRunning;
    /**
     * Prompt user for input via readline
     */
    private promptUser;
    /**
     * Ensure required directories exist
     */
    private ensureDirectories;
}
