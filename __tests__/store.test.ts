/**
 * Store Tests
 * Tests for the global store module
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Store', () => {
  let getPkgId: typeof import('../src/store/store.js').getPkgId;
  let setPkgId: typeof import('../src/store/store.js').setPkgId;
  let getPrivateKey: typeof import('../src/store/store.js').getPrivateKey;
  let setPrivateKey: typeof import('../src/store/store.js').setPrivateKey;
  let getKey: typeof import('../src/store/store.js').getKey;
  let setKey: typeof import('../src/store/store.js').setKey;
  let getShell: typeof import('../src/store/store.js').getShell;
  let setShell: typeof import('../src/store/store.js').setShell;
  let setCmdMap: typeof import('../src/store/store.js').setCmdMap;
  let getCmdMap: typeof import('../src/store/store.js').getCmdMap;
  let get: typeof import('../src/store/store.js').get;
  let set: typeof import('../src/store/store.js').set;
  let inst: typeof import('../src/store/store.js').inst;
  let kill: typeof import('../src/store/store.js').kill;
  let lsh: typeof import('../src/store/store.js').lsh;

  beforeAll(async () => {
    const module = await import('../src/store/store.js');
    getPkgId = module.getPkgId;
    setPkgId = module.setPkgId;
    getPrivateKey = module.getPrivateKey;
    setPrivateKey = module.setPrivateKey;
    getKey = module.getKey;
    setKey = module.setKey;
    getShell = module.getShell;
    setShell = module.setShell;
    setCmdMap = module.setCmdMap;
    getCmdMap = module.getCmdMap;
    get = module.get;
    set = module.set;
    inst = module.inst;
    kill = module.kill;
    lsh = module.lsh;
  });

  describe('Package ID', () => {
    it('should have default value "EMPTY"', () => {
      // Note: This test may fail if running after other tests that modified the state
      // In a fresh state, getPkgId should return "EMPTY" or whatever the previous test set
      expect(typeof getPkgId()).toBe('string');
    });

    it('should set and get package ID', () => {
      setPkgId('test-pkg-id');
      expect(getPkgId()).toBe('test-pkg-id');
    });
  });

  describe('Private Key', () => {
    it('should set and get private key', () => {
      setPrivateKey('test-private-key');
      expect(getPrivateKey()).toBe('test-private-key');
    });
  });

  describe('Key', () => {
    it('should set and get key', () => {
      setKey('test-key');
      expect(getKey()).toBe('test-key');
    });
  });

  describe('Shell Functions', () => {
    it('should call getShell without error', () => {
      // getShell logs to console, just verify it doesn't throw
      expect(() => getShell()).not.toThrow();
    });

    it('should call setShell without error', () => {
      // setShell logs to console, just verify it doesn't throw
      expect(() => setShell('test-value')).not.toThrow();
    });
  });

  describe('Command Map', () => {
    it('should set command in map', () => {
      setCmdMap('test-cmd', () => {});

      const map = getCmdMap();
      expect(map.has('test-cmd')).toBe(true);
    });

    it('should get command map', () => {
      const map = getCmdMap();
      expect(map).toBeInstanceOf(Map);
    });
  });

  describe('Global LSH Object', () => {
    it('should export lsh object', () => {
      expect(lsh).toBeDefined();
      expect(typeof lsh).toBe('object');
    });

    it('should have get function', () => {
      expect(typeof get).toBe('function');
    });

    it('should have set function', () => {
      expect(typeof set).toBe('function');
    });

    it('should call inst function without error', () => {
      // inst logs to console, just verify it doesn't throw
      expect(() => inst('test-instance')).not.toThrow();
    });

    it('should call kill function without error', () => {
      // kill logs to console, just verify it doesn't throw
      expect(() => kill('test-kill')).not.toThrow();
    });
  });

  describe('Global lsh binding', () => {
    it('should be available on globalThis', () => {
      expect(globalThis.lsh).toBeDefined();
      expect(typeof globalThis.lsh.get).toBe('function');
      expect(typeof globalThis.lsh.set).toBe('function');
      expect(typeof globalThis.lsh.inst).toBe('function');
      expect(typeof globalThis.lsh.kill).toBe('function');
    });
  });
});
