/**
 * ZSH-Style Options System Implementation
 * Provides setopt/unsetopt functionality and ZSH-specific options
 */

export interface ZshOptions {
  // History options
  SHARE_HISTORY: boolean;
  HIST_IGNORE_DUPS: boolean;
  HIST_IGNORE_SPACE: boolean;
  HIST_EXPIRE_DUPS_FIRST: boolean;
  HIST_SAVE_NO_DUPS: boolean;
  HIST_FIND_NO_DUPS: boolean;
  HIST_REDUCE_BLANKS: boolean;
  HIST_VERIFY: boolean;
  HIST_BEEP: boolean;
  HIST_FCNTL_LOCK: boolean;
  HIST_LEX_WORDS: boolean;
  HIST_NO_FUNCTIONS: boolean;
  HIST_NO_STORE: boolean;

  // Completion options
  AUTO_LIST: boolean;
  AUTO_MENU: boolean;
  AUTO_PARAM_SLASH: boolean;
  AUTO_REMOVE_SLASH: boolean;
  COMPLETE_IN_WORD: boolean;
  COMPLETE_ALIASES: boolean;
  GLOB_COMPLETE: boolean;
  LIST_AMBIGUOUS: boolean;
  LIST_PACKED: boolean;
  LIST_ROWS_FIRST: boolean;
  LIST_TYPES: boolean;
  MENU_COMPLETE: boolean;
  REC_EXACT: boolean;

  // Globbing options
  EXTENDED_GLOB: boolean;
  GLOB_DOTS: boolean;
  GLOB_STAR_SHORT: boolean;
  GLOB_SUBST: boolean;
  NOMATCH: boolean;
  NULL_GLOB: boolean;

  // Directory options
  AUTO_CD: boolean;
  AUTO_PUSHD: boolean;
  CDABLE_VARS: boolean;
  CD_SILENT: boolean;
  PUSHD_IGNORE_DUPS: boolean;
  PUSHD_MINUS: boolean;
  PUSHD_SILENT: boolean;
  PUSHD_TO_HOME: boolean;

  // Input/Output options
  CORRECT: boolean;
  CORRECT_ALL: boolean;
  DVORAK: boolean;
  FLOW_CONTROL: boolean;
  IGNORE_EOF: boolean;
  INTERACTIVE_COMMENTS: boolean;
  PRINT_EIGHT_BIT: boolean;
  PRINT_EXIT_VALUE: boolean;
  RM_STAR_SILENT: boolean;
  RM_STAR_WAIT: boolean;
  SHORT_LOOPS: boolean;
  SUN_KEYBOARD_HACK: boolean;

  // Job control options
  AUTO_RESUME: boolean;
  BG_NICE: boolean;
  CHECK_JOBS: boolean;
  HUP: boolean;
  LONG_LIST_JOBS: boolean;
  MONITOR: boolean;
  NOTIFY: boolean;

  // Prompt options
  PROMPT_BANG: boolean;
  PROMPT_CR: boolean;
  PROMPT_PERCENT: boolean;
  PROMPT_SP: boolean;
  PROMPT_SUBST: boolean;
  TRANSIENT_RPROMPT: boolean;

  // Zle (Zsh Line Editor) options
  BEEP: boolean;
  COMBINING_CHARS: boolean;
  EMACS: boolean;
  OVERSTRIKE: boolean;
  SINGLE_LINE_ZLE: boolean;
  VI: boolean;
  ZLE: boolean;

  // Other options
  ALWAYS_LAST_PROMPT: boolean;
  APPEND_HISTORY: boolean;
  BANG_HIST: boolean;
  CLOBBER: boolean;
  EQUALS: boolean;
  FUNCTION_ARGZERO: boolean;
  GLOBAL_EXPORT: boolean;
  GLOBAL_RCS: boolean;
  GLOBAL_SUBST: boolean;
  HIST_APPEND: boolean;
  HIST_EXPAND: boolean;
  INC_APPEND_HISTORY: boolean;
  KSH_ARRAYS: boolean;
  KSH_AUTOLOAD: boolean;
  KSH_GLOB: boolean;
  KSH_OPTION_PRINT: boolean;
  KSH_TYPESET: boolean;
  KSH_ZERO_SUBSCRIPT: boolean;
  MAGIC_EQUAL_SUBST: boolean;
  MARK_DIRS: boolean;
  MULTIOS: boolean;
  NO_BEEP: boolean;
  NO_CLOBBER: boolean;
  NO_FLOW_CONTROL: boolean;
  NO_GLOBAL_EXPORT: boolean;
  NO_GLOBAL_RCS: boolean;
  NO_GLOBAL_SUBST: boolean;
  NO_HIST_BEEP: boolean;
  NO_LIST_AMBIGUOUS: boolean;
  NO_LIST_BEEP: boolean;
  NO_LOGIN: boolean;
  NO_MATCH: boolean;
  NO_NOMATCH: boolean;
  NO_PROMPT_BANG: boolean;
  NO_PROMPT_CR: boolean;
  NO_RM_STAR_SILENT: boolean;
  NO_RM_STAR_WAIT: boolean;
  NO_SHORT_LOOPS: boolean;
  NO_UNSET: boolean;
  NO_WARN_CREATE_GLOBAL: boolean;
  NUMERIC_GLOB_SORT: boolean;
  PIPE_FAIL: boolean;
  POSIX_ALIASES: boolean;
  POSIX_BUILTINS: boolean;
  POSIX_CD: boolean;
  POSIX_IDENTIFIERS: boolean;
  POSIX_JOBS: boolean;
  POSIX_STRINGS: boolean;
  POSIX_TRAPS: boolean;
  PRIVILEGED: boolean;
  RC_EXPAND_PARAM: boolean;
  RC_QUOTES: boolean;
  SHORT_REPEAT: boolean;
  UNSET: boolean;
  WARN_CREATE_GLOBAL: boolean;
  WARN_NESTED_VAR: boolean;
  XTRACE: boolean;
}

export class ZshOptionsManager {
  private options: ZshOptions;
  private optionAliases: Map<string, string> = new Map();

  constructor() {
    this.options = this.getDefaultOptions();
    this.setupOptionAliases();
  }

  /**
   * Set an option with setopt
   */
  public setopt(optionName: string): { success: boolean; message: string } {
    const normalizedName = this.normalizeOptionName(optionName);
    
    if (!(normalizedName in this.options)) {
      return { success: false, message: `setopt: no such option: ${optionName}` };
    }

    (this.options as any)[normalizedName] = true;
    return { success: true, message: '' };
  }

  /**
   * Unset an option with unsetopt
   */
  public unsetopt(optionName: string): { success: boolean; message: string } {
    const normalizedName = this.normalizeOptionName(optionName);
    
    if (!(normalizedName in this.options)) {
      return { success: false, message: `unsetopt: no such option: ${optionName}` };
    }

    (this.options as any)[normalizedName] = false;
    return { success: true, message: '' };
  }

  /**
   * Get option value
   */
  public getOption(optionName: string): boolean | undefined {
    const normalizedName = this.normalizeOptionName(optionName);
    return (this.options as any)[normalizedName];
  }

  /**
   * Check if option is set
   */
  public isOptionSet(optionName: string): boolean {
    return this.getOption(optionName) === true;
  }

  /**
   * Get all options
   */
  public getAllOptions(): ZshOptions {
    return { ...this.options };
  }

  /**
   * List all options with their values
   */
  public listOptions(): string {
    const lines: string[] = [];
    
    for (const [key, value] of Object.entries(this.options)) {
      const status = value ? 'on' : 'off';
      lines.push(`${key}: ${status}`);
    }
    
    return lines.sort().join('\n');
  }

  /**
   * Parse setopt/unsetopt command arguments
   */
  public parseSetoptCommand(args: string[]): { success: boolean; message: string } {
    if (args.length === 0) {
      return { success: false, message: 'setopt: missing option name' };
    }

    for (const arg of args) {
      if (arg.startsWith('-')) {
        // Handle multiple options like setopt -o option1,option2
        const options = arg.substring(2).split(',');
        for (const option of options) {
          const result = this.setopt(option);
          if (!result.success) {
            return result;
          }
        }
      } else {
        const result = this.setopt(arg);
        if (!result.success) {
          return result;
        }
      }
    }

    return { success: true, message: '' };
  }

  /**
   * Parse unsetopt command arguments
   */
  public parseUnsetoptCommand(args: string[]): { success: boolean; message: string } {
    if (args.length === 0) {
      return { success: false, message: 'unsetopt: missing option name' };
    }

    for (const arg of args) {
      if (arg.startsWith('-')) {
        // Handle multiple options like unsetopt -o option1,option2
        const options = arg.substring(2).split(',');
        for (const option of options) {
          const result = this.unsetopt(option);
          if (!result.success) {
            return result;
          }
        }
      } else {
        const result = this.unsetopt(arg);
        if (!result.success) {
          return result;
        }
      }
    }

    return { success: true, message: '' };
  }

  /**
   * Get default options
   */
  private getDefaultOptions(): ZshOptions {
    return {
      // History options (defaults)
      SHARE_HISTORY: false,
      HIST_IGNORE_DUPS: false,
      HIST_IGNORE_SPACE: false,
      HIST_EXPIRE_DUPS_FIRST: false,
      HIST_SAVE_NO_DUPS: false,
      HIST_FIND_NO_DUPS: false,
      HIST_REDUCE_BLANKS: false,
      HIST_VERIFY: false,
      HIST_BEEP: true,
      HIST_FCNTL_LOCK: false,
      HIST_LEX_WORDS: false,
      HIST_NO_FUNCTIONS: false,
      HIST_NO_STORE: false,

      // Completion options (defaults)
      AUTO_LIST: false,
      AUTO_MENU: false,
      AUTO_PARAM_SLASH: true,
      AUTO_REMOVE_SLASH: true,
      COMPLETE_IN_WORD: false,
      COMPLETE_ALIASES: false,
      GLOB_COMPLETE: false,
      LIST_AMBIGUOUS: true,
      LIST_PACKED: false,
      LIST_ROWS_FIRST: false,
      LIST_TYPES: false,
      MENU_COMPLETE: false,
      REC_EXACT: false,

      // Globbing options (defaults)
      EXTENDED_GLOB: false,
      GLOB_DOTS: false,
      GLOB_STAR_SHORT: false,
      GLOB_SUBST: false,
      NOMATCH: true,
      NULL_GLOB: false,

      // Directory options (defaults)
      AUTO_CD: false,
      AUTO_PUSHD: false,
      CDABLE_VARS: false,
      CD_SILENT: false,
      PUSHD_IGNORE_DUPS: false,
      PUSHD_MINUS: false,
      PUSHD_SILENT: false,
      PUSHD_TO_HOME: false,

      // Input/Output options (defaults)
      CORRECT: false,
      CORRECT_ALL: false,
      DVORAK: false,
      FLOW_CONTROL: true,
      IGNORE_EOF: false,
      INTERACTIVE_COMMENTS: true,
      PRINT_EIGHT_BIT: false,
      PRINT_EXIT_VALUE: false,
      RM_STAR_SILENT: false,
      RM_STAR_WAIT: false,
      SHORT_LOOPS: false,
      SUN_KEYBOARD_HACK: false,

      // Job control options (defaults)
      AUTO_RESUME: false,
      BG_NICE: false,
      CHECK_JOBS: true,
      HUP: true,
      LONG_LIST_JOBS: false,
      MONITOR: true,
      NOTIFY: true,

      // Prompt options (defaults)
      PROMPT_BANG: true,
      PROMPT_CR: true,
      PROMPT_PERCENT: true,
      PROMPT_SP: false,
      PROMPT_SUBST: false,
      TRANSIENT_RPROMPT: false,

      // Zle options (defaults)
      BEEP: true,
      COMBINING_CHARS: false,
      EMACS: true,
      OVERSTRIKE: false,
      SINGLE_LINE_ZLE: false,
      VI: false,
      ZLE: true,

      // Other options (defaults)
      ALWAYS_LAST_PROMPT: false,
      APPEND_HISTORY: true,
      BANG_HIST: true,
      CLOBBER: true,
      EQUALS: false,
      FUNCTION_ARGZERO: false,
      GLOBAL_EXPORT: false,
      GLOBAL_RCS: true,
      GLOBAL_SUBST: false,
      HIST_APPEND: true,
      HIST_EXPAND: true,
      INC_APPEND_HISTORY: false,
      KSH_ARRAYS: false,
      KSH_AUTOLOAD: false,
      KSH_GLOB: false,
      KSH_OPTION_PRINT: false,
      KSH_TYPESET: false,
      KSH_ZERO_SUBSCRIPT: false,
      MAGIC_EQUAL_SUBST: false,
      MARK_DIRS: false,
      MULTIOS: true,
      NO_BEEP: false,
      NO_CLOBBER: false,
      NO_FLOW_CONTROL: false,
      NO_GLOBAL_EXPORT: false,
      NO_GLOBAL_RCS: false,
      NO_GLOBAL_SUBST: false,
      NO_HIST_BEEP: false,
      NO_LIST_AMBIGUOUS: false,
      NO_LIST_BEEP: false,
      NO_LOGIN: false,
      NO_MATCH: false,
      NO_NOMATCH: false,
      NO_PROMPT_BANG: false,
      NO_PROMPT_CR: false,
      NO_RM_STAR_SILENT: false,
      NO_RM_STAR_WAIT: false,
      NO_SHORT_LOOPS: false,
      NO_UNSET: false,
      NO_WARN_CREATE_GLOBAL: false,
      NUMERIC_GLOB_SORT: false,
      PIPE_FAIL: false,
      POSIX_ALIASES: false,
      POSIX_BUILTINS: false,
      POSIX_CD: false,
      POSIX_IDENTIFIERS: false,
      POSIX_JOBS: false,
      POSIX_STRINGS: false,
      POSIX_TRAPS: false,
      PRIVILEGED: false,
      RC_EXPAND_PARAM: false,
      RC_QUOTES: false,
      SHORT_REPEAT: false,
      UNSET: false,
      WARN_CREATE_GLOBAL: false,
      WARN_NESTED_VAR: false,
      XTRACE: false,
    };
  }

  /**
   * Setup option aliases
   */
  private setupOptionAliases(): void {
    // Common aliases
    this.optionAliases.set('autocd', 'AUTO_CD');
    this.optionAliases.set('correct', 'CORRECT');
    this.optionAliases.set('extendedglob', 'EXTENDED_GLOB');
    this.optionAliases.set('sharehistory', 'SHARE_HISTORY');
    this.optionAliases.set('histignoredups', 'HIST_IGNORE_DUPS');
    this.optionAliases.set('histignorespace', 'HIST_IGNORE_SPACE');
    this.optionAliases.set('automenu', 'AUTO_MENU');
    this.optionAliases.set('autolist', 'AUTO_LIST');
    this.optionAliases.set('menucomplete', 'MENU_COMPLETE');
    this.optionAliases.set('globdots', 'GLOB_DOTS');
    this.optionAliases.set('nomatch', 'NOMATCH');
    this.optionAliases.set('nullglob', 'NULL_GLOB');
    this.optionAliases.set('autopushd', 'AUTO_PUSHD');
    this.optionAliases.set('pushdignoredups', 'PUSHD_IGNORE_DUPS');
    this.optionAliases.set('pushdminus', 'PUSHD_MINUS');
    this.optionAliases.set('pushdsilent', 'PUSHD_SILENT');
    this.optionAliases.set('pushdtohome', 'PUSHD_TO_HOME');
    this.optionAliases.set('cdsilent', 'CD_SILENT');
    this.optionAliases.set('cdablevars', 'CDABLE_VARS');
    this.optionAliases.set('correctall', 'CORRECT_ALL');
    this.optionAliases.set('ignoreeof', 'IGNORE_EOF');
    this.optionAliases.set('interactivecomments', 'INTERACTIVE_COMMENTS');
    this.optionAliases.set('printeightbit', 'PRINT_EIGHT_BIT');
    this.optionAliases.set('printexitvalue', 'PRINT_EXIT_VALUE');
    this.optionAliases.set('rmstarsilent', 'RM_STAR_SILENT');
    this.optionAliases.set('rmstarwait', 'RM_STAR_WAIT');
    this.optionAliases.set('shortloops', 'SHORT_LOOPS');
    this.optionAliases.set('autoresume', 'AUTO_RESUME');
    this.optionAliases.set('bgnice', 'BG_NICE');
    this.optionAliases.set('checkjobs', 'CHECK_JOBS');
    this.optionAliases.set('hup', 'HUP');
    this.optionAliases.set('longlistjobs', 'LONG_LIST_JOBS');
    this.optionAliases.set('monitor', 'MONITOR');
    this.optionAliases.set('notify', 'NOTIFY');
    this.optionAliases.set('promptbang', 'PROMPT_BANG');
    this.optionAliases.set('promptcr', 'PROMPT_CR');
    this.optionAliases.set('promptpercent', 'PROMPT_PERCENT');
    this.optionAliases.set('promptsp', 'PROMPT_SP');
    this.optionAliases.set('promptsubst', 'PROMPT_SUBST');
    this.optionAliases.set('transientrprompt', 'TRANSIENT_RPROMPT');
    this.optionAliases.set('beep', 'BEEP');
    this.optionAliases.set('combiningchars', 'COMBINING_CHARS');
    this.optionAliases.set('emacs', 'EMACS');
    this.optionAliases.set('overstrike', 'OVERSTRIKE');
    this.optionAliases.set('singlelinezle', 'SINGLE_LINE_ZLE');
    this.optionAliases.set('vi', 'VI');
    this.optionAliases.set('zle', 'ZLE');
  }

  /**
   * Normalize option name (handle aliases and case)
   */
  private normalizeOptionName(optionName: string): string {
    const upperName = optionName.toUpperCase();
    
    // Check if it's an alias
    if (this.optionAliases.has(optionName.toLowerCase())) {
      return this.optionAliases.get(optionName.toLowerCase())!;
    }
    
    return upperName;
  }
}

export default ZshOptionsManager;