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

  describe('git format extraction', () => {
    it('should parse ZSH_THEME_GIT_PROMPT_PREFIX', () => {
      const themeContent = `
ZSH_THEME_GIT_PROMPT_PREFIX="git:("
ZSH_THEME_GIT_PROMPT_SUFFIX=")"
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.gitFormats).toBeDefined();
      expect(theme.gitFormats?.branch).toContain('git:(');
      expect(theme.gitFormats?.branch).toContain(')');
    });

    it('should parse ZSH_THEME_GIT_PROMPT_DIRTY', () => {
      const themeContent = `
ZSH_THEME_GIT_PROMPT_DIRTY="*"
ZSH_THEME_GIT_PROMPT_CLEAN="✓"
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.gitFormats).toBeDefined();
      expect(theme.gitFormats?.unstaged).toBe('*');
    });

    it('should parse ZSH_THEME_GIT_PROMPT_UNTRACKED', () => {
      const themeContent = `
ZSH_THEME_GIT_PROMPT_UNTRACKED="?"
ZSH_THEME_GIT_PROMPT_ADDED="+"
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.gitFormats).toBeDefined();
      expect(theme.gitFormats?.staged).toBe('+');
    });
  });

  describe('256-color mapping', () => {
    it('should map 256-color code to ANSI', () => {
      const result = themeManager['mapColorToChalk']('196');
      expect(result).toBeTruthy();
    });

    it('should handle various 256-color codes', () => {
      const codes = ['1', '21', '46', '196', '226', '255'];
      for (const code of codes) {
        const result = themeManager['mapColorToChalk'](code);
        expect(result).toBeTruthy();
      }
    });

    it('should fall back to white for invalid codes', () => {
      const result = themeManager['mapColorToChalk']('999');
      expect(result).toBeTruthy();
    });
  });

  describe('right prompt (RPROMPT)', () => {
    it('should parse and apply RPROMPT', () => {
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

      expect(commands).toContain('LSH_RPROMPT');
      expect(commands).toContain('%T');
    });

    it('should convert RPROMPT escapes', () => {
      const themeContent = `
PROMPT='$ '
RPROMPT='[%T]'
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.prompts.right).toContain('%T');
    });
  });

  describe('variable substitution in prompts', () => {
    it('should substitute color variables in prompts', () => {
      const colors = new Map<string, string>([
        ['RED', '31'],
        ['GREEN', '32'],
        ['BLUE', '34'],
      ]);

      const prompt = '${RED}error${GREEN}ok${BLUE}info';
      const result = themeManager['convertPromptToLsh'](prompt, colors);

      expect(result).not.toContain('${RED}');
      expect(result).not.toContain('${GREEN}');
      expect(result).not.toContain('${BLUE}');
    });

    it('should handle nested color variables', () => {
      const colors = new Map<string, string>([
        ['PRIMARY', 'red'],
        ['SECONDARY', 'blue'],
      ]);

      const prompt = '${PRIMARY}text1${SECONDARY}text2';
      const result = themeManager['convertPromptToLsh'](prompt, colors);

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should preserve literal $ when not a variable', () => {
      const colors = new Map<string, string>();
      const prompt = '$HOME is at ~';
      const result = themeManager['convertPromptToLsh'](prompt, colors);

      expect(result).toContain('$HOME');
    });
  });

  describe('custom theme loading', () => {
    it('should list custom themes from ~/.lsh/themes/', () => {
      const customThemesPath = path.join(tempDir, '.lsh', 'themes');
      fs.mkdirSync(customThemesPath, { recursive: true });

      // Create custom theme files
      fs.writeFileSync(path.join(customThemesPath, 'mytheme.lsh-theme'), '{}', 'utf8');
      fs.writeFileSync(path.join(customThemesPath, 'another.lsh-theme'), '{}', 'utf8');

      themeManager['customThemesPath'] = customThemesPath;

      const themes = themeManager.listThemes();

      expect(themes.custom).toContain('mytheme');
      expect(themes.custom).toContain('another');
    });

    it('should handle missing custom themes directory', () => {
      themeManager['customThemesPath'] = '/nonexistent/path';

      const themes = themeManager.listThemes();

      expect(themes.custom).toEqual([]);
    });
  });

  describe('Oh-My-Zsh directory scanning', () => {
    it('should list themes from Oh-My-Zsh directory', () => {
      const ohmyzshPath = path.join(tempDir, '.oh-my-zsh', 'themes');
      fs.mkdirSync(ohmyzshPath, { recursive: true });

      fs.writeFileSync(path.join(ohmyzshPath, 'theme1.zsh-theme'), 'PROMPT="$ "', 'utf8');
      fs.writeFileSync(path.join(ohmyzshPath, 'theme2.zsh-theme'), 'PROMPT="$ "', 'utf8');

      themeManager['themesPath'] = ohmyzshPath;

      const themes = themeManager.listThemes();

      expect(themes.ohmyzsh).toContain('theme1');
      expect(themes.ohmyzsh).toContain('theme2');
    });

    it('should handle missing Oh-My-Zsh directory', () => {
      themeManager['themesPath'] = '/nonexistent/path';

      const themes = themeManager.listThemes();

      expect(themes.ohmyzsh).toEqual([]);
    });
  });

  describe('theme dependencies and hooks', () => {
    it('should track git dependency when git prompts are used', () => {
      const themeContent = `
PROMPT='$(git_branch) $ '
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.dependencies).toContain('git');
    });

    it('should track virtualenv dependency when used', () => {
      const themeContent = `
PROMPT='$(virtualenv_prompt_info) $ '
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.dependencies).toContain('virtualenv');
    });
  });

  describe('continuation and select prompts', () => {
    it('should parse PS2 (continuation prompt)', () => {
      const themeContent = `
PROMPT='$ '
PS2='> '
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.prompts.continuation).toBeTruthy();
    });

    it('should parse PS3 (select prompt)', () => {
      const themeContent = `
PROMPT='$ '
PS3='#? '
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.prompts.select).toBeTruthy();
    });
  });

  describe('saveAsLshTheme functionality', () => {
    it('should create .lsh-theme file in custom directory', () => {
      const theme: ParsedTheme = {
        name: 'mytest',
        colors: new Map([['RED', '31']]),
        prompts: {
          left: '$ ',
          right: '%T',
        },
        gitFormats: {
          branch: '(git)',
          unstaged: '*',
          staged: '+',
        },
        variables: new Map([['VAR', 'value']]),
        hooks: [],
        dependencies: ['git'],
      };

      const customThemesPath = path.join(tempDir, 'themes');
      fs.mkdirSync(customThemesPath, { recursive: true });
      themeManager['customThemesPath'] = customThemesPath;

      themeManager['saveAsLshTheme'](theme);

      const savedPath = path.join(customThemesPath, 'mytest.lsh-theme');
      expect(fs.existsSync(savedPath)).toBe(true);

      const savedContent = JSON.parse(fs.readFileSync(savedPath, 'utf8'));
      expect(savedContent.name).toBe('mytest');
      expect(savedContent.prompts.left).toBe('$ ');
      expect(savedContent.prompts.right).toBe('%T');
    });

    it('should save all theme properties', () => {
      const theme: ParsedTheme = {
        name: 'complete',
        colors: new Map([
          ['RED', '31'],
          ['GREEN', '32'],
        ]),
        prompts: {
          left: '${RED}$ ',
          right: '%T',
          continuation: '> ',
          select: '#? ',
        },
        gitFormats: {
          branch: '(branch)',
          unstaged: '*',
          staged: '+',
          action: 'action',
        },
        variables: new Map([
          ['VAR1', 'value1'],
          ['VAR2', 'value2'],
        ]),
        hooks: ['precmd', 'preexec'],
        dependencies: ['git', 'virtualenv'],
      };

      const customThemesPath = path.join(tempDir, 'themes');
      fs.mkdirSync(customThemesPath, { recursive: true });
      themeManager['customThemesPath'] = customThemesPath;

      themeManager['saveAsLshTheme'](theme);

      const savedPath = path.join(customThemesPath, 'complete.lsh-theme');
      const savedContent = JSON.parse(fs.readFileSync(savedPath, 'utf8'));

      expect(savedContent.dependencies).toEqual(['git', 'virtualenv']);
      expect(savedContent.hooks).toEqual(['precmd', 'preexec']);
    });
  });

  describe('edge cases', () => {
    it('should handle themes with no git formats', () => {
      const themeContent = `
PROMPT='simple $ '
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      const commands = themeManager.applyTheme(theme);
      expect(commands).toBeTruthy();
    });

    it('should handle very long prompt strings', () => {
      const longPrompt = 'x'.repeat(500);
      const themeContent = `
PROMPT='${longPrompt}$ '
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.prompts.left.length).toBeGreaterThan(400);
    });

    it('should handle Unicode characters in prompts', () => {
      const themeContent = `
PROMPT='→ ❯ ✓ ✗ 🚀 $ '
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      expect(theme.prompts.left).toContain('→');
      expect(theme.prompts.left).toContain('❯');
      expect(theme.prompts.left).toContain('🚀');
    });

    it('should handle empty color maps', () => {
      const colors = new Map<string, string>();
      const result = themeManager['convertPromptToLsh']('test $ ', colors);

      expect(result).toBeTruthy();
    });

    it('should handle malformed color definitions', () => {
      const themeContent = `
BADCOLOR=notacolor
PROMPT='$ '
`;
      const theme = themeManager['parseZshTheme']('test', themeContent);

      // Should not crash
      expect(theme.prompts.left).toBeTruthy();
    });
  });

  describe('integration', () => {
    it('should complete full workflow: import → save → apply', async () => {
      // Step 1: Create and parse a theme
      const ohmyzshPath = path.join(tempDir, '.oh-my-zsh', 'themes');
      fs.mkdirSync(ohmyzshPath, { recursive: true });

      const themeContent = `
# Test Theme
RED="%{%F{red}%}"
GREEN="%{%F{green}%}"

PROMPT='\${RED}%n@%m \${GREEN}%~ $ '
RPROMPT='%T'

ZSH_THEME_GIT_PROMPT_PREFIX="("
ZSH_THEME_GIT_PROMPT_SUFFIX=")"
ZSH_THEME_GIT_PROMPT_DIRTY="*"
ZSH_THEME_GIT_PROMPT_CLEAN="✓"
`;
      const themePath = path.join(ohmyzshPath, 'testtheme.zsh-theme');
      fs.writeFileSync(themePath, themeContent, 'utf8');

      process.env.HOME = tempDir;
      const manager = new ThemeManager();

      // Step 2: Import
      const theme = await manager.importOhMyZshTheme('testtheme');

      expect(theme.name).toBe('testtheme');
      expect(theme.colors.size).toBeGreaterThan(0);
      expect(theme.prompts.left).toBeTruthy();
      expect(theme.prompts.right).toBeTruthy();
      expect(theme.gitFormats).toBeDefined();

      // Step 3: Apply
      const commands = manager.applyTheme(theme);

      expect(commands).toContain('export LSH_PROMPT');
      expect(commands).toContain('export LSH_RPROMPT');

      // Step 4: Verify saved
      const customThemesPath = path.join(tempDir, '.lsh', 'themes');
      const savedPath = path.join(customThemesPath, 'testtheme.lsh-theme');
      expect(fs.existsSync(savedPath)).toBe(true);
    });
  });
});
