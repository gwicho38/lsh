/**
 * Multi-Host Sync Integration Test
 *
 * Tests that secrets can be synced across multiple "hosts" (simulated by different directories)
 * sharing the same IPFS storage and encryption key.
 *
 * Scenario:
 * 1. Host A pushes secrets to IPFS
 * 2. Host B pulls the same secrets from IPFS
 * 3. Host B modifies secrets and pushes
 * 4. Host A pulls the updated secrets
 * 5. Verify both hosts have identical secrets
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SecretsManager } from '../../src/lib/secrets-manager.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

describe('Multi-Host Sync Integration', () => {
  let hostADir: string;
  let hostBDir: string;
  let sharedKey: string;
  let environment: string;
  let originalLshDir: string;
  let testLshDir: string;

  beforeEach(() => {
    // Generate shared encryption key (same key across all hosts)
    sharedKey = crypto.randomBytes(32).toString('hex');
    environment = `test-${Date.now()}`;

    // Create temporary directories for Host A and Host B
    const tmpBase = os.tmpdir();
    hostADir = fs.mkdtempSync(path.join(tmpBase, 'lsh-host-a-'));
    hostBDir = fs.mkdtempSync(path.join(tmpBase, 'lsh-host-b-'));

    // Create a shared test LSH directory (simulating shared IPFS cache)
    // We'll use a temp directory and set HOME to point to its parent
    const testHomeDir = fs.mkdtempSync(path.join(tmpBase, 'lsh-home-'));
    testLshDir = path.join(testHomeDir, '.lsh');
    fs.mkdirSync(testLshDir, { recursive: true });

    // Save original HOME and override it
    originalLshDir = process.env.HOME || '';
    process.env.HOME = testHomeDir;
  });

  afterEach(() => {
    // Restore original HOME
    if (originalLshDir) {
      process.env.HOME = originalLshDir;
    }

    // Clean up test directories
    if (fs.existsSync(hostADir)) {
      fs.rmSync(hostADir, { recursive: true });
    }
    if (fs.existsSync(hostBDir)) {
      fs.rmSync(hostBDir, { recursive: true });
    }
    if (fs.existsSync(testLshDir)) {
      const testHomeDir = path.dirname(testLshDir);
      fs.rmSync(testHomeDir, { recursive: true });
    }
  });

  it('should sync secrets from Host A to Host B', async () => {
    // Host A: Create and push secrets
    const hostAEnvPath = path.join(hostADir, '.env');
    const hostASecrets = {
      DATABASE_URL: 'postgresql://localhost/db_a',
      API_KEY: 'secret-key-123',
      DEBUG: 'true',
    };

    // Write secrets to Host A's .env
    const hostAEnvContent = Object.entries(hostASecrets)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    fs.writeFileSync(hostAEnvPath, hostAEnvContent, 'utf8');

    // Push from Host A
    const managerA = new SecretsManager(undefined, sharedKey, false);
    await managerA.push(hostAEnvPath, environment);
    await managerA.cleanup();

    // Host B: Pull secrets
    const hostBEnvPath = path.join(hostBDir, '.env');
    const managerB = new SecretsManager(undefined, sharedKey, false);
    await managerB.pull(hostBEnvPath, environment);
    await managerB.cleanup();

    // Verify Host B has the same secrets as Host A
    expect(fs.existsSync(hostBEnvPath)).toBe(true);
    const hostBContent = fs.readFileSync(hostBEnvPath, 'utf8');
    const hostBSecrets = parseEnvContent(hostBContent);

    expect(hostBSecrets.DATABASE_URL).toBe(hostASecrets.DATABASE_URL);
    expect(hostBSecrets.API_KEY).toBe(hostASecrets.API_KEY);
    expect(hostBSecrets.DEBUG).toBe(hostASecrets.DEBUG);
  });

  it('should sync bidirectionally: A→B, B modifies, B→A', async () => {
    // Host A: Initial push
    const hostAEnvPath = path.join(hostADir, '.env');
    fs.writeFileSync(hostAEnvPath, 'INITIAL_KEY=initial_value\n', 'utf8');

    const managerA1 = new SecretsManager(undefined, sharedKey, false);
    await managerA1.push(hostAEnvPath, environment);
    await managerA1.cleanup();

    // Host B: Pull initial secrets
    const hostBEnvPath = path.join(hostBDir, '.env');
    const managerB1 = new SecretsManager(undefined, sharedKey, false);
    await managerB1.pull(hostBEnvPath, environment);
    await managerB1.cleanup();

    // Verify Host B got initial secret
    let hostBContent = fs.readFileSync(hostBEnvPath, 'utf8');
    expect(hostBContent).toContain('INITIAL_KEY=initial_value');

    // Host B: Modify and push
    fs.writeFileSync(
      hostBEnvPath,
      'INITIAL_KEY=initial_value\nNEW_KEY_FROM_B=added_by_host_b\n',
      'utf8'
    );
    const managerB2 = new SecretsManager(undefined, sharedKey, false);
    await managerB2.push(hostBEnvPath, environment, true); // force=true
    await managerB2.cleanup();

    // Host A: Pull updated secrets
    const managerA2 = new SecretsManager(undefined, sharedKey, false);
    await managerA2.pull(hostAEnvPath, environment, true); // force=true
    await managerA2.cleanup();

    // Verify Host A now has both keys
    const hostAContent = fs.readFileSync(hostAEnvPath, 'utf8');
    const hostASecrets = parseEnvContent(hostAContent);

    expect(hostASecrets.INITIAL_KEY).toBe('initial_value');
    expect(hostASecrets.NEW_KEY_FROM_B).toBe('added_by_host_b');
  });

  it('should maintain separate environments across hosts', async () => {
    const envDev = `dev-${Date.now()}`;
    const envProd = `prod-${Date.now()}`;

    // Host A: Push to dev
    const hostAEnvPath = path.join(hostADir, '.env');
    fs.writeFileSync(hostAEnvPath, 'ENV=development\n', 'utf8');
    const managerA1 = new SecretsManager(undefined, sharedKey, false);
    await managerA1.push(hostAEnvPath, envDev);
    await managerA1.cleanup();

    // Host A: Push to prod
    fs.writeFileSync(hostAEnvPath, 'ENV=production\n', 'utf8');
    const managerA2 = new SecretsManager(undefined, sharedKey, false);
    await managerA2.push(hostAEnvPath, envProd);
    await managerA2.cleanup();

    // Host B: Pull dev
    const hostBEnvPath = path.join(hostBDir, '.env');
    const managerB1 = new SecretsManager(undefined, sharedKey, false);
    await managerB1.pull(hostBEnvPath, envDev);
    await managerB1.cleanup();

    let hostBContent = fs.readFileSync(hostBEnvPath, 'utf8');
    expect(hostBContent).toContain('ENV=development');

    // Host B: Pull prod
    const managerB2 = new SecretsManager(undefined, sharedKey, false);
    await managerB2.pull(hostBEnvPath, envProd, true); // force overwrite
    await managerB2.cleanup();

    hostBContent = fs.readFileSync(hostBEnvPath, 'utf8');
    expect(hostBContent).toContain('ENV=production');
  });

  it('should fail to decrypt with wrong key', async () => {
    // Host A: Push with key1
    const hostAEnvPath = path.join(hostADir, '.env');
    fs.writeFileSync(hostAEnvPath, 'SECRET=value123\n', 'utf8');

    const key1 = crypto.randomBytes(32).toString('hex');
    const managerA = new SecretsManager(undefined, key1, false);
    await managerA.push(hostAEnvPath, environment);
    await managerA.cleanup();

    // Host B: Try to pull with different key
    const key2 = crypto.randomBytes(32).toString('hex');
    const hostBEnvPath = path.join(hostBDir, '.env');
    const managerB = new SecretsManager(undefined, key2, false);

    await expect(async () => {
      await managerB.pull(hostBEnvPath, environment);
    }).rejects.toThrow();

    await managerB.cleanup();
  });

  it('should sync large number of secrets efficiently', async () => {
    // Host A: Create 100 secrets
    const hostAEnvPath = path.join(hostADir, '.env');
    const largeSecrets: Record<string, string> = {};

    for (let i = 1; i <= 100; i++) {
      largeSecrets[`KEY_${i}`] = `value_${i}_${crypto.randomBytes(16).toString('hex')}`;
    }

    const hostAContent = Object.entries(largeSecrets)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    fs.writeFileSync(hostAEnvPath, hostAContent, 'utf8');

    // Push from Host A
    const startPush = Date.now();
    const managerA = new SecretsManager(undefined, sharedKey, false);
    await managerA.push(hostAEnvPath, environment);
    await managerA.cleanup();
    const pushTime = Date.now() - startPush;

    // Pull to Host B
    const hostBEnvPath = path.join(hostBDir, '.env');
    const startPull = Date.now();
    const managerB = new SecretsManager(undefined, sharedKey, false);
    await managerB.pull(hostBEnvPath, environment);
    await managerB.cleanup();
    const pullTime = Date.now() - startPull;

    // Verify all secrets transferred
    const hostBContent = fs.readFileSync(hostBEnvPath, 'utf8');
    const hostBSecrets = parseEnvContent(hostBContent);

    expect(Object.keys(hostBSecrets).length).toBe(100);

    // Verify random samples
    expect(hostBSecrets.KEY_1).toBe(largeSecrets.KEY_1);
    expect(hostBSecrets.KEY_50).toBe(largeSecrets.KEY_50);
    expect(hostBSecrets.KEY_100).toBe(largeSecrets.KEY_100);

    // Performance check (should complete in reasonable time)
    expect(pushTime).toBeLessThan(5000); // 5 seconds
    expect(pullTime).toBeLessThan(5000); // 5 seconds
  });

  it('should handle concurrent push from multiple hosts', async () => {
    // This simulates race condition where two hosts push at nearly the same time
    const hostAEnvPath = path.join(hostADir, '.env');
    const hostBEnvPath = path.join(hostBDir, '.env');

    fs.writeFileSync(hostAEnvPath, 'HOST=A\nTIMESTAMP=1\n', 'utf8');
    fs.writeFileSync(hostBEnvPath, 'HOST=B\nTIMESTAMP=2\n', 'utf8');

    // Push from both hosts concurrently
    const managerA = new SecretsManager(undefined, sharedKey, false);
    const managerB = new SecretsManager(undefined, sharedKey, false);

    await Promise.all([
      managerA.push(hostAEnvPath, environment),
      managerB.push(hostBEnvPath, environment, true), // force to avoid destructive check
    ]);

    await managerA.cleanup();
    await managerB.cleanup();

    // One of them should have won (last write wins)
    // Pull to verify storage is still valid
    const hostCDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-host-c-'));
    const hostCEnvPath = path.join(hostCDir, '.env');
    const managerC = new SecretsManager(undefined, sharedKey, false);

    // Pull should succeed
    await managerC.pull(hostCEnvPath, environment);

    const hostCContent = fs.readFileSync(hostCEnvPath, 'utf8');
    const hostCSecrets = parseEnvContent(hostCContent);

    // Should have either A or B's data
    expect(['A', 'B']).toContain(hostCSecrets.HOST);

    await managerC.cleanup();
    fs.rmSync(hostCDir, { recursive: true });
  });

  it('should verify IPFS metadata consistency across hosts', async () => {
    // Host A: Push secrets
    const hostAEnvPath = path.join(hostADir, '.env');
    fs.writeFileSync(hostAEnvPath, 'META_TEST=value\n', 'utf8');

    const managerA = new SecretsManager(undefined, sharedKey, false);
    await managerA.push(hostAEnvPath, environment);
    await managerA.cleanup();

    // Check metadata file
    const metadataPath = path.join(testLshDir, 'secrets-metadata.json');
    expect(fs.existsSync(metadataPath)).toBe(true);

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const metadataKeys = Object.keys(metadata);

    // The metadata key might include git repo name
    // Find the key that includes our environment
    const envKey = metadataKeys.find(key => key.includes(environment)) || environment;

    expect(metadata[envKey]).toBeDefined();
    expect(metadata[envKey].cid).toMatch(/^bafkrei/);
    expect(metadata[envKey].keys_count).toBe(1);
    expect(metadata[envKey].encrypted).toBe(true);

    // Host B: Pull and verify same CID
    const hostBEnvPath = path.join(hostBDir, '.env');
    const managerB = new SecretsManager(undefined, sharedKey, false);
    await managerB.pull(hostBEnvPath, environment);
    await managerB.cleanup();

    // Metadata should still be the same
    const metadataAfter = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    expect(metadataAfter[envKey].cid).toBe(metadata[envKey].cid);
  });
});

/**
 * Helper to parse .env content into object
 */
function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.trim() && !line.trim().startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        result[match[1].trim()] = match[2].trim();
      }
    }
  }

  return result;
}
