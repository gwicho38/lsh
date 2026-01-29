/**
 * IPFS Client Manager
 * Detects, installs, and manages IPFS clients across platforms
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from './logger.js';
import { getPlatformInfo } from './platform-utils.js';

const execAsync = promisify(exec);
const logger = createLogger('IPFSClientManager');

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
export class IPFSClientManager {
  private lshDir: string;
  private ipfsDir: string;
  private binDir: string;

  constructor() {
    this.lshDir = path.join(os.homedir(), '.lsh');
    this.ipfsDir = path.join(this.lshDir, 'ipfs');
    this.binDir = path.join(this.ipfsDir, 'bin');

    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Detect if IPFS client is installed
   */
  async detect(): Promise<IPFSClientInfo> {
    // Check for system-wide Kubo installation
    try {
      const { stdout: kuboVersion } = await execAsync('ipfs version');
      const versionMatch = kuboVersion.match(/ipfs version ([0-9.]+)/);

      if (versionMatch) {
        const { stdout: kuboPath } = await execAsync('which ipfs');
        return {
          installed: true,
          version: versionMatch[1],
          path: kuboPath.trim(),
          type: 'kubo',
        };
      }
    } catch {
      // Kubo not found in system PATH
    }

    // Check for local LSH-managed installation
    const localIpfsPath = path.join(this.binDir, 'ipfs');
    if (fs.existsSync(localIpfsPath)) {
      try {
        const { stdout: localVersion } = await execAsync(`${localIpfsPath} version`);
        const versionMatch = localVersion.match(/ipfs version ([0-9.]+)/);

        if (versionMatch) {
          return {
            installed: true,
            version: versionMatch[1],
            path: localIpfsPath,
            type: 'kubo',
          };
        }
      } catch {
        // Local binary exists but not working
      }
    }

    return {
      installed: false,
    };
  }

  /**
   * Install IPFS client
   */
  async install(options: InstallOptions = {}): Promise<void> {
    const platformInfo = getPlatformInfo();
    const clientInfo = await this.detect();

    // Check if already installed
    if (clientInfo.installed && !options.force) {
      logger.info(`✅ IPFS already installed: ${clientInfo.type} v${clientInfo.version}`);
      logger.info(`   Path: ${clientInfo.path}`);
      return;
    }

    logger.info('📦 Installing IPFS client (Kubo)...');

    // Determine version to install
    const version = options.version || await this.getLatestKuboVersion();
    logger.info(`   Version: ${version}`);
    logger.info(`   Platform: ${platformInfo.platformName} ${platformInfo.arch}`);

    // Download and install based on platform
    try {
      if (platformInfo.platform === 'darwin') {
        await this.installKuboMacOS(version);
      } else if (platformInfo.platform === 'linux') {
        await this.installKuboLinux(version);
      } else if (platformInfo.platform === 'win32') {
        await this.installKuboWindows(version);
      } else {
        throw new Error(`Unsupported platform: ${platformInfo.platform}`);
      }

      logger.info('✅ IPFS client installed successfully!');

      // Verify installation
      const verifyInfo = await this.detect();
      if (verifyInfo.installed) {
        logger.info(`   Version: ${verifyInfo.version}`);
        logger.info(`   Path: ${verifyInfo.path}`);
      }
    } catch (error) {
      const err = error as Error;
      logger.error(`❌ Installation failed: ${err.message}`);
      throw error;
    }
  }

  /**
   * Uninstall LSH-managed IPFS client
   */
  async uninstall(): Promise<void> {
    const clientInfo = await this.detect();

    if (!clientInfo.installed) {
      logger.info('ℹ️  No IPFS client installed');
      return;
    }

    // Only uninstall if it's LSH-managed
    if (clientInfo.path?.startsWith(this.binDir)) {
      logger.info('🗑️  Uninstalling LSH-managed IPFS client...');

      if (fs.existsSync(this.ipfsDir)) {
        fs.rmSync(this.ipfsDir, { recursive: true });
      }

      logger.info('✅ IPFS client uninstalled');
    } else {
      logger.info('ℹ️  System-wide IPFS installation detected');
      logger.info('   LSH cannot uninstall system packages');
      logger.info(`   Path: ${clientInfo.path}`);
    }
  }

  /**
   * Initialize IPFS repository
   */
  async init(): Promise<void> {
    const clientInfo = await this.detect();

    if (!clientInfo.installed) {
      throw new Error('IPFS client not installed. Run: lsh ipfs install');
    }

    const ipfsRepoPath = path.join(this.ipfsDir, 'repo');

    // Check if already initialized
    if (fs.existsSync(path.join(ipfsRepoPath, 'config'))) {
      logger.info('✅ IPFS repository already initialized');
      return;
    }

    logger.info('🔧 Initializing IPFS repository...');

    try {
      const ipfsCmd = clientInfo.path || 'ipfs';
      await execAsync(`${ipfsCmd} init`, {
        env: { ...process.env, IPFS_PATH: ipfsRepoPath },
      });

      logger.info('✅ IPFS repository initialized');
      logger.info(`   Path: ${ipfsRepoPath}`);
    } catch (error) {
      const err = error as Error;
      logger.error(`❌ Initialization failed: ${err.message}`);
      throw error;
    }
  }

  /**
   * Start IPFS daemon
   */
  async start(): Promise<void> {
    const clientInfo = await this.detect();

    if (!clientInfo.installed) {
      throw new Error('IPFS client not installed. Run: lsh ipfs install');
    }

    logger.info('🚀 Starting IPFS daemon...');

    const ipfsRepoPath = path.join(this.ipfsDir, 'repo');
    const ipfsCmd = clientInfo.path || 'ipfs';

    try {
      // Start daemon in background
      const daemon = exec(`${ipfsCmd} daemon`, {
        env: { ...process.env, IPFS_PATH: ipfsRepoPath },
      });

      // Log PID for management
      const pidPath = path.join(this.ipfsDir, 'daemon.pid');
      if (daemon.pid) {
        fs.writeFileSync(pidPath, daemon.pid.toString(), 'utf8');
      }

      logger.info('✅ IPFS daemon started');
      logger.info(`   PID: ${daemon.pid}`);
      logger.info('   API: http://localhost:5001');
      logger.info('   Gateway: http://localhost:8080');
    } catch (error) {
      const err = error as Error;
      logger.error(`❌ Failed to start daemon: ${err.message}`);
      throw error;
    }
  }

  /**
   * Stop IPFS daemon
   */
  async stop(): Promise<void> {
    const pidPath = path.join(this.ipfsDir, 'daemon.pid');

    if (!fs.existsSync(pidPath)) {
      logger.info('ℹ️  IPFS daemon not running (no PID file)');
      return;
    }

    const pid = parseInt(fs.readFileSync(pidPath, 'utf8'), 10);

    logger.info(`🛑 Stopping IPFS daemon (PID: ${pid})...`);

    try {
      process.kill(pid, 'SIGTERM');
      fs.unlinkSync(pidPath);
      logger.info('✅ IPFS daemon stopped');
    } catch (error) {
      const err = error as Error;
      logger.error(`❌ Failed to stop daemon: ${err.message}`);
      throw error;
    }
  }

  /**
   * Get latest Kubo version from GitHub releases
   */
  private async getLatestKuboVersion(): Promise<string> {
    try {
      // Use GitHub API to get latest release
      const response = await fetch('https://api.github.com/repos/ipfs/kubo/releases/latest');
      const data = await response.json() as { tag_name: string };

      // Remove 'v' prefix if present
      return data.tag_name.replace(/^v/, '');
    } catch {
      // Fallback to known stable version
      return '0.26.0';
    }
  }

  /**
   * Install Kubo on macOS
   */
  private async installKuboMacOS(version: string): Promise<void> {
    const arch = os.arch() === 'arm64' ? 'arm64' : 'amd64';
    const downloadUrl = `https://dist.ipfs.tech/kubo/v${version}/kubo_v${version}_darwin-${arch}.tar.gz`;
    const tarPath = path.join(this.ipfsDir, 'kubo.tar.gz');

    logger.info('   Downloading Kubo...');

    // Download
    await execAsync(`curl -L -o ${tarPath} ${downloadUrl}`);

    logger.info('   Extracting...');

    // Extract
    await execAsync(`tar -xzf ${tarPath} -C ${this.ipfsDir}`);

    // Move binary
    const extractedBinPath = path.join(this.ipfsDir, 'kubo', 'ipfs');
    fs.mkdirSync(this.binDir, { recursive: true });
    fs.renameSync(extractedBinPath, path.join(this.binDir, 'ipfs'));

    // Make executable
    fs.chmodSync(path.join(this.binDir, 'ipfs'), 0o755);

    // Cleanup
    fs.unlinkSync(tarPath);
    fs.rmSync(path.join(this.ipfsDir, 'kubo'), { recursive: true });
  }

  /**
   * Install Kubo on Linux
   */
  private async installKuboLinux(version: string): Promise<void> {
    const arch = os.arch() === 'arm64' ? 'arm64' : 'amd64';
    const downloadUrl = `https://dist.ipfs.tech/kubo/v${version}/kubo_v${version}_linux-${arch}.tar.gz`;
    const tarPath = path.join(this.ipfsDir, 'kubo.tar.gz');

    logger.info('   Downloading Kubo...');

    // Download
    await execAsync(`curl -L -o ${tarPath} ${downloadUrl}`);

    logger.info('   Extracting...');

    // Extract
    await execAsync(`tar -xzf ${tarPath} -C ${this.ipfsDir}`);

    // Move binary
    const extractedBinPath = path.join(this.ipfsDir, 'kubo', 'ipfs');
    fs.mkdirSync(this.binDir, { recursive: true });
    fs.renameSync(extractedBinPath, path.join(this.binDir, 'ipfs'));

    // Make executable
    fs.chmodSync(path.join(this.binDir, 'ipfs'), 0o755);

    // Cleanup
    fs.unlinkSync(tarPath);
    fs.rmSync(path.join(this.ipfsDir, 'kubo'), { recursive: true });
  }

  /**
   * Install Kubo on Windows
   */
  private async installKuboWindows(version: string): Promise<void> {
    const downloadUrl = `https://dist.ipfs.tech/kubo/v${version}/kubo_v${version}_windows-amd64.zip`;
    const zipPath = path.join(this.ipfsDir, 'kubo.zip');

    logger.info('   Downloading Kubo...');

    // Download
    await execAsync(`curl -L -o ${zipPath} ${downloadUrl}`);

    logger.info('   Extracting...');

    // Extract (Windows has built-in tar that supports zip)
    await execAsync(`tar -xf ${zipPath} -C ${this.ipfsDir}`);

    // Move binary
    const extractedBinPath = path.join(this.ipfsDir, 'kubo', 'ipfs.exe');
    fs.mkdirSync(this.binDir, { recursive: true });
    fs.renameSync(extractedBinPath, path.join(this.binDir, 'ipfs.exe'));

    // Cleanup
    fs.unlinkSync(zipPath);
    fs.rmSync(path.join(this.ipfsDir, 'kubo'), { recursive: true });
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    if (!fs.existsSync(this.lshDir)) {
      fs.mkdirSync(this.lshDir, { recursive: true });
    }
    if (!fs.existsSync(this.ipfsDir)) {
      fs.mkdirSync(this.ipfsDir, { recursive: true });
    }
  }
}
