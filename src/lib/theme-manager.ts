/**
 * Theme Manager
 * Import and apply ZSH themes (Oh-My-Zsh, Powerlevel10k, custom)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';

export interface ThemeColors {
  reset: string;
  bold: string;
  dim: string;
  // Standard colors
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  // Extended 256 colors
  orange?: string;
  purple?: string;
  pink?: string;
  turquoise?: string;
  limegreen?: string;
}

export interface ThemePrompt {
  left: string;      // Main prompt (PROMPT or PS1)
  right?: string;    // Right prompt (RPROMPT or RPS1)
  continuation?: string; // PS2
  select?: string;   // PS3
}

export interface ParsedTheme {
  name: string;
  colors: Map<string, string>;
  prompts: ThemePrompt;
  gitFormats?: {
    branch?: string;
    unstaged?: string;
    staged?: string;
    action?: string;
  };
  variables: Map<string, string>;
  hooks: string[];
  dependencies: string[]; // Required functions/plugins
}

export class ThemeManager {
  private themesPath: string;
  private customThemesPath: string;
  private currentTheme: ParsedTheme | null = null;

  constructor() {
    this.themesPath = path.join(os.homedir(), '.oh-my-zsh', 'themes');
    this.customThemesPath = path.join(os.homedir(), '.lsh', 'themes');

    // Ensure custom themes directory exists
    if (!fs.existsSync(this.customThemesPath)) {
      fs.mkdirSync(this.customThemesPath, { recursive: true });
    }
  }

  /**
   * List available themes
   */
  public listThemes(): { ohmyzsh: string[]; custom: string[]; builtin: string[] } {
    const ohmyzsh: string[] = [];
    const custom: string[] = [];

    // Oh-My-Zsh themes
    if (fs.existsSync(this.themesPath)) {
      ohmyzsh.push(...fs.readdirSync(this.themesPath)
        .filter(f => f.endsWith('.zsh-theme'))
        .map(f => f.replace('.zsh-theme', '')));
    }

    // Custom themes
    if (fs.existsSync(this.customThemesPath)) {
      custom.push(...fs.readdirSync(this.customThemesPath)
        .filter(f => f.endsWith('.lsh-theme'))
        .map(f => f.replace('.lsh-theme', '')));
    }

    // Built-in LSH themes
    const builtin = [
      'default',
      'minimal',
      'powerline',
      'simple',
      'git',
      'robbyrussell', // Popular Oh-My-Zsh theme
      'agnoster',
    ];

    return { ohmyzsh, custom, builtin };
  }

  /**
   * Import Oh-My-Zsh theme
   */
  public async importOhMyZshTheme(themeName: string): Promise<ParsedTheme> {
    const themePath = path.join(this.themesPath, `${themeName}.zsh-theme`);

    if (!fs.existsSync(themePath)) {
      throw new Error(`Theme not found: ${themeName}`);
    }

    const themeContent = fs.readFileSync(themePath, 'utf8');
    const parsed = this.parseZshTheme(themeName, themeContent);

    // Convert to LSH format and save
    this.saveAsLshTheme(parsed);

    return parsed;
  }

  /**
   * Parse ZSH theme file
   */
  private parseZshTheme(name: string, content: string): ParsedTheme {
    const theme: ParsedTheme = {
      name,
      colors: new Map(),
      prompts: { left: '' },
      variables: new Map(),
      hooks: [],
      dependencies: [],
    };

    const lines = content.split('\n');

    for (const line of lines) {
      let trimmed = line.trim();

      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed === '') {
        continue;
      }

      // Strip inline comments (but preserve # inside quotes)
      const inlineCommentMatch = trimmed.match(/^([^#]*?["'][^"']*["'])\s*#/);
      if (inlineCommentMatch) {
        trimmed = inlineCommentMatch[1].trim();
      } else if (trimmed.includes('#')) {
        // Simple inline comment without quotes
        const parts = trimmed.split('#');
        if (parts[0].includes('=')) {
          trimmed = parts[0].trim();
        }
      }

      // Parse color definitions
      const colorMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=["']?%\{.*?%F\{(\d+|[a-z]+)\}.*?\}["']?/);
      if (colorMatch) {
        theme.colors.set(colorMatch[1], colorMatch[2]);
        continue;
      }

      // Parse PROMPT
      const promptMatch = trimmed.match(/^PROMPT=["'](.+)["']$/);
      if (promptMatch) {
        theme.prompts.left = promptMatch[1];
        continue;
      }

      // Parse RPROMPT
      const rpromptMatch = trimmed.match(/^RPROMPT=["'](.+)["']$/);
      if (rpromptMatch) {
        theme.prompts.right = rpromptMatch[1];
        continue;
      }

      // Parse PS2 (continuation)
      const ps2Match = trimmed.match(/^PS2=["'](.+)["']$/);
      if (ps2Match) {
        theme.prompts.continuation = ps2Match[1];
        continue;
      }

      // Parse PS3 (select)
      const ps3Match = trimmed.match(/^PS3=["'](.+)["']$/);
      if (ps3Match) {
        theme.prompts.select = ps3Match[1];
        continue;
      }

      // Parse git formats (custom formats)
      if (trimmed.includes('FMT_BRANCH')) {
        const fmtMatch = trimmed.match(/FMT_BRANCH=["'](.+)["']$/);
        if (fmtMatch) {
          if (!theme.gitFormats) theme.gitFormats = {};
          theme.gitFormats.branch = fmtMatch[1];
        }
      }

      if (trimmed.includes('FMT_UNSTAGED')) {
        const fmtMatch = trimmed.match(/FMT_UNSTAGED=["'](.+)["']$/);
        if (fmtMatch) {
          if (!theme.gitFormats) theme.gitFormats = {};
          theme.gitFormats.unstaged = fmtMatch[1];
        }
      }

      if (trimmed.includes('FMT_STAGED')) {
        const fmtMatch = trimmed.match(/FMT_STAGED=["'](.+)["']$/);
        if (fmtMatch) {
          if (!theme.gitFormats) theme.gitFormats = {};
          theme.gitFormats.staged = fmtMatch[1];
        }
      }

      // Parse Oh-My-Zsh git prompt variables
      const gitPromptVars: { [key: string]: string } = {
        'ZSH_THEME_GIT_PROMPT_PREFIX': 'prefix',
        'ZSH_THEME_GIT_PROMPT_SUFFIX': 'suffix',
        'ZSH_THEME_GIT_PROMPT_DIRTY': 'dirty',
        'ZSH_THEME_GIT_PROMPT_CLEAN': 'clean',
        'ZSH_THEME_GIT_PROMPT_UNTRACKED': 'untracked',
      };

      for (const [varName, formatKey] of Object.entries(gitPromptVars)) {
        if (trimmed.startsWith(varName)) {
          const match = trimmed.match(new RegExp(`${varName}=["'](.+?)["']$`));
          if (match) {
            if (!theme.gitFormats) theme.gitFormats = {};
            // Construct branch format from prefix/suffix if we have them
            if (formatKey === 'prefix' || formatKey === 'suffix') {
              const prefix = formatKey === 'prefix' ? match[1] : (theme.gitFormats as any).prefix || '';
              const suffix = formatKey === 'suffix' ? match[1] : (theme.gitFormats as any).suffix || '';
              if (prefix || suffix) {
                theme.gitFormats.branch = `${prefix}%b${suffix}`;
              }
              // Store the raw values too
              (theme.gitFormats as any)[formatKey] = match[1];
            } else {
              (theme.gitFormats as any)[formatKey] = match[1];
            }
          }
        }
      }

      // Parse variables (skip prompts, formats, and git theme variables)
      const varMatch = trimmed.match(/^([A-Z_][A-Z0-9_]*)=["']?(.+?)["']?$/);
      if (varMatch &&
          !trimmed.includes('PROMPT') &&
          !trimmed.includes('FMT_') &&
          !trimmed.startsWith('ZSH_THEME_GIT_PROMPT_') &&
          !trimmed.startsWith('PS2') &&
          !trimmed.startsWith('PS3')) {
        theme.variables.set(varMatch[1], varMatch[2]);
      }

      // Parse hooks
      if (trimmed.includes('add-zsh-hook')) {
        const hookMatch = trimmed.match(/add-zsh-hook\s+(\w+)\s+(\w+)/);
        if (hookMatch) {
          theme.hooks.push(`${hookMatch[1]}:${hookMatch[2]}`);
        }
      }

      // Detect dependencies
      if (trimmed.includes('vcs_info')) {
        if (!theme.dependencies.includes('vcs_info')) {
          theme.dependencies.push('vcs_info');
        }
      }
      if (trimmed.includes('git_branch') || trimmed.includes('git_prompt_info') || trimmed.includes('$(git ')) {
        if (!theme.dependencies.includes('git')) {
          theme.dependencies.push('git');
        }
      }
      if (trimmed.includes('virtualenv_prompt_info')) {
        if (!theme.dependencies.includes('virtualenv')) {
          theme.dependencies.push('virtualenv');
        }
      }
      if (trimmed.includes('ruby_prompt_info')) {
        if (!theme.dependencies.includes('ruby')) {
          theme.dependencies.push('ruby');
        }
      }
    }

    return theme;
  }

  /**
   * Convert ZSH prompt format to LSH format
   */
  private convertPromptToLsh(zshPrompt: string, colors: Map<string, string>): string {
    let lshPrompt = zshPrompt;

    // Convert color variables
    for (const [name, color] of colors.entries()) {
      // Map ZSH color codes to chalk colors
      const chalkColor = this.mapColorToChalk(color);
      lshPrompt = lshPrompt.replace(new RegExp(`\\$\\{${name}\\}`, 'g'), chalkColor);
    }

    // Convert ZSH prompt escapes to LSH equivalents
    const conversions: [RegExp, string][] = [
      [/%n/g, process.env.USER || 'user'],           // username
      [/%m/g, os.hostname().split('.')[0]],          // hostname (short)
      [/%M/g, os.hostname()],                        // hostname (full)
      [/%~|%d/g, '$(pwd | sed "s|^$HOME|~|")'],     // current directory
      [/%\//g, '$(pwd)'],                            // current directory (full)
      [/%c/g, '$(basename "$(pwd)")'],               // current directory (basename)
      [/%D/g, '$(date +"%m/%d/%y")'],                // date
      [/%T/g, '$(date +"%H:%M")'],                   // time (24h)
      [/%t/g, '$(date +"%I:%M %p")'],                // time (12h)
      [/%#/g, '\\$'],                                // # for root, $ for user
      [/%\{.*?reset_color.*?\}/g, chalk.reset('')],  // reset color
      [/%\{.*?\}/g, ''],                             // remove other ZSH escapes
    ];

    for (const [pattern, replacement] of conversions) {
      lshPrompt = lshPrompt.replace(pattern, replacement);
    }

    // Handle git info
    if (lshPrompt.includes('$vcs_info_msg_0_')) {
      lshPrompt = lshPrompt.replace(/\$vcs_info_msg_0_/g, '$(git_prompt_info)');
    }

    // Handle virtualenv
    if (lshPrompt.includes('$(virtualenv_prompt_info)')) {
      lshPrompt = lshPrompt.replace(/\$\(virtualenv_prompt_info\)/g, '$([ -n "$VIRTUAL_ENV" ] && echo " ($(basename $VIRTUAL_ENV))")');
    }

    return lshPrompt;
  }

  /**
   * Map ZSH color code to chalk color
   */
  private mapColorToChalk(zshColor: string): string {
    // 256 color codes
    const colorMap: { [key: string]: string } = {
      '81': 'cyan',
      '166': 'yellow',
      '135': 'magenta',
      '161': 'red',
      '118': 'green',
      '208': 'yellow',
      '39': 'blue',
      '214': 'yellow',
      // Standard colors
      'black': 'black',
      'red': 'red',
      'green': 'green',
      'yellow': 'yellow',
      'blue': 'blue',
      'magenta': 'magenta',
      'cyan': 'cyan',
      'white': 'white',
    };

    const mapped = colorMap[zshColor] || 'white';
    return `\\[\\033[${this.getAnsiCode(mapped)}m\\]`;
  }

  /**
   * Get ANSI code for color name
   */
  private getAnsiCode(color: string): string {
    const codes: { [key: string]: string } = {
      'black': '30',
      'red': '31',
      'green': '32',
      'yellow': '33',
      'blue': '34',
      'magenta': '35',
      'cyan': '36',
      'white': '37',
      'reset': '0',
      'bold': '1',
      'dim': '2',
      'italic': '3',
      'underline': '4',
    };
    return codes[color] || '37';
  }

  /**
   * Save theme in LSH format
   */
  private saveAsLshTheme(theme: ParsedTheme): void {
    const lshThemePath = path.join(this.customThemesPath, `${theme.name}.lsh-theme`);

    const lshThemeContent = {
      name: theme.name,
      prompts: {
        left: this.convertPromptToLsh(theme.prompts.left, theme.colors),
        right: theme.prompts.right ? this.convertPromptToLsh(theme.prompts.right, theme.colors) : undefined,
      },
      colors: Object.fromEntries(theme.colors),
      gitFormats: theme.gitFormats,
      dependencies: theme.dependencies,
    };

    fs.writeFileSync(lshThemePath, JSON.stringify(lshThemeContent, null, 2), 'utf8');
  }

  /**
   * Apply theme
   */
  public applyTheme(theme: ParsedTheme): string {
    this.currentTheme = theme;

    // Generate prompt setting commands
    const commands: string[] = [];

    // Set main prompt
    if (theme.prompts.left) {
      const lshPrompt = this.convertPromptToLsh(theme.prompts.left, theme.colors);
      commands.push(`export LSH_PROMPT='${lshPrompt}'`);
    }

    // Set right prompt
    if (theme.prompts.right) {
      const lshRPrompt = this.convertPromptToLsh(theme.prompts.right, theme.colors);
      commands.push(`export LSH_RPROMPT='${lshRPrompt}'`);
    }

    return commands.join('\n');
  }

  /**
   * Get built-in theme
   */
  public getBuiltinTheme(name: string): ParsedTheme {
    const themes: { [key: string]: ParsedTheme } = {
      'default': {
        name: 'default',
        colors: new Map([['blue', '34'], ['green', '32'], ['reset', '0']]),
        prompts: {
          left: chalk.blue('%n@%m') + ':' + chalk.green('%~') + '$ ',
        },
        variables: new Map(),
        hooks: [],
        dependencies: [],
      },
      'minimal': {
        name: 'minimal',
        colors: new Map([['cyan', '36'], ['reset', '0']]),
        prompts: {
          left: chalk.cyan('%~') + ' ❯ ',
        },
        variables: new Map(),
        hooks: [],
        dependencies: [],
      },
      'powerline': {
        name: 'powerline',
        colors: new Map([
          ['blue', '34'],
          ['white', '37'],
          ['green', '32'],
          ['yellow', '33'],
        ]),
        prompts: {
          left: chalk.bgBlue.white(' %n ') + '' + chalk.bgGreen.black(' %~ ') + '' + ' ',
        },
        variables: new Map(),
        hooks: [],
        dependencies: ['git'],
      },
      'robbyrussell': {
        name: 'robbyrussell',
        colors: new Map([['cyan', '36'], ['red', '31'], ['green', '32']]),
        prompts: {
          left: chalk.cyan('➜ ') + chalk.cyan('%~') + ' $(git_prompt_info)',
        },
        gitFormats: {
          branch: chalk.red(' git:') + chalk.green('(%b)'),
        },
        variables: new Map(),
        hooks: [],
        dependencies: ['git'],
      },
      'simple': {
        name: 'simple',
        colors: new Map([['reset', '0']]),
        prompts: {
          left: '%~ $ ',
        },
        variables: new Map(),
        hooks: [],
        dependencies: [],
      },
    };

    if (!themes[name]) {
      throw new Error(`Theme not found: ${name}`);
    }

    return themes[name];
  }

  /**
   * Preview theme without applying
   */
  public previewTheme(theme: ParsedTheme): void {
    console.log(chalk.bold(`\n📦 Theme: ${theme.name}\n`));

    // Show prompt
    console.log(chalk.dim('Prompt:'));
    const examplePrompt = this.convertPromptToLsh(theme.prompts.left, theme.colors)
      .replace('$(pwd | sed "s|^$HOME|~|")', '~/projects/my-app')
      .replace('$(git_prompt_info)', ' git:(main)');

    console.log('  ' + examplePrompt);

    if (theme.prompts.right) {
      console.log(chalk.dim('\nRight Prompt:'));
      console.log('  ' + this.convertPromptToLsh(theme.prompts.right, theme.colors));
    }

    // Show colors
    if (theme.colors.size > 0) {
      console.log(chalk.dim('\nColors:'));
      for (const [name, code] of theme.colors.entries()) {
        const color = this.mapColorToChalk(code);
        console.log(`  ${name}: ${color}${name}${chalk.reset('')}`);
      }
    }

    // Show dependencies
    if (theme.dependencies.length > 0) {
      console.log(chalk.dim('\nDependencies:'));
      theme.dependencies.forEach(dep => console.log(`  - ${dep}`));
    }

    console.log('');
  }
}
