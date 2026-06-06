/**
 * Tests for the `lsh shell-init` pure logic (src/lib/shell-init.ts).
 * Pure string/path transforms — no fs, no shell, no network required.
 */
import { describe, it, expect } from '@jest/globals';
import {
  detectShell,
  rcFileForShell,
  buildBlock,
  hasBlock,
  upsertBlock,
  removeBlock,
} from '../src/lib/shell-init.js';
import { SHELL_INIT } from '../src/constants/index.js';

describe('detectShell', () => {
  it('detects zsh from a $SHELL path', () => {
    expect(detectShell('/bin/zsh')).toBe('zsh');
  });

  it('detects bash from a $SHELL path', () => {
    expect(detectShell('/usr/bin/bash')).toBe('bash');
  });

  it('returns undefined for unknown or missing shells', () => {
    expect(detectShell('/usr/bin/fish')).toBeUndefined();
    expect(detectShell('')).toBeUndefined();
    expect(detectShell(undefined)).toBeUndefined();
  });
});

describe('rcFileForShell', () => {
  it('maps zsh to ~/.zshrc and bash to ~/.bashrc', () => {
    expect(rcFileForShell('zsh', '/home/u')).toBe('/home/u/.zshrc');
    expect(rcFileForShell('bash', '/home/u')).toBe('/home/u/.bashrc');
  });
});

describe('buildBlock', () => {
  it('wraps the load line between start and end markers', () => {
    const block = buildBlock();
    expect(block.startsWith(SHELL_INIT.MARKER_START)).toBe(true);
    expect(block.trimEnd().endsWith(SHELL_INIT.MARKER_END)).toBe(true);
    expect(block).toContain(SHELL_INIT.LOAD_LINE);
  });
});

describe('hasBlock', () => {
  it('is false for content without the marker and true once inserted', () => {
    expect(hasBlock('export FOO=1\n')).toBe(false);
    expect(hasBlock(upsertBlock('export FOO=1\n'))).toBe(true);
  });
});

describe('upsertBlock', () => {
  it('appends the block separated by a blank line from prior content', () => {
    const out = upsertBlock('export FOO=1\n');
    expect(out).toBe(`export FOO=1\n\n${buildBlock()}\n`);
  });

  it('handles empty content without a leading blank line', () => {
    expect(upsertBlock('')).toBe(`${buildBlock()}\n`);
  });

  it('is idempotent — re-running does not duplicate the block', () => {
    const once = upsertBlock('export FOO=1\n');
    const twice = upsertBlock(once);
    expect(twice).toBe(once);
    expect(twice.match(new RegExp(SHELL_INIT.MARKER_START, 'g'))).toHaveLength(1);
  });

  it('upgrades an existing block in place when the line changes', () => {
    const old = `before\n${buildBlock('eval "$(lsh load)"')}\nafter\n`;
    const out = upsertBlock(old, buildBlock('eval "$(lsh load --global --quiet)"'));
    expect(out).toContain('eval "$(lsh load --global --quiet)"');
    expect(out).not.toContain('eval "$(lsh load)"\n');
    expect(out).toContain('before');
    expect(out).toContain('after');
  });
});

describe('removeBlock', () => {
  it('removes the managed block and its surrounding blank line', () => {
    const withBlock = upsertBlock('export FOO=1\n');
    expect(removeBlock(withBlock)).toBe('export FOO=1\n');
  });

  it('is a no-op when no managed block is present', () => {
    expect(removeBlock('export FOO=1\n')).toBe('export FOO=1\n');
  });

  it('survives an install/uninstall round-trip without drift', () => {
    const original = 'export FOO=1\n';
    expect(removeBlock(upsertBlock(original))).toBe(original);
  });
});
