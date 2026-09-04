import { jest } from '@jest/globals';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const resolveMock = jest.fn();
const downloadMock = jest.fn();

jest.unstable_mockModule('../lib/discovery-backend.js', () => ({
  getDiscoveryBackend: () => ({ id: 'test', resolve: resolveMock, publish: jest.fn() }),
}));

jest.unstable_mockModule('../lib/ipfs-sync.js', () => ({
  getIPFSSync: () => ({ download: downloadMock }),
}));

const { IPFSSecretsStorage } = await import('../lib/ipfs-secrets-storage.js');

describe('IPFSSecretsStorage.pull metadata', () => {
  const key = crypto.randomBytes(32).toString('hex');
  const secrets = [
    { key: 'API_KEY', value: 'abc' },
    { key: 'DB_URL', value: 'postgres://x' },
  ];
  const cid = 'bafytestcid';
  let home: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    originalHome = process.env.HOME;
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-keys-count-'));
    process.env.HOME = home;

    resolveMock.mockReset();
    downloadMock.mockReset();
    resolveMock.mockResolvedValue({ name: 'k51testnameforresolution', cid });
  });

  afterEach(() => {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('should record the decrypted secret count, not the placeholder zero', async () => {
    const storage = new IPFSSecretsStorage();
    downloadMock.mockResolvedValue(Buffer.from((storage as any).encryptSecrets(secrets, key), 'utf-8'));

    const pulled = await storage.pull('dev', key, 'demo-repo');

    expect(pulled).toHaveLength(2);
    expect(storage.getMetadata('dev', 'demo-repo')?.keys_count).toBe(2);
  });

  it('should leave the resolved CID on the metadata row', async () => {
    const storage = new IPFSSecretsStorage();
    downloadMock.mockResolvedValue(Buffer.from((storage as any).encryptSecrets(secrets, key), 'utf-8'));

    await storage.pull('dev', key, 'demo-repo');

    expect(storage.getMetadata('dev', 'demo-repo')?.cid).toBe(cid);
  });
});
