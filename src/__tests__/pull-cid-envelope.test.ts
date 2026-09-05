import { jest } from '@jest/globals';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PULL_MESSAGES } from '../constants/ui.js';

const downloadMock = jest.fn();

jest.unstable_mockModule('../lib/ipfs-sync.js', () => ({
  getIPFSSync: () => ({ download: downloadMock }),
}));

const { pullByCidOrRepo } = await import('../commands/pull.js');
const { encryptEnvelope } = await import('../lib/secrets-envelope.js');

function legacyCbcPayload(plaintext: string, encryptionKey: string): string {
  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  return `${iv.toString('hex')}:${cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex')}`;
}

describe('lsh pull --cid', () => {
  const key = crypto.randomBytes(32).toString('hex');
  const existing = 'OLD_KEY=old\n';
  let dir: string;
  let envFile: string;
  let originalKey: string | undefined;
  let contentWhenWarned: string | undefined;

  beforeEach(() => {
    originalKey = process.env.LSH_SECRETS_KEY;
    process.env.LSH_SECRETS_KEY = key;
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-pull-cid-'));
    envFile = path.join(dir, '.env');
    fs.writeFileSync(envFile, existing, 'utf8');
    contentWhenWarned = undefined;
    downloadMock.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation((first?: unknown) => {
      if (first === PULL_MESSAGES.LEGACY_PAYLOAD_WARNING) {
        contentWhenWarned = fs.readFileSync(envFile, 'utf8');
      }
    });
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.LSH_SECRETS_KEY;
    else process.env.LSH_SECRETS_KEY = originalKey;
    fs.rmSync(dir, { recursive: true, force: true });
    process.exitCode = 0;
  });

  it('should decrypt an authenticated envelope and write it', async () => {
    downloadMock.mockResolvedValue(Buffer.from(encryptEnvelope('NEW_KEY=new\n', key), 'utf-8'));

    await pullByCidOrRepo(envFile, 'dev', 'bafytest', undefined, true);

    expect(fs.readFileSync(envFile, 'utf8')).toContain('NEW_KEY=new');
    expect(console.warn).not.toHaveBeenCalledWith(PULL_MESSAGES.LEGACY_PAYLOAD_WARNING);
  });

  it('should warn about a legacy payload while the existing file is still intact', async () => {
    downloadMock.mockResolvedValue(Buffer.from(legacyCbcPayload('NEW_KEY=new\n', key), 'utf-8'));

    await pullByCidOrRepo(envFile, 'dev', 'bafytest', undefined, true);

    expect(console.warn).toHaveBeenCalledWith(PULL_MESSAGES.LEGACY_PAYLOAD_WARNING);
    expect(contentWhenWarned).toBe(existing);
    expect(fs.readFileSync(envFile, 'utf8')).toContain('NEW_KEY=new');
  });

  it('should leave the existing file untouched when the key is wrong', async () => {
    const otherKey = crypto.randomBytes(32).toString('hex');
    downloadMock.mockResolvedValue(Buffer.from(encryptEnvelope('NEW_KEY=new\n', otherKey), 'utf-8'));

    await pullByCidOrRepo(envFile, 'dev', 'bafytest', undefined, true);

    expect(fs.readFileSync(envFile, 'utf8')).toBe(existing);
  });
});
