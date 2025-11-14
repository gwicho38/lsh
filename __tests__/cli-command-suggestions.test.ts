import { execSync } from 'child_process';
import { describe, it, expect } from '@jest/globals';

describe('CLI Command Suggestions', () => {
  const cliPath = 'node dist/cli.js';

  it('should suggest "list" when user types "listt"', () => {
    try {
      execSync(`${cliPath} listt`, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error: any) {
      const stderr = error.stderr || error.stdout;
      expect(stderr).toContain("error: unknown command 'listt'");
      expect(stderr).toContain('Did you mean one of these?');
      expect(stderr).toContain('list');
    }
  });

  it('should suggest "self" when user types "selg"', () => {
    try {
      execSync(`${cliPath} selg`, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error: any) {
      const stderr = error.stderr || error.stdout;
      expect(stderr).toContain("error: unknown command 'selg'");
      expect(stderr).toContain('Did you mean one of these?');
      expect(stderr).toContain('self');
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
    const result = execSync(`${cliPath} list --help`, { encoding: 'utf8', stdio: 'pipe' });
    expect(result).toContain('List secrets in the current local .env file');
  });

  it('should work correctly with options flags', () => {
    const result = execSync(`${cliPath} --version`, { encoding: 'utf8', stdio: 'pipe' });
    expect(result).toMatch(/\d+\.\d+\.\d+/); // Should contain version number
  });
});
