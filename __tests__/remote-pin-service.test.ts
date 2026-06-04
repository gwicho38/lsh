/**
 * Tests for remote pin service selection (issue #194, Phase 3 — bundled pinner).
 * Pure `chooseRemoteService` logic; the network auto-register
 * (`ensureDefaultPinService`) is integration-only.
 */
import { describe, it, expect } from '@jest/globals';
import { chooseRemoteService } from '../src/lib/ipfs-sync.js';

const DEFAULT = 'lsh-pin';

describe('chooseRemoteService', () => {
  it('uses explicit LSH_PIN_SERVICE when it is configured', () => {
    expect(chooseRemoteService(['pinata', 'lsh-pin'], 'pinata', DEFAULT)).toBe('pinata');
  });

  it('returns null when explicit LSH_PIN_SERVICE is set but not configured', () => {
    expect(chooseRemoteService(['lsh-pin'], 'pinata', DEFAULT)).toBeNull();
  });

  it('explicit takes precedence over the bundled default', () => {
    expect(chooseRemoteService(['lsh-pin', 'filebase'], 'filebase', DEFAULT)).toBe('filebase');
  });

  it('prefers the bundled default service when no explicit is set', () => {
    expect(chooseRemoteService(['lsh-pin', 'other'], undefined, DEFAULT)).toBe(DEFAULT);
  });

  it('uses the sole configured service when no explicit/default', () => {
    expect(chooseRemoteService(['only-one'], undefined, DEFAULT)).toBe('only-one');
  });

  it('returns null when multiple services and no explicit/default (ambiguous)', () => {
    expect(chooseRemoteService(['a', 'b'], undefined, DEFAULT)).toBeNull();
  });

  it('returns null when nothing is configured', () => {
    expect(chooseRemoteService([], undefined, DEFAULT)).toBeNull();
    expect(chooseRemoteService([], 'pinata', DEFAULT)).toBeNull();
  });
});
