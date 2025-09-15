/**
 * POSIX Pathname Expansion Implementation
 * Implements POSIX.1-2017 Section 2.13 Pathname Expansion (Globbing)
 */
export interface GlobOptions {
    cwd?: string;
    includeHidden?: boolean;
    followSymlinks?: boolean;
}
export declare class PathnameExpander {
    private cwd;
    constructor(cwd?: string);
    expandPathnames(pattern: string, options?: GlobOptions): Promise<string[]>;
    private containsGlobChars;
    private expandTilde;
    private glob;
    private matchSegments;
    private matchSegment;
    private patternToRegex;
    private findClosingBracket;
    private findClosingBrace;
    private processCharacterClass;
    private escapeRegex;
    expandMultiplePatterns(patterns: string[], options?: GlobOptions): Promise<string[]>;
    hasMatches(pattern: string, options?: GlobOptions): Promise<boolean>;
}
