/**
 * Tests for ThemeManager
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ThemeManager, ParsedTheme } from '../../src/lib/theme-manager.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('ThemeManager', () => {
  let themeManager: ThemeManager;
  let tempDir: string;
  let ohmyzshPath: string;

  beforeEach(() => {
    themeManager = new ThemeManager();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsh-theme-test-'));
    ohmyzshPath = path.join(tempDir, '.oh-my-zsh', 'themes');
    fs.mkdirSync(ohmyzshPath, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('listThemes', () => {
    it('should list built-in themes', () => {
      const themes = themeManager.listThemes();

      expect(themes.builtin).toContain('default');
      expect(themes.builtin).toContain('minimal');
      expect(themes.builtin).toContain('powerline');
      expect(themes.builtin).toContain('robbyrussell');
      expect(themes.builtin).toContain('simple');
    });

    it('should return empty arrays when no custom or ohmyzsh themes', () => {
      const themes = themeManager.listThemes();

      expect(Array.isArray(themes.custom)).toBe(true);
      expect(Array.isArray(themes.ohmyzsh)).toBe(true);
    });
  });

  describe('getBuiltinTheme', () => {
    it('should return default theme', () => {
      const theme = themeManager.getBuiltinTheme('default');

      expect(theme.name).toBe('default');
      expect(theme.prompts.left).toBeTruthy();
    });

    it('should return minimal theme', () => {
      const theme = themeManager.getBuiltinTheme('minimal');

      expect(theme.name).toBe('minimal');
      expect(theme.prompts.left).toContain('❯');
    });

    it('should return powerline theme', () => {
      const theme = themeManager.getBuiltinTheme('powerline');

      expect(theme.name).toBe('powerline');
      expect(theme.prompts.left).toBeTruthy();
    });

    it('should return robbyrussell theme', () => {
      const theme = themeManager.getBuiltinTheme('robbyrussell');

      expect(theme.name).toBe('robbyrussell');
      expect(theme.prompts.left).toContain('➜');
    });

    it('should return simple theme', () => {
      const theme = themeManager.getBuiltinTheme('simple');

      expect(theme.name).toBe('simple');
      expect(theme.prompts.left).toBeTruthy();
    });

    it('should throw error for unknown theme', () => {
      expect(() => themeManager.getBuiltinTheme('nonexistent')).toThrow();
    });
  });

  describe('parseZshTheme', () => {
    it('should parse simple PROMPT definition', () => {
      const themeContent = `
PROMPT='%n@%m:%~$ '
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.name).toBe('test');
      expect(theme.prompts.left).toContain('%n@%m:%~');
    });

    it('should parse RPROMPT', () => {
      const themeContent = `
PROMPT='$ '
RPROMPT='%T'
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.prompts.left).toBeTruthy();
      expect(theme.prompts.right).toContain('%T');
    });

    it('should parse color definitions', () => {
      const themeContent = `
RED="%{%F{red}%}"
GREEN="%{%F{green}%}"
PROMPT="\${RED}error\${GREEN}ok"
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.colors.has('RED')).toBe(true);
      expect(theme.colors.has('GREEN')).toBe(true);
    });

    it('should parse git format info', () => {
      const themeContent = `
ZSH_THEME_GIT_PROMPT_PREFIX="("
ZSH_THEME_GIT_PROMPT_SUFFIX=")"
ZSH_THEME_GIT_PROMPT_DIRTY="*"
ZSH_THEME_GIT_PROMPT_CLEAN="✓"
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.gitFormats).toBeDefined();
      expect(theme.gitFormats?.branch).toContain('(');
    });

    it('should parse variable definitions', () => {
      const themeContent = `
MY_VAR="value"
ANOTHER_VAR='test'
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.variables.has('MY_VAR')).toBe(true);
      expect(theme.variables.get('MY_VAR')).toBe('value');
      expect(theme.variables.has('ANOTHER_VAR')).toBe(true);
    });

    it('should skip comments', () => {
      const themeContent = `
# This is a comment
PROMPT='$ '  # inline comment
# RPROMPT='should not parse'
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.prompts.left).toBeTruthy();
      expect(theme.prompts.right).toBeUndefined();
    });
  });

  describe('convertPromptToLsh', () => {
    it('should convert %n to username', () => {
      const colors = new Map<string, string>();
      const result = themeManager['convertPromptToLsh']('%n@host', colors);

      expect(result).toBeTruthy();
      expect(result).not.toContain('%n');
    });

    it('should convert %m to hostname', () => {
      const colors = new Map<string, string>();
      const result = themeManager['convertPromptToLsh']('user@%m', colors);

      expect(result).toBeTruthy();
      expect(result).not.toContain('%m');
    });

    it('should convert %~ to current directory with tilde', () => {
      const colors = new Map<string, string>();
      const result = themeManager['convertPromptToLsh']('%~$', colors);

      expect(result).toBeTruthy();
      expect(result).not.toContain('%~');
    });

    it('should convert %T to time', () => {
      const colors = new Map<string, string>();
      const result = themeManager['convertPromptToLsh']('[%T]', colors);

      expect(result).toBeTruthy();
      expect(result).not.toContain('%T');
    });

    it('should convert color variables', () => {
      const colors = new Map<string, string>([
        ['RED', 'red'],
        ['GREEN', 'green'],
      ]);
      const result = themeManager['convertPromptToLsh']('${RED}error${GREEN}ok', colors);

      expect(result).toBeTruthy();
      expect(result).not.toContain('${RED}');
      expect(result).not.toContain('${GREEN}');
    });

    it('should convert vcs_info to git_prompt_info', () => {
      const colors = new Map<string, string>();
      const result = themeManager['convertPromptToLsh']('$vcs_info_msg_0_', colors);

      expect(result).toContain('git_prompt_info');
      expect(result).not.toContain('vcs_info');
    });

    it('should handle multiple conversions', () => {
      const colors = new Map<string, string>([['BLUE', 'blue']]);
      const result = themeManager['convertPromptToLsh']('${BLUE}%n@%m:%~$', colors);

      expect(result).toBeTruthy();
      expect(result).not.toContain('%n');
      expect(result).not.toContain('%m');
      expect(result).not.toContain('%~');
      expect(result).not.toContain('${BLUE}');
    });
  });

  describe('mapColorToChalk', () => {
    it('should map standard color names', () => {
      expect(themeManager['mapColorToChalk']('red')).toBeTruthy();
      expect(themeManager['mapColorToChalk']('green')).toBeTruthy();
      expect(themeManager['mapColorToChalk']('blue')).toBeTruthy();
      expect(themeManager['mapColorToChalk']('yellow')).toBeTruthy();
      expect(themeManager['mapColorToChalk']('cyan')).toBeTruthy();
      expect(themeManager['mapColorToChalk']('magenta')).toBeTruthy();
    });

    it('should map 256 color codes', () => {
      expect(themeManager['mapColorToChalk']('196')).toBeTruthy(); // Red
      expect(themeManager['mapColorToChalk']('46')).toBeTruthy();  // Green
      expect(themeManager['mapColorToChalk']('21')).toBeTruthy();  // Blue
    });

    it('should default to white for unknown colors', () => {
      const result = themeManager['mapColorToChalk']('unknown');
      expect(result).toBeTruthy();
    });
  });

  describe('getAnsiCode', () => {
    it('should return ANSI codes for standard colors', () => {
      expect(themeManager['getAnsiCode']('black')).toBe('30');
      expect(themeManager['getAnsiCode']('red')).toBe('31');
      expect(themeManager['getAnsiCode']('green')).toBe('32');
      expect(themeManager['getAnsiCode']('yellow')).toBe('33');
      expect(themeManager['getAnsiCode']('blue')).toBe('34');
      expect(themeManager['getAnsiCode']('magenta')).toBe('35');
      expect(themeManager['getAnsiCode']('cyan')).toBe('36');
      expect(themeManager['getAnsiCode']('white')).toBe('37');
    });

    it('should return code for bold and dim', () => {
      expect(themeManager['getAnsiCode']('bold')).toBe('1');
      expect(themeManager['getAnsiCode']('dim')).toBe('2');
    });

    it('should return 0 for reset', () => {
      expect(themeManager['getAnsiCode']('reset')).toBe('0');
    });

    it('should default to 37 for unknown colors', () => {
      expect(themeManager['getAnsiCode']('unknown')).toBe('37');
    });
  });

  describe('applyTheme', () => {
    it('should generate export commands for theme', () => {
      const theme: ParsedTheme = {
        name: 'test',
        colors: new Map([['RED', '31']]),
        prompts: {
          left: '$ ',
        },
        variables: new Map(),
        hooks: [],
        dependencies: [],
      };

      const commands = themeManager.applyTheme(theme);

      expect(commands).toContain('export LSH_PROMPT');
      expect(commands).toContain('$ ');
    });

    it('should include RPROMPT if defined', () => {
      const theme: ParsedTheme = {
        name: 'test',
        colors: new Map(),
        prompts: {
          left: '$ ',
          right: '%T',
        },
        variables: new Map(),
        hooks: [],
        dependencies: [],
      };

      const commands = themeManager.applyTheme(theme);

      expect(commands).toContain('export LSH_RPROMPT');
    });

    it('should handle empty prompts', () => {
      const theme: ParsedTheme = {
        name: 'test',
        colors: new Map(),
        prompts: {
          left: '',
        },
        variables: new Map(),
        hooks: [],
        dependencies: [],
      };

      expect(() => themeManager.applyTheme(theme)).not.toThrow();
    });
  });

  describe('previewTheme', () => {
    it('should not throw when previewing valid theme', () => {
      const theme: ParsedTheme = {
        name: 'test',
        colors: new Map(),
        prompts: {
          left: 'test$ ',
        },
        variables: new Map(),
        hooks: [],
        dependencies: [],
      };

      expect(() => themeManager.previewTheme(theme)).not.toThrow();
    });

    it('should handle themes with git info', () => {
      const theme: ParsedTheme = {
        name: 'test',
        colors: new Map(),
        prompts: {
          left: '$(git_prompt_info)$ ',
        },
        gitFormats: {
          branch: '(branch)',
          unstaged: '*',
          staged: '+',
        },
        variables: new Map(),
        hooks: [],
        dependencies: ['git'],
      };

      expect(() => themeManager.previewTheme(theme)).not.toThrow();
    });
  });

  describe('importOhMyZshTheme', () => {
    it('should throw error if Oh-My-Zsh not found', async () => {
      await expect(themeManager.importOhMyZshTheme('nonexistent')).rejects.toThrow();
    });

    it('should import theme if file exists', async () => {
      // Create mock Oh-My-Zsh theme
      const themePath = path.join(ohmyzshPath, 'test.zsh-theme');
      const themeContent = `
PROMPT='%n@%m:%~$ '
`;
      fs.writeFileSync(themePath, themeContent, 'utf8');

      // Override HOME to temp directory
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;

      try {
        const theme = await themeManager.importOhMyZshTheme('test');

        expect(theme.name).toBe('test');
        expect(theme.prompts.left).toBeTruthy();
      } finally {
        process.env.HOME = originalHome;
      }
    });

    it('should throw error for missing theme file', async () => {
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;

      try {
        await expect(themeManager.importOhMyZshTheme('missing')).rejects.toThrow();
      } finally {
        process.env.HOME = originalHome;
      }
    });
  });

  describe('saveAsLshTheme', () => {
    it('should save theme in LSH format', () => {
      const theme: ParsedTheme = {
        name: 'test',
        colors: new Map([['RED', '31']]),
        prompts: {
          left: '$ ',
          right: '%T',
        },
        gitFormats: {
          branch: '(branch)',
        },
        variables: new Map([['VAR', 'value']]),
        hooks: [],
        dependencies: ['git'],
      };

      const customThemesPath = path.join(tempDir, 'themes');
      fs.mkdirSync(customThemesPath, { recursive: true });

      // Override customThemesPath for test
      themeManager['customThemesPath'] = customThemesPath;

      themeManager['saveAsLshTheme'](theme);

      const savedPath = path.join(customThemesPath, 'test.lsh-theme');
      expect(fs.existsSync(savedPath)).toBe(true);

      const savedContent = JSON.parse(fs.readFileSync(savedPath, 'utf8'));
      expect(savedContent.name).toBe('test');
      expect(savedContent.prompts.left).toBe('$ ');
      expect(savedContent.prompts.right).toBe('%T');
    });

    it('should handle save errors gracefully', () => {
      const theme: ParsedTheme = {
        name: 'test',
        colors: new Map(),
        prompts: { left: '$ ' },
        variables: new Map(),
        hooks: [],
        dependencies: [],
      };

      // Use invalid path
      themeManager['customThemesPath'] = '/invalid/path/themes';

      // Should not throw
      expect(() => themeManager['saveAsLshTheme'](theme)).not.toThrow();
    });
  });

  describe('theme structure validation', () => {
    it('should have all required fields in parsed theme', () => {
      const themeContent = `
PROMPT='$ '
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme).toHaveProperty('name');
      expect(theme).toHaveProperty('colors');
      expect(theme).toHaveProperty('prompts');
      expect(theme).toHaveProperty('variables');
      expect(theme).toHaveProperty('hooks');
      expect(theme).toHaveProperty('dependencies');
    });

    it('should initialize empty collections correctly', () => {
      const themeContent = `
PROMPT='$ '
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.colors).toBeInstanceOf(Map);
      expect(theme.variables).toBeInstanceOf(Map);
      expect(Array.isArray(theme.hooks)).toBe(true);
      expect(Array.isArray(theme.dependencies)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty theme file', () => {
      const theme = themeManager['parseZshTheme']('empty', '');

      expect(theme.name).toBe('empty');
      expect(theme.prompts.left).toBe('');
    });

    it('should handle malformed color definitions', () => {
      const themeContent = `
BADCOLOR=not a color
PROMPT='$ '
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.prompts.left).toBeTruthy();
    });

    it('should handle very long prompt strings', () => {
      const longPrompt = 'x'.repeat(1000);
      const themeContent = `
PROMPT='${longPrompt}'
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.prompts.left.length).toBeGreaterThan(900);
    });

    it('should handle special characters in prompts', () => {
      const themeContent = `
PROMPT='$ ❯ ✓ ✗ → ← '
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.prompts.left).toContain('❯');
      expect(theme.prompts.left).toContain('✓');
    });
  });
});
