/**
 * Regression tests for issue #223.
 *
 * 1. Behavioural: secret-bearing writers leave their files at mode 0600, even
 *    when they replace a file that was already world-readable.
 * 2. Structural: a repository-wide scan fails when a new secret-bearing write
 *    bypasses the atomic secure writer.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { LshConfigManager } from '../src/lib/lsh-config.js';
import { SyncKeyStore } from '../src/lib/sync-key-store.js';

const isPosix = process.platform !== 'win32';
const modeOf = (target: string): number => fs.statSync(target).mode & 0o777;

function expectSecretMode(target: string): void {
  if (isPosix) {
    expect(modeOf(target)).toBe(0o600);
  } else {
    expect(fs.existsSync(target)).toBe(true);
  }
}

describe('secret-bearing writers keep files owner-only', () => {
  let dir: string;
  let savedUmask: number;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-secret-perms-'));
    savedUmask = isPosix ? process.umask(0o022) : 0;
  });

  afterEach(() => {
    if (isPosix) process.umask(savedUmask);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('LshConfigManager', () => {
    it('should create a fresh key-bearing config at 0600', () => {
      const configPath = path.join(dir, 'config.json');
      const manager = new LshConfigManager(configPath);

      manager.setKey('demo-repo', 'a'.repeat(64));

      expect(JSON.parse(fs.readFileSync(configPath, 'utf-8')).keys['demo-repo'].key).toBe(
        'a'.repeat(64)
      );
      expectSecretMode(configPath);
    });

    it('should repair a pre-existing world-readable config to 0600', () => {
      const configPath = path.join(dir, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({ version: '1.0.0', keys: {} }));
      if (isPosix) {
        fs.chmodSync(configPath, 0o644);
        expect(modeOf(configPath)).toBe(0o644);
      }

      const manager = new LshConfigManager(configPath);
      manager.setKey('demo-repo', 'b'.repeat(64));

      expectSecretMode(configPath);
    });
  });

  describe('SyncKeyStore', () => {
    const savedHome = process.env.LSH_HOME;

    afterEach(() => {
      if (savedHome === undefined) delete process.env.LSH_HOME;
      else process.env.LSH_HOME = savedHome;
    });

    it('should repair a pre-existing world-readable key store to 0600', () => {
      process.env.LSH_HOME = dir;
      const store = new SyncKeyStore();
      fs.writeFileSync(store.path, JSON.stringify({ key: 'c'.repeat(64) }));
      if (isPosix) fs.chmodSync(store.path, 0o644);

      store.set('d'.repeat(64));

      expect(store.get()).toBe('d'.repeat(64));
      expectSecretMode(store.path);
    });
  });
});

// ---------------------------------------------------------------------------
// Repository-wide guard
// ---------------------------------------------------------------------------

const SRC_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', 'src');

/** Direct filesystem write/copy calls that could land a secret on disk. */
const DIRECT_WRITE_CALL =
  /\b(?:fs|fsSync|fsPromises|fsp|promises)\.(?:writeFile|writeFileSync|appendFile|appendFileSync|copyFile|copyFileSync)\s*\(/;

/**
 * Marker a call site must carry to opt out: the write provably handles no
 * secret material (shell rc files, .gitignore, pid files, IPFS sync history).
 */
const OPT_OUT_MARKER = 'NON_SECRET_WRITE';

/** The writer itself is the sanctioned implementation of the primitive. */
const EXEMPT_FILES = new Set(['lib/secure-file-writer.ts']);

function collectSourceFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      out.push(...collectSourceFiles(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('repository-wide secret-write guard', () => {
  it('should route every filesystem write in src/ through the secure writer or an explicit opt-out', () => {
    const offenders: string[] = [];

    for (const file of collectSourceFiles(SRC_DIR)) {
      const relative = path.relative(SRC_DIR, file).split(path.sep).join('/');
      if (EXEMPT_FILES.has(relative)) continue;

      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (!DIRECT_WRITE_CALL.test(line)) return;
        const context = lines.slice(Math.max(0, index - 2), index + 1).join('\n');
        if (context.includes(OPT_OUT_MARKER)) return;
        offenders.push(`${relative}:${index + 1}: ${line.trim()}`);
      });
    }

    expect(offenders).toEqual([]);
  });
});
