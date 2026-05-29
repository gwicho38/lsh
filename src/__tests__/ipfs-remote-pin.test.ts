import { describe, it, expect, afterEach, jest } from '@jest/globals';

/**
 * Tests for durable remote pinning via the kubo remote-pinning-service API.
 * lsh shells out to the local daemon's /pin/remote/* endpoints so content
 * survives the pushing machine going offline.
 */
describe('IPFSSync.addRemotePin', () => {
  const ORIGINAL = process.env.LSH_PIN_SERVICE;

  afterEach(() => {
    jest.restoreAllMocks();
    if (ORIGINAL === undefined) delete process.env.LSH_PIN_SERVICE;
    else process.env.LSH_PIN_SERVICE = ORIGINAL;
  });

  function routeFetch(handler: (url: string) => Response) {
    return jest.spyOn(global, 'fetch').mockImplementation((async (input: unknown) =>
      handler(String(input))) as typeof fetch);
  }

  it('pins to the sole configured service and returns its name', async () => {
    delete process.env.LSH_PIN_SERVICE;
    const calls: string[] = [];
    routeFetch((url) => {
      calls.push(url);
      if (url.includes('/pin/remote/service/ls')) {
        return new Response(JSON.stringify({ RemoteServices: [{ Service: 'pinata' }] }), { status: 200 });
      }
      if (url.includes('/pin/remote/add')) {
        return new Response(JSON.stringify({ Status: 'queued', Cid: 'QmX' }), { status: 200 });
      }
      return new Response('{}', { status: 404 });
    });

    const { IPFSSync } = await import('../lib/ipfs-sync.js');
    const result = await new IPFSSync().addRemotePin('QmX', 'lsh-repo-dev');

    expect(result).toBe('pinata');
    const addCall = calls.find((c) => c.includes('/pin/remote/add'));
    expect(addCall).toBeDefined();
    expect(addCall).toContain('service=pinata');
    expect(addCall).toContain('arg=QmX');
    expect(addCall).toContain('name=lsh-repo-dev');
  });

  it('returns null and never pins when no service is configured', async () => {
    delete process.env.LSH_PIN_SERVICE;
    let addCalled = false;
    routeFetch((url) => {
      if (url.includes('/pin/remote/service/ls')) {
        return new Response(JSON.stringify({ RemoteServices: [] }), { status: 200 });
      }
      if (url.includes('/pin/remote/add')) {
        addCalled = true;
        return new Response('{}', { status: 200 });
      }
      return new Response('{}', { status: 404 });
    });

    const { IPFSSync } = await import('../lib/ipfs-sync.js');
    expect(await new IPFSSync().addRemotePin('QmX', 'lsh-repo-dev')).toBeNull();
    expect(addCalled).toBe(false);
  });

  it('honors LSH_PIN_SERVICE when multiple services exist', async () => {
    process.env.LSH_PIN_SERVICE = 'filebase';
    let addUrl = '';
    routeFetch((url) => {
      if (url.includes('/pin/remote/service/ls')) {
        return new Response(JSON.stringify({ RemoteServices: [{ Service: 'pinata' }, { Service: 'filebase' }] }), { status: 200 });
      }
      if (url.includes('/pin/remote/add')) {
        addUrl = url;
        return new Response(JSON.stringify({ Status: 'queued' }), { status: 200 });
      }
      return new Response('{}', { status: 404 });
    });

    const { IPFSSync } = await import('../lib/ipfs-sync.js');
    expect(await new IPFSSync().addRemotePin('QmX', 'n')).toBe('filebase');
    expect(addUrl).toContain('service=filebase');
  });

  it('returns null when LSH_PIN_SERVICE names an unconfigured service', async () => {
    process.env.LSH_PIN_SERVICE = 'ghost';
    let addCalled = false;
    routeFetch((url) => {
      if (url.includes('/pin/remote/service/ls')) {
        return new Response(JSON.stringify({ RemoteServices: [{ Service: 'pinata' }] }), { status: 200 });
      }
      if (url.includes('/pin/remote/add')) {
        addCalled = true;
        return new Response('{}', { status: 200 });
      }
      return new Response('{}', { status: 404 });
    });

    const { IPFSSync } = await import('../lib/ipfs-sync.js');
    expect(await new IPFSSync().addRemotePin('QmX', 'n')).toBeNull();
    expect(addCalled).toBe(false);
  });

  it('returns null when the remote pin request fails', async () => {
    delete process.env.LSH_PIN_SERVICE;
    routeFetch((url) => {
      if (url.includes('/pin/remote/service/ls')) {
        return new Response(JSON.stringify({ RemoteServices: [{ Service: 'pinata' }] }), { status: 200 });
      }
      if (url.includes('/pin/remote/add')) {
        return new Response('boom', { status: 500 });
      }
      return new Response('{}', { status: 404 });
    });

    const { IPFSSync } = await import('../lib/ipfs-sync.js');
    expect(await new IPFSSync().addRemotePin('QmX', 'n')).toBeNull();
  });
});
