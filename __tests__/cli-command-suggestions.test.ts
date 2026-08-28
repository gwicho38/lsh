import { execSync } from 'child_process';
import { describe, it, expect } from '@jest/globals';

// ora requires Node 21+ (uses RegExp /v flag and import-with syntax)
const nodeVersion = parseInt(process.versions.node.split('.')[0], 10);
const describeIfSupported = nodeVersion >= 21 ? describe : describe.skip;

describeIfSupported('CLI Command Suggestions', () => {
  const cliPath = 'node dist/cli.js';

  it('should suggest "edit" when user types "edt"', () => {
    try {
      execSync(`${cliPath} edt`, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error: any) {
      const stderr = error.stderr || error.stdout;
      expect(stderr).toContain("error: unknown command 'edt'");
      expect(stderr).toContain('Did you mean one of these?');
      expect(stderr).toContain('edit');
    }
  });

  it('should suggest "sync" when user types "synk"', () => {
    try {
      execSync(`${cliPath} synk`, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error: any) {
      const stderr = error.stderr || error.stdout;
      expect(stderr).toContain("error: unknown command 'synk'");
      expect(stderr).toContain('Did you mean one of these?');
      expect(stderr).toContain('sync');
    }
  });

  it('should suggest "push" when user types "pish"', () => {
    try {
      execSync(`${cliPath} pish`, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error: any) {
      const stderr = error.stderr || error.stdout;
      expect(stderr).toContain("error: unknown command 'pish'");
      expect(stderr).toContain('push');
    }
  });

  it('should not suggest anything for completely unrelated command', () => {
    try {
      execSync(`${cliPath} xyz123`, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error: any) {
      const stderr = error.stderr || error.stdout;
      expect(stderr).toContain("error: unknown command 'xyz123'");
      expect(stderr).toContain("Run 'lsh --help'");
    }
  });

  it('should show help message with suggestions', () => {
    try {
      execSync(`${cliPath} listt`, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error: any) {
      const stderr = error.stderr || error.stdout;
      expect(stderr).toContain("Run 'lsh --help' to see available commands");
    }
  });

  it('should still allow valid commands to work', () => {
    const result = execSync(`${cliPath} edit --help`, { encoding: 'utf8', stdio: 'pipe' });
    expect(result).toContain('Edit the local .env, then optionally push the change');
  });

  it('should work correctly with options flags', () => {
    const result = execSync(`${cliPath} --version`, { encoding: 'utf8', stdio: 'pipe' });
    expect(result).toMatch(/\d+\.\d+\.\d+/); // Should contain version number
  });
});
