/**
 * Advanced Prompt System Implementation
 * Provides ZSH-compatible prompt customization
 */

import * as os from 'os';
import * as path from 'path';

export interface PromptTheme {
  name: string;
  description: string;
  prompt: string;
  rprompt?: string;
  colors?: {
    user?: string;
    host?: string;
    path?: string;
    git?: string;
    error?: string;
    success?: string;
  };
}

export interface PromptContext {
  user: string;
  host: string;
  cwd: string;
  home: string;
  exitCode: number;
  jobCount: number;
  time: Date;
  git?: {
    branch: string;
    status: 'clean' | 'dirty' | 'ahead' | 'behind' | 'diverged';
  };
}

export class PromptSystem {
  private themes: Map<string, PromptTheme> = new Map();
  private currentTheme: string = 'default';
  private context: PromptContext;

  constructor() {
    this.context = this.createDefaultContext();
    this.setupDefaultThemes();
  }

  /**
   * Expand prompt string with ZSH-style sequences
   */
  public expandPrompt(prompt: string, context?: Partial<PromptContext>): string {
    const ctx = { ...this.context, ...context };
    let result = prompt;

    // Basic sequences
    result = result.replace(/%n/g, ctx.user);                    // Username
    result = result.replace(/%m/g, ctx.host);                     // Hostname
    result = result.replace(/%M/g, ctx.host.split('.')[0]);      // Hostname without domain
    result = result.replace(/%~/g, this.formatPath(ctx.cwd, ctx.home)); // Current directory
    result = result.replace(/%d/g, ctx.cwd);                      // Full path
    result = result.replace(/%c/g, path.basename(ctx.cwd));      // Basename of current directory
    result = result.replace(/%C/g, path.basename(ctx.cwd));      // Same as %c
    result = result.replace(/%h/g, ctx.jobCount.toString());      // Number of jobs
    result = result.replace(/%j/g, ctx.jobCount.toString());      // Number of jobs
    result = result.replace(/%L/g, ctx.exitCode.toString());     // Exit code of last command
    result = result.replace(/%?/g, ctx.exitCode.toString());    // Exit code of last command
    result = result.replace(/%#/g, ctx.user === 'root' ? '#' : '$'); // Prompt character
    result = result.replace(/%\$/g, ctx.user === 'root' ? '#' : '$'); // Prompt character
    result = result.replace(/%%/g, '%');                          // Literal %

    // Time sequences
    result = result.replace(/%T/g, this.formatTime(ctx.time, 'HH:MM')); // 24-hour time
    result = result.replace(/%t/g, this.formatTime(ctx.time, 'h:mm'));   // 12-hour time
    result = result.replace(/%D/g, this.formatTime(ctx.time, 'yyyy-MM-dd')); // Date
    result = result.replace(/%w/g, this.formatTime(ctx.time, 'EEE'));    // Day of week
    result = result.replace(/%W/g, this.formatTime(ctx.time, 'MM/dd'));  // Date

    // Git sequences
    if (ctx.git) {
      result = result.replace(/%b/g, ctx.git.branch);             // Git branch
      result = result.replace(/%B/g, ctx.git.branch);             // Git branch
      result = result.replace(/%r/g, this.formatGitStatus(ctx.git.status)); // Git status
    }

    // Conditional sequences
    result = this.expandConditionalSequences(result, ctx);

    // Color sequences
    result = this.expandColorSequences(result);

    return result;
  }

  /**
   * Set current theme
   */
  public setTheme(themeName: string): boolean {
    if (this.themes.has(themeName)) {
      this.currentTheme = themeName;
      return true;
    }
    return false;
  }

  /**
   * Get current theme
   */
  public getCurrentTheme(): string {
    return this.currentTheme;
  }

  /**
   * Get current prompt
   */
  public getCurrentPrompt(context?: Partial<PromptContext>): string {
    const theme = this.themes.get(this.currentTheme);
    if (!theme) return '$ ';

    return this.expandPrompt(theme.prompt, context);
  }

  /**
   * Get current right prompt
   */
  public getCurrentRPrompt(context?: Partial<PromptContext>): string {
    const theme = this.themes.get(this.currentTheme);
    if (!theme || !theme.rprompt) return '';

    return this.expandPrompt(theme.rprompt, context);
  }

  /**
   * Add a custom theme
   */
  public addTheme(theme: PromptTheme): void {
    this.themes.set(theme.name, theme);
  }

  /**
   * Get all available themes
   */
  public getAvailableThemes(): string[] {
    return Array.from(this.themes.keys());
  }

  /**
   * Get theme information
   */
  public getThemeInfo(themeName: string): PromptTheme | undefined {
    return this.themes.get(themeName);
  }

  /**
   * Update prompt context
   */
  public updateContext(updates: Partial<PromptContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Create default context
   */
  private createDefaultContext(): PromptContext {
    return {
      user: os.userInfo().username,
      host: os.hostname(),
      cwd: process.cwd(),
      home: os.homedir(),
      exitCode: 0,
      jobCount: 0,
      time: new Date(),
    };
  }

  /**
   * Setup default themes
   */
  private setupDefaultThemes(): void {
    // Default theme
    this.addTheme({
      name: 'default',
      description: 'Simple default prompt',
      prompt: '%n@%m:%~$ ',
    });

    // Minimal theme
    this.addTheme({
      name: 'minimal',
      description: 'Minimal prompt',
      prompt: '$ ',
    });

    // Detailed theme
    this.addTheme({
      name: 'detailed',
      description: 'Detailed prompt with time and exit code',
      prompt: '[%T] %n@%m:%~ %?$ ',
      rprompt: '%h jobs',
    });

    // Git theme
    this.addTheme({
      name: 'git',
      description: 'Git-aware prompt',
      prompt: '%n@%m:%~ %b$ ',
      rprompt: '%r',
    });

    // Powerline-style theme
    this.addTheme({
      name: 'powerline',
      description: 'Powerline-style prompt',
      prompt: '%n@%m %~ %# ',
      colors: {
        user: '32', // Green
        host: '34', // Blue
        path: '35', // Magenta
        git: '33', // Yellow
        error: '31', // Red
        success: '32', // Green
      },
    });

    // Oh My Zsh-style theme
    this.addTheme({
      name: 'ohmyzsh',
      description: 'Oh My Zsh-style prompt',
      prompt: '%n@%m %~ %# ',
      rprompt: '%T',
    });

    // Fish-style theme
    this.addTheme({
      name: 'fish',
      description: 'Fish shell-style prompt',
      prompt: '%n@%m %~ > ',
    });

    // Bash-style theme
    this.addTheme({
      name: 'bash',
      description: 'Bash-style prompt',
      prompt: '\\u@\\h:\\w\\$ ',
    });
  }

  /**
   * Format path with tilde expansion
   */
  private formatPath(cwd: string, home: string): string {
    if (cwd.startsWith(home)) {
      return '~' + cwd.substring(home.length);
    }
    return cwd;
  }

  /**
   * Format time according to pattern
   */
  private formatTime(time: Date, pattern: string): string {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();
    const day = time.getDate();
    const month = time.getMonth() + 1;
    const year = time.getFullYear();
    const dayOfWeek = time.getDay();

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return pattern
      .replace(/HH/g, hours.toString().padStart(2, '0'))
      .replace(/H/g, hours.toString())
      .replace(/h/g, (hours % 12 || 12).toString())
      .replace(/mm/g, minutes.toString().padStart(2, '0'))
      .replace(/m/g, minutes.toString())
      .replace(/ss/g, seconds.toString().padStart(2, '0'))
      .replace(/s/g, seconds.toString())
      .replace(/dd/g, day.toString().padStart(2, '0'))
      .replace(/d/g, day.toString())
      .replace(/MM/g, month.toString().padStart(2, '0'))
      .replace(/M/g, month.toString())
      .replace(/yyyy/g, year.toString())
      .replace(/yy/g, year.toString().slice(-2))
      .replace(/EEE/g, dayNames[dayOfWeek]);
  }

  /**
   * Format git status
   */
  private formatGitStatus(status: string): string {
    switch (status) {
      case 'clean': return '✓';
      case 'dirty': return '●';
      case 'ahead': return '↑';
      case 'behind': return '↓';
      case 'diverged': return '↕';
      default: return '';
    }
  }

  /**
   * Expand conditional sequences
   */
  private expandConditionalSequences(prompt: string, context: PromptContext): string {
    // Handle %(condition.true-text.false-text)
    const conditionalRegex = /%\(([^)]+)\)/g;
    
    return prompt.replace(conditionalRegex, (match, condition) => {
      const parts = condition.split('.');
      if (parts.length < 2) return match;

      const [cond, trueText, falseText = ''] = parts;
      const isTrue = this.evaluateCondition(cond, context);
      
      return isTrue ? trueText : falseText;
    });
  }

  /**
   * Evaluate condition for conditional sequences
   */
  private evaluateCondition(condition: string, context: PromptContext): boolean {
    switch (condition) {
      case '?': return context.exitCode === 0;
      case '!': return context.exitCode !== 0;
      case 'j': return context.jobCount > 0;
      case 'n': return context.user !== 'root';
      case 'root': return context.user === 'root';
      case 'git': return context.git !== undefined;
      default: return false;
    }
  }

  /**
   * Expand color sequences
   */
  private expandColorSequences(prompt: string): string {
    // Handle %F{color} and %f
    const colorRegex = /%F\{([^}]+)\}/g;
    prompt = prompt.replace(colorRegex, (match, color) => {
      return this.getColorCode(color);
    });
    prompt = prompt.replace(/%f/g, '\x1b[0m'); // Reset color

    // Handle %K{color} and %k (background colors)
    const bgColorRegex = /%K\{([^}]+)\}/g;
    prompt = prompt.replace(bgColorRegex, (match, color) => {
      return this.getBackgroundColorCode(color);
    });
    prompt = prompt.replace(/%k/g, '\x1b[49m'); // Reset background

    // Handle %B and %b (bold)
    prompt = prompt.replace(/%B/g, '\x1b[1m');
    prompt = prompt.replace(/%b/g, '\x1b[22m');

    // Handle %U and %u (underline)
    prompt = prompt.replace(/%U/g, '\x1b[4m');
    prompt = prompt.replace(/%u/g, '\x1b[24m');

    return prompt;
  }

  /**
   * Get color code for color name
   */
  private getColorCode(color: string): string {
    const colors: Record<string, string> = {
      black: '\x1b[30m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      default: '\x1b[39m',
    };

    return colors[color.toLowerCase()] || '\x1b[39m';
  }

  /**
   * Get background color code for color name
   */
  private getBackgroundColorCode(color: string): string {
    const colors: Record<string, string> = {
      black: '\x1b[40m',
      red: '\x1b[41m',
      green: '\x1b[42m',
      yellow: '\x1b[43m',
      blue: '\x1b[44m',
      magenta: '\x1b[45m',
      cyan: '\x1b[46m',
      white: '\x1b[47m',
      default: '\x1b[49m',
    };

    return colors[color.toLowerCase()] || '\x1b[49m';
  }
}

export default PromptSystem;