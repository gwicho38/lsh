/**
 * ZSH-Style Options System Implementation
 * Provides setopt/unsetopt functionality and ZSH-specific options
 */
export interface ZshOptions {
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
    EXTENDED_GLOB: boolean;
    GLOB_DOTS: boolean;
    GLOB_STAR_SHORT: boolean;
    GLOB_SUBST: boolean;
    NOMATCH: boolean;
    NULL_GLOB: boolean;
    AUTO_CD: boolean;
    AUTO_PUSHD: boolean;
    CDABLE_VARS: boolean;
    CD_SILENT: boolean;
    PUSHD_IGNORE_DUPS: boolean;
    PUSHD_MINUS: boolean;
    PUSHD_SILENT: boolean;
    PUSHD_TO_HOME: boolean;
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
    AUTO_RESUME: boolean;
    BG_NICE: boolean;
    CHECK_JOBS: boolean;
    HUP: boolean;
    LONG_LIST_JOBS: boolean;
    MONITOR: boolean;
    NOTIFY: boolean;
    PROMPT_BANG: boolean;
    PROMPT_CR: boolean;
    PROMPT_PERCENT: boolean;
    PROMPT_SP: boolean;
    PROMPT_SUBST: boolean;
    TRANSIENT_RPROMPT: boolean;
    BEEP: boolean;
    COMBINING_CHARS: boolean;
    EMACS: boolean;
    OVERSTRIKE: boolean;
    SINGLE_LINE_ZLE: boolean;
    VI: boolean;
    ZLE: boolean;
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
export declare class ZshOptionsManager {
    private options;
    private optionAliases;
    constructor();
    /**
     * Set an option with setopt
     */
    setopt(optionName: string): {
        success: boolean;
        message: string;
    };
    /**
     * Unset an option with unsetopt
     */
    unsetopt(optionName: string): {
        success: boolean;
        message: string;
    };
    /**
     * Get option value
     */
    getOption(optionName: string): boolean | undefined;
    /**
     * Check if option is set
     */
    isOptionSet(optionName: string): boolean;
    /**
     * Get all options
     */
    getAllOptions(): ZshOptions;
    /**
     * List all options with their values
     */
    listOptions(): string;
    /**
     * Parse setopt/unsetopt command arguments
     */
    parseSetoptCommand(args: string[]): {
        success: boolean;
        message: string;
    };
    /**
     * Parse unsetopt command arguments
     */
    parseUnsetoptCommand(args: string[]): {
        success: boolean;
        message: string;
    };
    /**
     * Get default options
     */
    private getDefaultOptions;
    /**
     * Setup option aliases
     */
    private setupOptionAliases;
    /**
     * Normalize option name (handle aliases and case)
     */
    private normalizeOptionName;
}
export default ZshOptionsManager;
