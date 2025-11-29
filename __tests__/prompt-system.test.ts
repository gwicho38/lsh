/**
 * Prompt System Tests
 * Tests for the ZSH-compatible prompt system
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('PromptSystem', () => {
  let PromptSystem: typeof import('../src/lib/prompt-system.js').PromptSystem;

  beforeAll(async () => {
    const module = await import('../src/lib/prompt-system.js');
    PromptSystem = module.PromptSystem;
  });

  describe('Constructor', () => {
    it('should create instance', () => {
      const prompt = new PromptSystem();
      expect(prompt).toBeDefined();
    });
  });

  describe('Prompt Expansion', () => {
    it('should expand username sequence %n', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%n', { user: 'testuser' });
      expect(result).toContain('testuser');
    });

    it('should expand hostname sequence %m', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%m', { host: 'testhost.local' });
      expect(result).toContain('testhost.local');
    });

    it('should expand hostname without domain %M', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%M', { host: 'testhost.local' });
      expect(result).toContain('testhost');
      expect(result).not.toContain('.local');
    });

    it('should expand full path %d', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%d', { cwd: '/home/user/projects' });
      expect(result).toContain('/home/user/projects');
    });

    it('should expand basename %c', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%c', { cwd: '/home/user/projects' });
      expect(result).toContain('projects');
    });

    it('should expand job count %j', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%j', { jobCount: 3 });
      expect(result).toContain('3');
    });

    it('should expand exit code %?', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%?', { exitCode: 1 });
      expect(result).toContain('1');
    });

    it('should expand prompt character %# for non-root', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%#', { user: 'normaluser' });
      expect(result).toContain('$');
    });

    it('should expand prompt character %# for root', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%#', { user: 'root' });
      expect(result).toContain('#');
    });

    it('should expand literal percent %%', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('100%%');
      expect(result).toBe('100%');
    });

    it('should expand time sequence %T', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%T');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should expand path with tilde %~', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%~', {
        cwd: '/home/testuser/projects',
        home: '/home/testuser'
      });
      expect(result).toContain('~');
    });

    it('should expand git branch when git context provided', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%b', {
        git: { branch: 'main', status: 'clean' }
      });
      expect(result).toContain('main');
    });

    it('should expand %C as basename alias', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%C', { cwd: '/home/user/myproject' });
      expect(result).toContain('myproject');
    });

    it('should expand %h as job count alias', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%h', { jobCount: 5 });
      expect(result).toContain('5');
    });

    it('should expand %L as exit code alias', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%L', { exitCode: 127 });
      expect(result).toContain('127');
    });

    it('should expand %$ as prompt character alias', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%$', { user: 'normaluser' });
      expect(result).toContain('$');
    });

    it('should expand date sequences %D', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%D');
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('Theme Management', () => {
    it('should list available themes', () => {
      const prompt = new PromptSystem();
      const themes = prompt.getAvailableThemes();
      expect(Array.isArray(themes)).toBe(true);
      expect(themes.length).toBeGreaterThan(0);
    });

    it('should have default themes available', () => {
      const prompt = new PromptSystem();
      const themes = prompt.getAvailableThemes();
      expect(themes).toContain('default');
      expect(themes).toContain('minimal');
      expect(themes).toContain('detailed');
      expect(themes).toContain('git');
    });

    it('should set theme', () => {
      const prompt = new PromptSystem();
      const result = prompt.setTheme('minimal');
      expect(result).toBe(true);
      expect(prompt.getCurrentTheme()).toBe('minimal');
    });

    it('should return false for invalid theme', () => {
      const prompt = new PromptSystem();
      const result = prompt.setTheme('nonexistent-theme');
      expect(result).toBe(false);
    });

    it('should get current theme name', () => {
      const prompt = new PromptSystem();
      const themeName = prompt.getCurrentTheme();
      expect(typeof themeName).toBe('string');
      expect(themeName).toBe('default');
    });

    it('should add custom theme', () => {
      const prompt = new PromptSystem();
      const customTheme = {
        name: 'custom-test',
        description: 'Test theme',
        prompt: '%n@%m %~$ ',
      };
      prompt.addTheme(customTheme);
      const themes = prompt.getAvailableThemes();
      expect(themes).toContain('custom-test');
    });

    it('should get theme info', () => {
      const prompt = new PromptSystem();
      const themeInfo = prompt.getThemeInfo('default');
      expect(themeInfo).toBeDefined();
      expect(themeInfo?.name).toBe('default');
      expect(themeInfo?.description).toBeDefined();
      expect(themeInfo?.prompt).toBeDefined();
    });

    it('should return undefined for non-existent theme info', () => {
      const prompt = new PromptSystem();
      const themeInfo = prompt.getThemeInfo('nonexistent');
      expect(themeInfo).toBeUndefined();
    });
  });

  describe('Context Management', () => {
    it('should update context', () => {
      const prompt = new PromptSystem();
      prompt.updateContext({ cwd: '/new/path' });
      const result = prompt.expandPrompt('%d');
      expect(result).toContain('/new/path');
    });

    it('should update multiple context values', () => {
      const prompt = new PromptSystem();
      prompt.updateContext({
        cwd: '/test/path',
        user: 'newuser',
        jobCount: 10
      });
      const result = prompt.expandPrompt('%n:%d:%j');
      expect(result).toContain('newuser');
      expect(result).toContain('/test/path');
      expect(result).toContain('10');
    });
  });

  describe('Prompt Generation', () => {
    it('should generate prompt from current theme', () => {
      const prompt = new PromptSystem();
      const result = prompt.getCurrentPrompt();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate prompt with custom context', () => {
      const prompt = new PromptSystem();
      const result = prompt.getCurrentPrompt({ user: 'customuser' });
      expect(result).toContain('customuser');
    });

    it('should generate rprompt if theme has one', () => {
      const prompt = new PromptSystem();
      prompt.setTheme('detailed');
      const result = prompt.getCurrentRPrompt();
      expect(typeof result).toBe('string');
    });

    it('should return empty string for rprompt if theme lacks one', () => {
      const prompt = new PromptSystem();
      prompt.setTheme('minimal');
      const result = prompt.getCurrentRPrompt();
      expect(result).toBe('');
    });
  });

  describe('Color Sequences', () => {
    it('should expand foreground color %F{color}', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%F{red}text%f');
      expect(result).toContain('\x1b[31m');
      expect(result).toContain('\x1b[0m');
    });

    it('should expand background color %K{color}', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%K{blue}text%k');
      expect(result).toContain('\x1b[44m');
      expect(result).toContain('\x1b[49m');
    });

    it('should expand bold %B and %b', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%Bbold%b');
      expect(result).toContain('\x1b[1m');
      expect(result).toContain('\x1b[22m');
    });

    it('should expand underline %U and %u', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%Uunderline%u');
      expect(result).toContain('\x1b[4m');
      expect(result).toContain('\x1b[24m');
    });
  });

  describe('Git Status Display', () => {
    it('should expand git status for clean repo', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%r', {
        git: { branch: 'main', status: 'clean' }
      });
      expect(result).toContain('✓');
    });

    it('should expand git status for dirty repo', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%r', {
        git: { branch: 'main', status: 'dirty' }
      });
      expect(result).toContain('●');
    });

    it('should expand git status for ahead repo', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%r', {
        git: { branch: 'main', status: 'ahead' }
      });
      expect(result).toContain('↑');
    });

    it('should expand git status for behind repo', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%r', {
        git: { branch: 'main', status: 'behind' }
      });
      expect(result).toContain('↓');
    });

    it('should expand git status for diverged repo', () => {
      const prompt = new PromptSystem();
      const result = prompt.expandPrompt('%r', {
        git: { branch: 'main', status: 'diverged' }
      });
      expect(result).toContain('↕');
    });
  });
});
