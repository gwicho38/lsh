import { jest } from '@jest/globals';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SecretsManager } from '../lib/secrets-manager.js';

describe('smartSync storage namespace', () => {
  const key = crypto.randomBytes(32).toString('hex');
  let envDir: string;
  let envFile: string;
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.LSH_SECRETS_KEY;
    process.env.LSH_SECRETS_KEY = key;
    envDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-sync-ns-'));
    envFile = path.join(envDir, '.env');
    fs.writeFileSync(envFile, 'API_KEY=abc\n', 'utf8');
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.LSH_SECRETS_KEY;
    else process.env.LSH_SECRETS_KEY = originalKey;
    fs.rmSync(envDir, { recursive: true, force: true });
  });

  function managerWithRecordingStorage(repoName: string) {
    const seen: Array<{ environment: string; gitRepo?: string }> = [];
    const manager = new SecretsManager(undefined, key, false);
    (manager as any).gitInfo = { repoName, isGitRepo: false };
    (manager as any).storage = {
      exists: (environment: string, gitRepo?: string) => {
        seen.push({ environment, gitRepo });
        return false;
      },
      getMetadata: () => undefined,
      pull: async () => [],
    };
    return { manager, seen };
  }

  it('should query the raw environment, letting storage add the repo prefix', async () => {
    const { manager, seen } = managerWithRecordingStorage('demo-repo');

    await manager.smartSync(envFile, 'dev', false);

    expect(seen).toEqual([{ environment: 'dev', gitRepo: 'demo-repo' }]);
  });

  it('should not prefix the environment a second time', async () => {
    const { manager, seen } = managerWithRecordingStorage('demo-repo');

    await manager.smartSync(envFile, 'dev', false);

    expect(seen.map((call) => call.environment)).not.toContain('demo-repo_dev');
  });

  it('should query the same namespace push resolves for the repo default', async () => {
    const { manager, seen } = managerWithRecordingStorage('demo-repo');

    await manager.smartSync(envFile, '', false);

    expect(seen).toEqual([{ environment: '', gitRepo: 'demo-repo' }]);
  });
});
