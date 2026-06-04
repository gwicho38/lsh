/**
 * Tests for the discovery backend seam (issue #194, Phase 1).
 * IpnsDiscoveryBackend logic is verified with injected deps + a fake IPFSSync —
 * no network / Kubo required.
 */
import { describe, it, expect, jest } from '@jest/globals';
import {
  IpnsDiscoveryBackend,
  getDiscoveryBackend,
  type IpnsBackendDeps,
} from '../src/lib/discovery-backend.js';

const KEY_INFO = { keyName: 'lsh-deadbeef', seed: Buffer.alloc(32) };

function makeSync(over: Partial<Record<'getApiUrl' | 'publishToIPNS' | 'resolveIPNS', any>> = {}) {
  return {
    getApiUrl: over.getApiUrl ?? jest.fn(() => 'http://127.0.0.1:5001/api/v0'),
    publishToIPNS: over.publishToIPNS ?? jest.fn(async () => 'k51-published'),
    resolveIPNS: over.resolveIPNS ?? jest.fn(async () => 'QmCID'),
  } as any;
}

function makeDeps(over: Partial<IpnsBackendDeps> = {}): IpnsBackendDeps {
  return {
    deriveKeyInfo: over.deriveKeyInfo ?? jest.fn(() => KEY_INFO) as any,
    ensureKeyImported: over.ensureKeyImported ?? (jest.fn(async () => 'k51-name') as any),
  };
}

describe('IpnsDiscoveryBackend', () => {
  it('has id "ipns"', () => {
    expect(new IpnsDiscoveryBackend(makeSync(), makeDeps()).id).toBe('ipns');
  });

  describe('publish', () => {
    it('derives the key, imports it, and publishes the CID under the derived keyName', async () => {
      const sync = makeSync();
      const deps = makeDeps();
      const backend = new IpnsDiscoveryBackend(sync, deps);

      const name = await backend.publish({ secretsKey: 'k', repoName: 'repo', env: 'dev', cid: 'QmCID' });

      expect(deps.deriveKeyInfo).toHaveBeenCalledWith('k', 'repo', 'dev');
      expect(deps.ensureKeyImported).toHaveBeenCalledWith('http://127.0.0.1:5001/api/v0', KEY_INFO);
      expect(sync.publishToIPNS).toHaveBeenCalledWith('QmCID', 'lsh-deadbeef');
      expect(name).toBe('k51-published');
    });

    it('returns null and does not publish when the key cannot be imported', async () => {
      const sync = makeSync();
      const backend = new IpnsDiscoveryBackend(sync, makeDeps({ ensureKeyImported: jest.fn(async () => null) as any }));

      const name = await backend.publish({ secretsKey: 'k', repoName: 'r', env: 'dev', cid: 'QmCID' });

      expect(name).toBeNull();
      expect(sync.publishToIPNS).not.toHaveBeenCalled();
    });
  });

  describe('resolve', () => {
    it('returns the resolved CID and the pointer name', async () => {
      const sync = makeSync();
      const backend = new IpnsDiscoveryBackend(sync, makeDeps());

      const res = await backend.resolve({ secretsKey: 'k', repoName: 'r', env: 'dev' });

      expect(sync.resolveIPNS).toHaveBeenCalledWith('k51-name');
      expect(res).toEqual({ cid: 'QmCID', name: 'k51-name' });
    });

    it('returns nulls and does not resolve when the key cannot be imported', async () => {
      const sync = makeSync();
      const backend = new IpnsDiscoveryBackend(sync, makeDeps({ ensureKeyImported: jest.fn(async () => null) as any }));

      const res = await backend.resolve({ secretsKey: 'k', repoName: 'r', env: 'dev' });

      expect(res).toEqual({ cid: null, name: null });
      expect(sync.resolveIPNS).not.toHaveBeenCalled();
    });

    it('returns null cid when the name resolves to nothing', async () => {
      const sync = makeSync({ resolveIPNS: jest.fn(async () => null) });
      const backend = new IpnsDiscoveryBackend(sync, makeDeps());

      const res = await backend.resolve({ secretsKey: 'k', repoName: 'r', env: 'dev' });

      expect(res).toEqual({ cid: null, name: 'k51-name' });
    });
  });
});

describe('getDiscoveryBackend', () => {
  it('returns the IPNS backend (behaviour-preserving default)', () => {
    expect(getDiscoveryBackend(makeSync()).id).toBe('ipns');
  });
});
