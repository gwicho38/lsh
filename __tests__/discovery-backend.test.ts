/**
 * Tests for the discovery backend seam (issue #194, Phase 1).
 * IpnsDiscoveryBackend logic is verified with injected deps + a fake IPFSSync —
 * no network / Kubo required.
 */
import { describe, it, expect, jest } from '@jest/globals';
import {
  IpnsDiscoveryBackend,
  W3nameDiscoveryBackend,
  CompositeDiscoveryBackend,
  getDiscoveryBackend,
  type IpnsBackendDeps,
  type W3nameBackendDeps,
  type DiscoveryBackend,
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

function makeW3Deps(over: Partial<W3nameBackendDeps> = {}): W3nameBackendDeps {
  return {
    deriveKeyInfo: over.deriveKeyInfo ?? (jest.fn(() => KEY_INFO) as any),
    publish: over.publish ?? (jest.fn(async () => 'k51-w3') as any),
    resolve: over.resolve ?? (jest.fn(async () => ({ cid: 'QmW3', name: 'k51-w3' })) as any),
  };
}

describe('W3nameDiscoveryBackend', () => {
  it('has id "w3name"', () => {
    expect(new W3nameDiscoveryBackend(makeW3Deps()).id).toBe('w3name');
  });

  it('publish derives the seed and publishes the CID, returning the name', async () => {
    const deps = makeW3Deps();
    const name = await new W3nameDiscoveryBackend(deps).publish({ secretsKey: 'k', repoName: 'r', env: 'dev', cid: 'QmW3' });
    expect(deps.deriveKeyInfo).toHaveBeenCalledWith('k', 'r', 'dev');
    expect(deps.publish).toHaveBeenCalledWith(KEY_INFO.seed, 'QmW3');
    expect(name).toBe('k51-w3');
  });

  it('resolve returns the cid and name from the w3name pointer', async () => {
    const res = await new W3nameDiscoveryBackend(makeW3Deps()).resolve({ secretsKey: 'k', repoName: 'r', env: 'dev' });
    expect(res).toEqual({ cid: 'QmW3', name: 'k51-w3' });
  });
});

// Minimal fake backend for composite tests.
function fakeBackend(id: string, opts: {
  publish?: () => Promise<string | null>;
  resolve?: () => Promise<{ cid: string | null; name: string | null }>;
} = {}): DiscoveryBackend {
  return {
    id,
    publish: opts.publish ?? (async () => `name-${id}`),
    resolve: opts.resolve ?? (async () => ({ cid: `cid-${id}`, name: `name-${id}` })),
  };
}

describe('CompositeDiscoveryBackend', () => {
  it('id joins child ids', () => {
    expect(new CompositeDiscoveryBackend([fakeBackend('w3name'), fakeBackend('ipns')]).id).toBe('w3name+ipns');
  });

  it('publish dual-writes to ALL backends and returns the first name', async () => {
    const a = jest.fn(async () => 'name-a');
    const b = jest.fn(async () => 'name-b');
    const name = await new CompositeDiscoveryBackend([
      fakeBackend('a', { publish: a }),
      fakeBackend('b', { publish: b }),
    ]).publish({ secretsKey: 'k', repoName: 'r', env: 'dev', cid: 'Qm' });
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
    expect(name).toBe('name-a');
  });

  it('publish continues to other backends when one throws', async () => {
    const b = jest.fn(async () => 'name-b');
    const name = await new CompositeDiscoveryBackend([
      fakeBackend('a', { publish: async () => { throw new Error('boom'); } }),
      fakeBackend('b', { publish: b }),
    ]).publish({ secretsKey: 'k', repoName: 'r', env: 'dev', cid: 'Qm' });
    expect(b).toHaveBeenCalled();
    expect(name).toBe('name-b');
  });

  it('resolve returns the first backend that yields a cid (durable wins)', async () => {
    const second = jest.fn(async () => ({ cid: 'cid-2', name: 'n2' }));
    const res = await new CompositeDiscoveryBackend([
      fakeBackend('a', { resolve: async () => ({ cid: null, name: 'n1' }) }),
      fakeBackend('b', { resolve: second }),
    ]).resolve({ secretsKey: 'k', repoName: 'r', env: 'dev' });
    expect(res).toEqual({ cid: 'cid-2', name: 'n2' });
  });

  it('resolve falls through and returns nulls (with first name) when none resolve', async () => {
    const res = await new CompositeDiscoveryBackend([
      fakeBackend('a', { resolve: async () => ({ cid: null, name: 'n1' }) }),
      fakeBackend('b', { resolve: async () => ({ cid: null, name: 'n2' }) }),
    ]).resolve({ secretsKey: 'k', repoName: 'r', env: 'dev' });
    expect(res).toEqual({ cid: null, name: 'n1' });
  });
});

describe('getDiscoveryBackend (LSH_DISCOVERY config)', () => {
  const prev = process.env.LSH_DISCOVERY;
  afterEach(() => {
    if (prev === undefined) delete process.env.LSH_DISCOVERY;
    else process.env.LSH_DISCOVERY = prev;
  });

  it('defaults to durable w3name + ipns fallback', () => {
    delete process.env.LSH_DISCOVERY;
    expect(getDiscoveryBackend(makeSync()).id).toBe('w3name+ipns');
  });

  it('honors LSH_DISCOVERY=ipns (single backend)', () => {
    process.env.LSH_DISCOVERY = 'ipns';
    expect(getDiscoveryBackend(makeSync()).id).toBe('ipns');
  });

  it('honors LSH_DISCOVERY=w3name (single backend)', () => {
    process.env.LSH_DISCOVERY = 'w3name';
    expect(getDiscoveryBackend(makeSync()).id).toBe('w3name');
  });

  it('honors custom order LSH_DISCOVERY=ipns,w3name', () => {
    process.env.LSH_DISCOVERY = 'ipns,w3name';
    expect(getDiscoveryBackend(makeSync()).id).toBe('ipns+w3name');
  });

  it('ignores unknown backends and falls back to ipns when nothing valid', () => {
    process.env.LSH_DISCOVERY = 'bogus';
    expect(getDiscoveryBackend(makeSync()).id).toBe('ipns');
  });
});
