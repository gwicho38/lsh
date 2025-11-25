/**
 * Multi-Host Key Isolation Tests
 *
 * Tests the critical fix for multi-host sync where LSH_SECRETS_KEY should:
 * 1. Be filtered out during push (not synced to cloud)
 * 2. Be preserved during pull (local value kept)
 * 3. Allow different hosts to have different encryption keys in their .env
 * 4. Prevent sync conflicts between hosts
 *
 * Context: Before this fix, LSH_SECRETS_KEY was stored in .env and synced,
 * causing hosts to overwrite each other's keys in an endless conflict loop.
 */

import { SecretsManager } from '../src/lib/secrets-manager.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('Multi-Host Key Isolation', () => {
  let hostADir: string;
  let hostBDir: string;
  let sharedEncryptionKey: string;

  beforeAll(() => {
    // Create temporary directories for Host A and Host B
    hostADir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-host-a-'));
    hostBDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-host-b-'));

    // Both hosts share the same encryption key for symmetric encryption
    sharedEncryptionKey = 'fa17bd2771ba958682895aea73678e60a34da005bd21c072a473362a970bfc4f';
  });

  afterAll(() => {
    // Cleanup test directories
    if (fs.existsSync(hostADir)) {
      fs.rmSync(hostADir, { recursive: true, force: true });
    }
    if (fs.existsSync(hostBDir)) {
      fs.rmSync(hostBDir, { recursive: true, force: true });
    }
  });

  describe('LSH_SECRETS_KEY Filtering', () => {
    it('should filter out LSH_SECRETS_KEY during push', async () => {
      // Setup Host A with .env containing LSH_SECRETS_KEY
      const hostAEnvPath = path.join(hostADir, '.env');
      const hostAEnvContent = `LSH_SECRETS_KEY=host_a_key_should_be_filtered
DATABASE_URL=postgres://localhost/db
API_KEY=secret123
SECRET_VALUE=test_value`;

      fs.writeFileSync(hostAEnvPath, hostAEnvContent, 'utf-8');

      // Initialize git repo (required for repo-aware naming)
      execSync('git init', { cwd: hostADir });
      execSync('git config user.name "Test"', { cwd: hostADir });
      execSync('git config user.email "test@test.com"', { cwd: hostADir });

      // Change to Host A directory
      const originalCwd = process.cwd();
      process.chdir(hostADir);

      try {
        const manager = new SecretsManager(undefined, sharedEncryptionKey);

        // Push from Host A - should filter out LSH_SECRETS_KEY
        await manager.push(hostAEnvPath, '', true);

        // Get the metadata to check how many secrets were stored
        const metadata = manager['storage'].getMetadata('', path.basename(hostADir));
        expect(metadata).toBeDefined();
        expect(metadata!.keys_count).toBe(3); // Only 3 secrets (not 4)

        // Pull back to verify LSH_SECRETS_KEY was not synced
        const backupPath = hostAEnvPath + '.original';
        fs.copyFileSync(hostAEnvPath, backupPath);

        await manager.pull(hostAEnvPath, '', true);

        const pulledContent = fs.readFileSync(hostAEnvPath, 'utf-8');
        const pulledLines = pulledContent.split('\n').filter(l => l.trim());

        // Should have 4 lines: 3 pulled secrets + 1 preserved LSH_SECRETS_KEY
        expect(pulledLines.length).toBe(4);

        // LSH_SECRETS_KEY should be preserved from local .env
        expect(pulledContent).toContain('LSH_SECRETS_KEY=host_a_key_should_be_filtered');

        // Other secrets should be pulled
        expect(pulledContent).toContain('DATABASE_URL=postgres://localhost/db');
        expect(pulledContent).toContain('API_KEY=secret123');
        expect(pulledContent).toContain('SECRET_VALUE=test_value');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should also filter out LSH_MASTER_KEY', async () => {
      const hostAEnvPath = path.join(hostADir, '.env.master');
      const hostAEnvContent = `LSH_MASTER_KEY=master_key_filtered
LSH_SECRETS_KEY=secrets_key_filtered
API_KEY=secret456`;

      fs.writeFileSync(hostAEnvPath, hostAEnvContent, 'utf-8');

      const originalCwd = process.cwd();
      process.chdir(hostADir);

      try {
        const manager = new SecretsManager(undefined, sharedEncryptionKey);
        await manager.push(hostAEnvPath, 'test', true);

        const metadata = manager['storage'].getMetadata('test', path.basename(hostADir));
        expect(metadata).toBeDefined();
        // Should only have 1 secret (API_KEY), both LSH keys filtered
        expect(metadata!.keys_count).toBe(1);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should filter out LSH_INTERNAL_* keys', async () => {
      const hostAEnvPath = path.join(hostADir, '.env.internal');
      const hostAEnvContent = `LSH_INTERNAL_DEBUG=true
LSH_INTERNAL_TEST=value
API_KEY=secret789
DATABASE_URL=postgres://test`;

      fs.writeFileSync(hostAEnvPath, hostAEnvContent, 'utf-8');

      const originalCwd = process.cwd();
      process.chdir(hostADir);

      try {
        const manager = new SecretsManager(undefined, sharedEncryptionKey);
        await manager.push(hostAEnvPath, 'internal', true);

        const metadata = manager['storage'].getMetadata('internal', path.basename(hostADir));
        expect(metadata).toBeDefined();
        // Should only have 2 secrets (API_KEY, DATABASE_URL), LSH_INTERNAL_* filtered
        expect(metadata!.keys_count).toBe(2);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('LSH_SECRETS_KEY Preservation', () => {
    it('should preserve local LSH_SECRETS_KEY during pull', async () => {
      // Host A pushes secrets (without LSH_SECRETS_KEY due to filtering)
      const hostAEnvPath = path.join(hostADir, '.env.preserve');
      const hostAContent = `LSH_SECRETS_KEY=host_a_local_key
SHARED_SECRET_1=value1
SHARED_SECRET_2=value2`;

      fs.writeFileSync(hostAEnvPath, hostAContent, 'utf-8');

      const originalCwd = process.cwd();
      process.chdir(hostADir);

      try {
        const managerA = new SecretsManager(undefined, sharedEncryptionKey);
        await managerA.push(hostAEnvPath, 'preserve', true);

        // Host B creates its own .env with different LSH_SECRETS_KEY
        const hostBEnvPath = path.join(hostBDir, '.env.preserve');
        const hostBInitialContent = `LSH_SECRETS_KEY=host_b_local_key
OLD_SECRET=old_value`;

        fs.writeFileSync(hostBEnvPath, hostBInitialContent, 'utf-8');

        // Initialize git repo for Host B
        execSync('git init', { cwd: hostBDir });
        execSync('git config user.name "Test"', { cwd: hostBDir });
        execSync('git config user.email "test@test.com"', { cwd: hostBDir });

        // Change to Host B directory
        process.chdir(hostBDir);

        const managerB = new SecretsManager(undefined, sharedEncryptionKey);

        // Host B pulls secrets from cloud
        await managerB.pull(hostBEnvPath, 'preserve', true);

        const pulledContent = fs.readFileSync(hostBEnvPath, 'utf-8');

        // Host B should have:
        // 1. Pulled secrets from Host A (SHARED_SECRET_1, SHARED_SECRET_2)
        // 2. Preserved its own LSH_SECRETS_KEY (host_b_local_key)
        expect(pulledContent).toContain('LSH_SECRETS_KEY=host_b_local_key');
        expect(pulledContent).not.toContain('host_a_local_key');
        expect(pulledContent).toContain('SHARED_SECRET_1=value1');
        expect(pulledContent).toContain('SHARED_SECRET_2=value2');
        expect(pulledContent).not.toContain('OLD_SECRET'); // Overwritten by pull
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should preserve multiple LSH keys during pull', async () => {
      const hostAEnvPath = path.join(hostADir, '.env.multi');
      const hostAContent = `SHARED_SECRET=shared_value`;

      fs.writeFileSync(hostAEnvPath, hostAContent, 'utf-8');

      const originalCwd = process.cwd();
      process.chdir(hostADir);

      try {
        const managerA = new SecretsManager(undefined, sharedEncryptionKey);
        await managerA.push(hostAEnvPath, 'multi', true);

        // Host B has multiple LSH keys
        const hostBEnvPath = path.join(hostBDir, '.env.multi');
        const hostBInitialContent = `LSH_SECRETS_KEY=host_b_secrets_key
LSH_MASTER_KEY=host_b_master_key
LSH_INTERNAL_CONFIG=host_b_config`;

        fs.writeFileSync(hostBEnvPath, hostBInitialContent, 'utf-8');

        process.chdir(hostBDir);
        const managerB = new SecretsManager(undefined, sharedEncryptionKey);
        await managerB.pull(hostBEnvPath, 'multi', true);

        const pulledContent = fs.readFileSync(hostBEnvPath, 'utf-8');

        // All LSH keys should be preserved
        expect(pulledContent).toContain('LSH_SECRETS_KEY=host_b_secrets_key');
        expect(pulledContent).toContain('LSH_MASTER_KEY=host_b_master_key');
        expect(pulledContent).toContain('LSH_INTERNAL_CONFIG=host_b_config');
        // Shared secret should be pulled
        expect(pulledContent).toContain('SHARED_SECRET=shared_value');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Multi-Host Sync Workflow', () => {
    it('should allow different hosts to have different LSH_SECRETS_KEY values', async () => {
      // This is the critical test that validates the entire fix

      // Setup Host A
      execSync('git init', { cwd: hostADir });
      execSync('git config user.name "Host A"', { cwd: hostADir });
      execSync('git config user.email "a@test.com"', { cwd: hostADir });

      const hostAEnvPath = path.join(hostADir, '.env');
      const hostAContent = `LSH_SECRETS_KEY=unique_key_for_host_a
DATABASE_URL=postgres://hostA/db
API_KEY=api_key_v1
SECRET_TOKEN=token123`;

      fs.writeFileSync(hostAEnvPath, hostAContent, 'utf-8');

      // Setup Host B
      execSync('git init', { cwd: hostBDir });
      execSync('git config user.name "Host B"', { cwd: hostBDir });
      execSync('git config user.email "b@test.com"', { cwd: hostBDir });

      const hostBEnvPath = path.join(hostBDir, '.env');
      const hostBInitialContent = `LSH_SECRETS_KEY=unique_key_for_host_b
OLD_VAR=should_be_overwritten`;

      fs.writeFileSync(hostBEnvPath, hostBInitialContent, 'utf-8');

      const originalCwd = process.cwd();

      try {
        // Host A pushes (Step 1)
        process.chdir(hostADir);
        const managerA = new SecretsManager(undefined, sharedEncryptionKey);
        await managerA.push(hostAEnvPath, '', true);

        // Verify Host A's .env still has its own LSH_SECRETS_KEY
        const hostAAfterPush = fs.readFileSync(hostAEnvPath, 'utf-8');
        expect(hostAAfterPush).toContain('LSH_SECRETS_KEY=unique_key_for_host_a');

        // Host B pulls (Step 2)
        process.chdir(hostBDir);
        const managerB = new SecretsManager(undefined, sharedEncryptionKey);
        await managerB.pull(hostBEnvPath, '', true);

        // Verify Host B pulled the shared secrets
        const hostBAfterPull = fs.readFileSync(hostBEnvPath, 'utf-8');
        expect(hostBAfterPull).toContain('DATABASE_URL=postgres://hostA/db');
        expect(hostBAfterPull).toContain('API_KEY=api_key_v1');
        expect(hostBAfterPull).toContain('SECRET_TOKEN=token123');

        // Verify Host B kept its own LSH_SECRETS_KEY (NOT Host A's)
        expect(hostBAfterPull).toContain('LSH_SECRETS_KEY=unique_key_for_host_b');
        expect(hostBAfterPull).not.toContain('unique_key_for_host_a');

        // Host B updates a secret and pushes back (Step 3)
        const hostBUpdatedContent = hostBAfterPull.replace(
          'API_KEY=api_key_v1',
          'API_KEY=api_key_v2_from_host_b'
        );
        fs.writeFileSync(hostBEnvPath, hostBUpdatedContent, 'utf-8');
        await managerB.push(hostBEnvPath, '', true);

        // Verify Host B still has its own LSH_SECRETS_KEY after push
        const hostBAfterPush = fs.readFileSync(hostBEnvPath, 'utf-8');
        expect(hostBAfterPush).toContain('LSH_SECRETS_KEY=unique_key_for_host_b');

        // Host A pulls the update (Step 4)
        process.chdir(hostADir);
        await managerA.pull(hostAEnvPath, '', true);

        // Verify Host A got the updated secret from Host B
        const hostAAfterPull = fs.readFileSync(hostAEnvPath, 'utf-8');
        expect(hostAAfterPull).toContain('API_KEY=api_key_v2_from_host_b');

        // Verify Host A STILL has its own LSH_SECRETS_KEY (NOT Host B's)
        expect(hostAAfterPull).toContain('LSH_SECRETS_KEY=unique_key_for_host_a');
        expect(hostAAfterPull).not.toContain('unique_key_for_host_b');

        // ✅ SUCCESS: Both hosts maintained their own LSH_SECRETS_KEY
        // while successfully syncing all other secrets
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should not create sync conflicts in repeated push/pull cycles', async () => {
      execSync('git init', { cwd: hostADir });
      execSync('git config user.name "Test"', { cwd: hostADir });
      execSync('git config user.email "test@test.com"', { cwd: hostADir });
      execSync('git init', { cwd: hostBDir });
      execSync('git config user.name "Test"', { cwd: hostBDir });
      execSync('git config user.email "test@test.com"', { cwd: hostBDir });

      const hostAEnvPath = path.join(hostADir, '.env.cycle');
      const hostBEnvPath = path.join(hostBDir, '.env.cycle');

      // Initial content with different LSH keys
      fs.writeFileSync(hostAEnvPath, 'LSH_SECRETS_KEY=key_a\nSECRET=v1', 'utf-8');
      fs.writeFileSync(hostBEnvPath, 'LSH_SECRETS_KEY=key_b', 'utf-8');

      const originalCwd = process.cwd();

      try {
        // Cycle 1: A pushes, B pulls
        process.chdir(hostADir);
        const managerA = new SecretsManager(undefined, sharedEncryptionKey);
        await managerA.push(hostAEnvPath, 'cycle', true);

        process.chdir(hostBDir);
        const managerB = new SecretsManager(undefined, sharedEncryptionKey);
        await managerB.pull(hostBEnvPath, 'cycle', true);

        let hostBContent = fs.readFileSync(hostBEnvPath, 'utf-8');
        expect(hostBContent).toContain('LSH_SECRETS_KEY=key_b');
        expect(hostBContent).toContain('SECRET=v1');

        // Cycle 2: B updates and pushes, A pulls
        fs.writeFileSync(hostBEnvPath, hostBContent.replace('SECRET=v1', 'SECRET=v2'), 'utf-8');
        await managerB.push(hostBEnvPath, 'cycle', true);

        process.chdir(hostADir);
        await managerA.pull(hostAEnvPath, 'cycle', true);

        let hostAContent = fs.readFileSync(hostAEnvPath, 'utf-8');
        expect(hostAContent).toContain('LSH_SECRETS_KEY=key_a');
        expect(hostAContent).toContain('SECRET=v2');

        // Cycle 3: A updates and pushes, B pulls
        fs.writeFileSync(hostAEnvPath, hostAContent.replace('SECRET=v2', 'SECRET=v3'), 'utf-8');
        await managerA.push(hostAEnvPath, 'cycle', true);

        process.chdir(hostBDir);
        await managerB.pull(hostBEnvPath, 'cycle', true);

        hostBContent = fs.readFileSync(hostBEnvPath, 'utf-8');
        expect(hostBContent).toContain('LSH_SECRETS_KEY=key_b'); // STILL Host B's key
        expect(hostBContent).toContain('SECRET=v3');

        // ✅ SUCCESS: After 3 cycles, each host still has its own LSH_SECRETS_KEY
        // No sync conflicts, no infinite loops of overwriting keys
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle .env with only LSH_SECRETS_KEY', async () => {
      const hostAEnvPath = path.join(hostADir, '.env.only-lsh');
      fs.writeFileSync(hostAEnvPath, 'LSH_SECRETS_KEY=only_key', 'utf-8');

      const originalCwd = process.cwd();
      process.chdir(hostADir);

      try {
        const manager = new SecretsManager(undefined, sharedEncryptionKey);
        await manager.push(hostAEnvPath, 'only-lsh', true);

        const metadata = manager['storage'].getMetadata('only-lsh', path.basename(hostADir));
        expect(metadata).toBeDefined();
        // Should have 0 secrets (LSH_SECRETS_KEY filtered out)
        expect(metadata!.keys_count).toBe(0);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle pull when local .env has no LSH keys', async () => {
      const hostAEnvPath = path.join(hostADir, '.env.no-lsh-push');
      fs.writeFileSync(hostAEnvPath, 'SECRET=value', 'utf-8');

      const originalCwd = process.cwd();
      process.chdir(hostADir);

      try {
        const managerA = new SecretsManager(undefined, sharedEncryptionKey);
        await managerA.push(hostAEnvPath, 'no-lsh', true);

        // Host B pulls but has no LSH keys initially
        const hostBEnvPath = path.join(hostBDir, '.env.no-lsh-pull');
        fs.writeFileSync(hostBEnvPath, 'LOCAL_VAR=local', 'utf-8');

        process.chdir(hostBDir);
        const managerB = new SecretsManager(undefined, sharedEncryptionKey);
        await managerB.pull(hostBEnvPath, 'no-lsh', true);

        const pulledContent = fs.readFileSync(hostBEnvPath, 'utf-8');
        // Should have pulled secret, and no LSH key should be added
        expect(pulledContent).toContain('SECRET=value');
        expect(pulledContent).not.toContain('LSH_SECRETS_KEY');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
