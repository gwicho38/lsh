import { describe, it, expect, afterEach, jest } from '@jest/globals';

describe('IPFSSync.publishToIPNS', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should publish with offline=false and allow-offline=false', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ Name: 'k51test', Value: '/ipfs/QmTest' }), { status: 200 })
    );

    const { IPFSSync } = await import('../lib/ipfs-sync.js');
    const sync = new IPFSSync();
    await sync.publishToIPNS('QmTestCid', 'lsh-testkey');

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('offline=false');
    expect(calledUrl).toContain('allow-offline=false');
    expect(calledUrl).not.toContain('offline=true');
  });

  it('should retry once on failure', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ Name: 'k51test', Value: '/ipfs/QmTest' }), { status: 200 })
      );

    const { IPFSSync } = await import('../lib/ipfs-sync.js');
    const sync = new IPFSSync();
    const result = await sync.publishToIPNS('QmTestCid', 'lsh-testkey');

    expect(result).toBe('k51test');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe('IPFSSecretsStorage.push', () => {
  it('should not have a generateCID method (fake CIDs removed)', async () => {
    const { IPFSSecretsStorage } = await import('../lib/ipfs-secrets-storage.js');
    const storage = new IPFSSecretsStorage();
    expect((storage as any).generateCID).toBeUndefined();
  });
});

describe('IPFSSecretsStorage.pull - IPNS-first', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fail clearly when IPFS network is unreachable', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));

    const { IPFSSecretsStorage } = await import('../lib/ipfs-secrets-storage.js');
    const storage = new IPFSSecretsStorage();

    await expect(
      storage.pull('', 'test-key', 'test-repo')
    ).rejects.toThrow(/Could not resolve secrets from network/);
  });
});
