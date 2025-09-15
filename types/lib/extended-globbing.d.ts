/**
 * Extended Globbing Implementation
 * Provides ZSH-compatible extended globbing patterns
 */
export interface GlobQualifier {
    type: 'size' | 'time' | 'type' | 'perm' | 'user' | 'group';
    operator: '=' | '+' | '-' | '>';
    value: string;
}
export interface ExtendedGlobOptions {
    cwd?: string;
    includeHidden?: boolean;
    followSymlinks?: boolean;
    extendedGlob?: boolean;
}
export declare class ExtendedGlobber {
    private cwd;
    constructor(cwd?: string);
    /**
     * Expand extended glob patterns
     */
    expandPattern(pattern: string, options?: ExtendedGlobOptions): Promise<string[]>;
    /**
     * Expand exclusion patterns: *.txt~*backup*
     */
    private expandExclusionPattern;
    /**
     * Expand alternation patterns: (foo|bar).txt
     */
    private expandAlternationPattern;
    /**
     * Expand numeric ranges: <1-10>.txt
     */
    private expandNumericRange;
    /**
     * Expand patterns with qualifiers: *.txt(.L+10)
     */
    private expandQualifiedPattern;
    /**
     * Expand negation patterns: ^*.backup
     */
    private expandNegationPattern;
    /**
     * Expand recursive patterns: **\/*.txt
     */
    private expandRecursivePattern;
    /**
     * Expand regular glob patterns
     */
    private expandRegularPattern;
    /**
     * Parse qualifiers from string
     */
    private parseQualifiers;
    /**
     * Filter files by qualifiers
     */
    private filterByQualifiers;
    /**
     * Check if file matches a qualifier
     */
    private matchesQualifier;
    /**
     * Search recursively for files
     */
    private searchRecursively;
    /**
     * Get all files in directory
     */
    private getAllFiles;
    /**
     * Match segments recursively
     */
    private matchSegments;
    /**
     * Check if filename matches pattern
     */
    private matchesPattern;
    /**
     * Convert glob pattern to regex
     */
    private patternToRegex;
    /**
     * Find closing bracket
     */
    private findClosingBracket;
    /**
     * Expand tilde
     */
    private expandTilde;
    /**
     * Escape regex special characters
     */
    private escapeRegex;
}
export default ExtendedGlobber;
