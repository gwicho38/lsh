import { LshConfigManager } from '../lib/lsh-config.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('LshConfigManager ipfs_consent', () => {
  let configPath: string;
  let manager: LshConfigManager;

  beforeEach(() => {
    configPath = path.join(os.tmpdir(), `lsh-test-${Date.now()}`, 'config.json');
    manager = new LshConfigManager(configPath);
  });

  afterEach(() => {
    const dir = path.dirname(configPath);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('returns false when ipfs_consent is not set', () => {
    expect(manager.getIpfsConsent()).toBe(false);
  });

  it('persists ipfs_consent flag', () => {
    manager.setIpfsConsent(true);
    const manager2 = new LshConfigManager(configPath);
    expect(manager2.getIpfsConsent()).toBe(true);
  });
});

import { IPFSClientManager } from '../lib/ipfs-client-manager.js';

describe('IPFSClientManager.ensureDaemonRunning', () => {
  let manager: IPFSClientManager;

  beforeEach(() => {
    manager = new IPFSClientManager();
  });

  it('should be a method on IPFSClientManager', () => {
    expect(typeof manager.ensureDaemonRunning).toBe('function');
  });

  it('should not throw when daemon is already running', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ID: 'test' }), { status: 200 })
    );

    await expect(manager.ensureDaemonRunning()).resolves.not.toThrow();
    jest.restoreAllMocks();
  });
});
