/**
 * Tests for PerformanceProfiler
 */

import { jest } from '@jest/globals';
import {
  PerformanceProfiler,
  getPerformanceProfiler,
  createPerformanceProfiler,
  profileAsync,
  profileSync,
} from '../../lib/metrics/index.js';

describe('PerformanceProfiler', () => {
  let profiler: PerformanceProfiler;

  beforeEach(() => {
    profiler = createPerformanceProfiler({ profilingEnabled: true, profilingSampleRate: 1.0 });
  });

  afterEach(() => {
    profiler.reset();
  });

  describe('initialization', () => {
    it('should create a new profiler', () => {
      expect(profiler).toBeInstanceOf(PerformanceProfiler);
      expect(profiler.isEnabled()).toBe(true);
    });

    it('should respect enabled flag', () => {
      const disabled = createPerformanceProfiler({ profilingEnabled: false });
      expect(disabled.isEnabled()).toBe(false);
    });
  });

  describe('basic profiling', () => {
    it('should start a profile', () => {
      const profile = profiler.startProfile('test-profile');
      expect(profile).toBeDefined();
      expect(profile?.name).toBe('test-profile');
      expect(profiler.getActiveProfileNames()).toContain('test-profile');
    });

    it('should end a profile and return results', async () => {
      profiler.startProfile('test-profile');

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = profiler.endProfile('test-profile');

      expect(result).toBeDefined();
      expect(result?.name).toBe('test-profile');
      expect(result?.duration).toBeGreaterThanOrEqual(10);
      expect(result?.memoryDelta).toBeDefined();
      expect(result?.endTime).toBeInstanceOf(Date);
    });

    it('should track memory delta', () => {
      profiler.startProfile('memory-test');

      // Allocate some memory
      const arr = new Array(10000).fill('test');

      const result = profiler.endProfile('memory-test');

      expect(result?.memoryDelta).toBeDefined();
      expect(result?.memoryDelta.heapUsed).toBeDefined();

      // Clean up to avoid affecting other tests
      arr.length = 0;
    });

    it('should return undefined for non-existent profile', () => {
      const result = profiler.endProfile('non-existent');
      expect(result).toBeUndefined();
    });

    it('should handle multiple concurrent profiles', () => {
      profiler.startProfile('profile-1');
      profiler.startProfile('profile-2');
      profiler.startProfile('profile-3');

      expect(profiler.getActiveProfileNames()).toHaveLength(3);

      profiler.endProfile('profile-2');
      expect(profiler.getActiveProfileNames()).toHaveLength(2);
      expect(profiler.getActiveProfileNames()).toContain('profile-1');
      expect(profiler.getActiveProfileNames()).toContain('profile-3');
    });
  });

  describe('checkpoints', () => {
    it('should add checkpoints to profile', () => {
      profiler.startProfile('checkpoint-test');

      profiler.checkpoint('checkpoint-test', 'step-1');
      profiler.checkpoint('checkpoint-test', 'step-2');
      profiler.checkpoint('checkpoint-test', 'step-3');

      const result = profiler.endProfile('checkpoint-test');

      expect(result?.checkpoints).toHaveLength(3);
      expect(result?.checkpoints[0].label).toBe('step-1');
      expect(result?.checkpoints[1].label).toBe('step-2');
      expect(result?.checkpoints[2].label).toBe('step-3');
    });

    it('should track relative time for checkpoints', async () => {
      profiler.startProfile('timing-test');

      await new Promise((resolve) => setTimeout(resolve, 10));
      profiler.checkpoint('timing-test', 'after-10ms');

      await new Promise((resolve) => setTimeout(resolve, 10));
      profiler.checkpoint('timing-test', 'after-20ms');

      const result = profiler.endProfile('timing-test');

      expect(result?.checkpoints[0].relativeTime).toBeGreaterThanOrEqual(10);
      expect(result?.checkpoints[1].relativeTime).toBeGreaterThanOrEqual(20);
      expect(result?.checkpoints[1].relativeTime).toBeGreaterThan(result?.checkpoints[0].relativeTime);
    });

    it('should track memory at each checkpoint', () => {
      profiler.startProfile('memory-checkpoint');

      profiler.checkpoint('memory-checkpoint', 'initial');

      // Allocate memory
      const arr = new Array(10000).fill('test');
      profiler.checkpoint('memory-checkpoint', 'after-allocation');

      const result = profiler.endProfile('memory-checkpoint');

      expect(result?.checkpoints[0].memory).toBeDefined();
      expect(result?.checkpoints[1].memory).toBeDefined();

      // Clean up
      arr.length = 0;
    });

    it('should silently ignore checkpoints for non-existent profiles', () => {
      // Should not throw
      profiler.checkpoint('non-existent', 'step-1');
    });
  });

  describe('context data', () => {
    it('should store context with profile', () => {
      const context = { query: 'SELECT * FROM users', userId: 123 };
      profiler.startProfile('context-test', context);

      const result = profiler.endProfile('context-test');

      expect(result?.context).toEqual(context);
    });
  });

  describe('profile retrieval', () => {
    it('should get active profile', () => {
      profiler.startProfile('active-test');

      const active = profiler.getActiveProfile('active-test');

      expect(active).toBeDefined();
      expect(active?.name).toBe('active-test');
    });

    it('should get completed profiles', () => {
      profiler.startProfile('completed-1');
      profiler.endProfile('completed-1');

      profiler.startProfile('completed-2');
      profiler.endProfile('completed-2');

      const completed = profiler.getCompletedProfiles();

      expect(completed).toHaveLength(2);
      // Most recent first
      expect(completed[0].name).toBe('completed-2');
      expect(completed[1].name).toBe('completed-1');
    });

    it('should limit completed profiles', () => {
      for (let i = 0; i < 10; i++) {
        profiler.startProfile(`profile-${i}`);
        profiler.endProfile(`profile-${i}`);
      }

      const limited = profiler.getCompletedProfiles(5);

      expect(limited).toHaveLength(5);
    });

    it('should get profiles by name', () => {
      for (let i = 0; i < 3; i++) {
        profiler.startProfile('same-name');
        profiler.endProfile('same-name');
      }

      profiler.startProfile('different-name');
      profiler.endProfile('different-name');

      const byName = profiler.getProfileByName('same-name');

      expect(byName).toHaveLength(3);
    });
  });

  describe('statistics', () => {
    it('should provide profile statistics', () => {
      profiler.startProfile('stats-1');
      profiler.endProfile('stats-1');

      profiler.startProfile('stats-2');
      profiler.endProfile('stats-2');

      profiler.startProfile('active');

      const stats = profiler.getStats();

      expect(stats.totalProfilesStarted).toBe(3);
      expect(stats.completedProfiles).toBe(2);
      expect(stats.activeProfiles).toBe(1);
    });

    it('should track average duration', async () => {
      for (let i = 0; i < 3; i++) {
        profiler.startProfile(`timed-${i}`);
        await new Promise((resolve) => setTimeout(resolve, 10));
        profiler.endProfile(`timed-${i}`);
      }

      const stats = profiler.getStats();

      expect(stats.averageDuration).toBeGreaterThanOrEqual(10);
    });

    it('should track longest profile', async () => {
      profiler.startProfile('short');
      await new Promise((resolve) => setTimeout(resolve, 5));
      profiler.endProfile('short');

      profiler.startProfile('long');
      await new Promise((resolve) => setTimeout(resolve, 20));
      profiler.endProfile('long');

      const stats = profiler.getStats();

      expect(stats.longestProfile?.name).toBe('long');
    });
  });

  describe('abort and reset', () => {
    it('should abort an active profile', () => {
      profiler.startProfile('to-abort');

      const aborted = profiler.abortProfile('to-abort');

      expect(aborted).toBe(true);
      expect(profiler.getActiveProfileNames()).not.toContain('to-abort');
    });

    it('should return false when aborting non-existent profile', () => {
      const aborted = profiler.abortProfile('non-existent');
      expect(aborted).toBe(false);
    });

    it('should reset all profiles', () => {
      profiler.startProfile('active');
      profiler.startProfile('completed');
      profiler.endProfile('completed');

      profiler.reset();

      expect(profiler.getActiveProfileNames()).toHaveLength(0);
      expect(profiler.getCompletedProfiles()).toHaveLength(0);
      expect(profiler.getStats().totalProfilesStarted).toBe(0);
    });
  });

  describe('events', () => {
    it('should emit profileStarted event', () => {
      const handler = jest.fn();
      profiler.on('profileStarted', handler);

      profiler.startProfile('event-test', { foo: 'bar' });

      expect(handler).toHaveBeenCalledWith('event-test', { foo: 'bar' });
    });

    it('should emit checkpoint event', () => {
      const handler = jest.fn();
      profiler.on('checkpoint', handler);

      profiler.startProfile('checkpoint-event');
      profiler.checkpoint('checkpoint-event', 'step-1');

      expect(handler).toHaveBeenCalledWith('checkpoint-event', 'step-1');
    });

    it('should emit profileEnded event', () => {
      const handler = jest.fn();
      profiler.on('profileEnded', handler);

      profiler.startProfile('end-event');
      profiler.endProfile('end-event');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'end-event',
        })
      );
    });

    it('should emit profileAborted event', () => {
      const handler = jest.fn();
      profiler.on('profileAborted', handler);

      profiler.startProfile('abort-event');
      profiler.abortProfile('abort-event');

      expect(handler).toHaveBeenCalledWith('abort-event');
    });

    it('should emit reset event', () => {
      const handler = jest.fn();
      profiler.on('reset', handler);

      profiler.reset();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('sampling', () => {
    it('should respect sample rate', () => {
      // With 0% sample rate, no profiles should be recorded
      const sampled = createPerformanceProfiler({
        profilingEnabled: true,
        profilingSampleRate: 0,
      });

      // Try to start multiple profiles - none should be recorded
      for (let i = 0; i < 10; i++) {
        const profile = sampled.startProfile(`sampled-${i}`);
        expect(profile).toBeUndefined();
      }

      expect(sampled.getActiveProfileNames()).toHaveLength(0);
    });

    it('should profile everything with 100% sample rate', () => {
      const fullSample = createPerformanceProfiler({
        profilingEnabled: true,
        profilingSampleRate: 1.0,
      });

      for (let i = 0; i < 5; i++) {
        const profile = fullSample.startProfile(`full-${i}`);
        expect(profile).toBeDefined();
        fullSample.endProfile(`full-${i}`);
      }

      expect(fullSample.getCompletedProfiles()).toHaveLength(5);
    });
  });

  describe('singleton access', () => {
    it('should return same instance from getPerformanceProfiler', () => {
      const profiler1 = getPerformanceProfiler();
      const profiler2 = getPerformanceProfiler();
      expect(profiler1).toBe(profiler2);
    });
  });

  describe('convenience functions', () => {
    describe('profileAsync', () => {
      it('should profile async operations', async () => {
        const { result, profile } = await profileAsync(
          'async-test',
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return 'success';
          },
          { test: true }
        );

        expect(result).toBe('success');
        expect(profile?.name).toBe('async-test');
        expect(profile?.duration).toBeGreaterThanOrEqual(10);
        expect(profile?.context).toEqual({ test: true });
      });

      it('should handle async errors', async () => {
        await expect(
          profileAsync('error-test', async () => {
            throw new Error('test error');
          })
        ).rejects.toThrow('test error');
      });
    });

    describe('profileSync', () => {
      it('should profile sync operations', () => {
        const { result, profile } = profileSync(
          'sync-test',
          () => {
            let sum = 0;
            for (let i = 0; i < 1000; i++) {
              sum += i;
            }
            return sum;
          },
          { test: true }
        );

        expect(result).toBe(499500);
        expect(profile?.name).toBe('sync-test');
        expect(profile?.context).toEqual({ test: true });
      });

      it('should handle sync errors', () => {
        expect(() =>
          profileSync('error-test', () => {
            throw new Error('test error');
          })
        ).toThrow('test error');
      });
    });
  });

  describe('duplicate profile handling', () => {
    it('should end previous profile when starting with same name', () => {
      profiler.startProfile('duplicate');

      // Start another profile with same name
      profiler.startProfile('duplicate');

      // Should only have one active profile
      expect(profiler.getActiveProfileNames()).toHaveLength(1);

      // Should have one completed profile from auto-end
      expect(profiler.getCompletedProfiles()).toHaveLength(1);
    });
  });
});
