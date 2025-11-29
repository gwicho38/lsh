/**
 * Service Wrapper Tests
 * Tests for the service initialization wrappers
 */

import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { Command } from 'commander';

describe('Service Wrappers', () => {
  describe('init_cron', () => {
    let init_cron: typeof import('../src/services/cron/cron.js').init_cron;

    beforeAll(async () => {
      const module = await import('../src/services/cron/cron.js');
      init_cron = module.init_cron;
    });

    it('should be a function', () => {
      expect(typeof init_cron).toBe('function');
    });

    it('should accept a Command object', async () => {
      const program = new Command();
      // Should not throw
      await expect(init_cron(program)).resolves.not.toThrow();
    });
  });

  describe('init_daemon', () => {
    let init_daemon: typeof import('../src/services/daemon/daemon.js').init_daemon;

    beforeAll(async () => {
      const module = await import('../src/services/daemon/daemon.js');
      init_daemon = module.init_daemon;
    });

    it('should be a function', () => {
      expect(typeof init_daemon).toBe('function');
    });

    it('should accept a Command object', async () => {
      const program = new Command();
      // Should not throw
      await expect(init_daemon(program)).resolves.not.toThrow();
    });
  });

  describe('init_supabase', () => {
    let init_supabase: typeof import('../src/services/supabase/supabase.js').init_supabase;

    beforeAll(async () => {
      const module = await import('../src/services/supabase/supabase.js');
      init_supabase = module.init_supabase;
    });

    it('should be a function', () => {
      expect(typeof init_supabase).toBe('function');
    });

    it('should accept a Command object', async () => {
      const program = new Command();
      // Should not throw
      await expect(init_supabase(program)).resolves.not.toThrow();
    });
  });
});
