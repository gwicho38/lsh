/**
 * POSIX Brace Expansion Implementation
 * Handles patterns like {a,b,c}, {1..5}, {a..z}, etc.
 */
export interface BraceExpansionOptions {
    maxExpansions?: number;
}
export declare class BraceExpander {
    private maxExpansions;
    constructor(options?: BraceExpansionOptions);
    expandBraces(pattern: string): string[];
    private expandPattern;
    private findBraceExpression;
    private expandBraceContent;
    private expandSequence;
    private expandCommaList;
    expandMultiplePatterns(patterns: string[]): string[];
}
