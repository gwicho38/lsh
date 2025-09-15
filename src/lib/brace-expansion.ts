/**
 * POSIX Brace Expansion Implementation
 * Handles patterns like {a,b,c}, {1..5}, {a..z}, etc.
 */

export interface BraceExpansionOptions {
  maxExpansions?: number; // Prevent excessive expansions
}

export class BraceExpander {
  private maxExpansions: number;

  constructor(options: BraceExpansionOptions = {}) {
    this.maxExpansions = options.maxExpansions || 10000;
  }

  public expandBraces(pattern: string): string[] {
    // If no braces, return as-is
    if (!pattern.includes('{') || !pattern.includes('}')) {
      return [pattern];
    }

    try {
      const results = this.expandPattern(pattern);

      // Safety check to prevent excessive expansions
      if (results.length > this.maxExpansions) {
        return [pattern]; // Return original if too many expansions
      }

      return results;
    } catch (error) {
      // If expansion fails, return original pattern
      return [pattern];
    }
  }

  private expandPattern(pattern: string): string[] {
    // Find the first complete brace expression
    const braceMatch = this.findBraceExpression(pattern);

    if (!braceMatch) {
      return [pattern];
    }

    const { start, end, content } = braceMatch;
    const prefix = pattern.substring(0, start);
    const suffix = pattern.substring(end + 1);

    // Expand the brace content
    const expansions = this.expandBraceContent(content);

    // Combine prefix + expansion + suffix
    const results: string[] = [];
    for (const expansion of expansions) {
      const combined = prefix + expansion + suffix;

      // Recursively expand any remaining braces
      const furtherExpanded = this.expandPattern(combined);
      results.push(...furtherExpanded);
    }

    return results;
  }

  private findBraceExpression(pattern: string): { start: number; end: number; content: string } | null {
    let braceCount = 0;
    let start = -1;

    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i];

      if (char === '{') {
        if (braceCount === 0) {
          start = i;
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && start !== -1) {
          const content = pattern.substring(start + 1, i);
          return { start, end: i, content };
        }
      }
    }

    return null;
  }

  private expandBraceContent(content: string): string[] {
    // Handle sequence expansion first (e.g., 1..5, a..z)
    const sequenceMatch = content.match(/^(.+?)\.\.(.+?)(?:\.\.(.+))?$/);
    if (sequenceMatch) {
      return this.expandSequence(sequenceMatch[1], sequenceMatch[2], sequenceMatch[3]);
    }

    // Handle comma-separated list (e.g., a,b,c)
    if (content.includes(',')) {
      return this.expandCommaList(content);
    }

    // Not a valid brace expression
    return ['{' + content + '}'];
  }

  private expandSequence(start: string, end: string, step?: string): string[] {
    const results: string[] = [];

    // Determine if numeric or alphabetic sequence
    const startNum = parseInt(start, 10);
    const endNum = parseInt(end, 10);
    const stepNum = step ? parseInt(step, 10) : 1;

    if (!isNaN(startNum) && !isNaN(endNum)) {
      // Numeric sequence
      if (stepNum <= 0) return ['{' + start + '..' + end + '}'];

      if (startNum <= endNum) {
        for (let i = startNum; i <= endNum; i += stepNum) {
          results.push(i.toString());
        }
      } else {
        for (let i = startNum; i >= endNum; i -= stepNum) {
          results.push(i.toString());
        }
      }
    } else if (start.length === 1 && end.length === 1) {
      // Alphabetic sequence
      const startCode = start.charCodeAt(0);
      const endCode = end.charCodeAt(0);

      if (startCode <= endCode) {
        for (let i = startCode; i <= endCode; i += stepNum) {
          results.push(String.fromCharCode(i));
        }
      } else {
        for (let i = startCode; i >= endCode; i -= stepNum) {
          results.push(String.fromCharCode(i));
        }
      }
    } else {
      // Invalid sequence
      return ['{' + start + '..' + end + '}'];
    }

    return results;
  }

  private expandCommaList(content: string): string[] {
    const results: string[] = [];
    let current = '';
    let braceCount = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (char === '{') {
        braceCount++;
        current += char;
      } else if (char === '}') {
        braceCount--;
        current += char;
      } else if (char === ',' && braceCount === 0) {
        results.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current) {
      results.push(current.trim());
    }

    return results;
  }

  // Utility method for expanding multiple patterns
  public expandMultiplePatterns(patterns: string[]): string[] {
    const results: string[] = [];

    for (const pattern of patterns) {
      results.push(...this.expandBraces(pattern));
    }

    return results;
  }
}