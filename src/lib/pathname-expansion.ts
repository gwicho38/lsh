/**
 * POSIX Pathname Expansion Implementation
 * Implements POSIX.1-2017 Section 2.13 Pathname Expansion (Globbing)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface GlobOptions {
  cwd?: string;
  includeHidden?: boolean;
  followSymlinks?: boolean;
}

export class PathnameExpander {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  public async expandPathnames(pattern: string, options: GlobOptions = {}): Promise<string[]> {
    // If no glob characters, return as-is
    if (!this.containsGlobChars(pattern)) {
      return [pattern];
    }

    // Handle tilde expansion first
    const expandedPattern = this.expandTilde(pattern);

    // Perform pathname expansion
    return this.glob(expandedPattern, options);
  }

  private containsGlobChars(str: string): boolean {
    // Check for unescaped glob characters
    return /[*?[\]{}~]/.test(str);
  }

  private expandTilde(pattern: string): string {
    if (pattern.startsWith('~/')) {
      const homeDir = process.env.HOME || '/';
      return path.join(homeDir, pattern.slice(2));
    }
    if (pattern === '~') {
      return process.env.HOME || '/';
    }
    return pattern;
  }

  private async glob(pattern: string, options: GlobOptions): Promise<string[]> {
    const baseCwd = options.cwd || this.cwd;

    // Handle absolute vs relative paths
    const isAbsolute = path.isAbsolute(pattern);
    const searchBase = isAbsolute ? '/' : baseCwd;
    const relativePath = isAbsolute ? pattern.slice(1) : pattern;

    // Split pattern into segments
    const segments = relativePath.split('/').filter(seg => seg.length > 0);

    if (segments.length === 0) {
      return [searchBase];
    }

    // Start recursive matching
    const results = await this.matchSegments(searchBase, segments, options);

    // Sort results for consistent output
    return results.sort();
  }

  private async matchSegments(
    currentPath: string,
    remainingSegments: string[],
    options: GlobOptions
  ): Promise<string[]> {
    if (remainingSegments.length === 0) {
      return [currentPath];
    }

    const [currentSegment, ...restSegments] = remainingSegments;
    const results: string[] = [];

    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip hidden files unless explicitly included
        if (!options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        // Check if this entry matches the current segment pattern
        if (this.matchSegment(entry.name, currentSegment)) {
          const fullPath = path.join(currentPath, entry.name);

          if (restSegments.length === 0) {
            // This is the final segment, add to results
            results.push(fullPath);
          } else if (entry.isDirectory()) {
            // Recurse into directory for remaining segments
            const subResults = await this.matchSegments(fullPath, restSegments, options);
            results.push(...subResults);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or not readable, return empty
      return [];
    }

    return results;
  }

  private matchSegment(filename: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regex = this.patternToRegex(pattern);
    return regex.test(filename);
  }

  private patternToRegex(pattern: string): RegExp {
    let regexStr = '';
    let i = 0;

    while (i < pattern.length) {
      const char = pattern[i];

      switch (char) {
        case '*':
          regexStr += '.*';
          break;

        case '?':
          regexStr += '.';
          break;

        case '[': {
          // Character class
          const closeIdx = this.findClosingBracket(pattern, i);
          if (closeIdx === -1) {
            // Invalid bracket, treat as literal
            regexStr += '\\[';
          } else {
            let charClass = pattern.slice(i + 1, closeIdx);

            // Handle negation
            if (charClass.startsWith('!') || charClass.startsWith('^')) {
              charClass = '^' + charClass.slice(1);
            }

            // Handle character ranges and classes
            charClass = this.processCharacterClass(charClass);

            regexStr += '[' + charClass + ']';
            i = closeIdx;
          }
          break;
        }

        case '{': {
          // Brace expansion - simplified implementation
          const braceEnd = this.findClosingBrace(pattern, i);
          if (braceEnd === -1) {
            regexStr += '\\{';
          } else {
            const braceContent = pattern.slice(i + 1, braceEnd);
            const alternatives = braceContent.split(',');
            regexStr += '(' + alternatives.map(alt => this.escapeRegex(alt)).join('|') + ')';
            i = braceEnd;
          }
          break;
        }

        case '\\':
          // Escape next character
          if (i + 1 < pattern.length) {
            regexStr += '\\' + pattern[i + 1];
            i++;
          } else {
            regexStr += '\\\\';
          }
          break;

        default:
          // Literal character - escape regex special chars
          regexStr += this.escapeRegex(char);
          break;
      }

      i++;
    }

    return new RegExp('^' + regexStr + '$');
  }

  private findClosingBracket(str: string, startIdx: number): number {
    let depth = 1;
    for (let i = startIdx + 1; i < str.length; i++) {
      if (str[i] === '[') depth++;
      else if (str[i] === ']') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  private findClosingBrace(str: string, startIdx: number): number {
    let depth = 1;
    for (let i = startIdx + 1; i < str.length; i++) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  private processCharacterClass(charClass: string): string {
    // Handle POSIX character classes like [:alpha:]
    charClass = charClass.replace(/\[:alpha:\]/g, 'a-zA-Z');
    charClass = charClass.replace(/\[:digit:\]/g, '0-9');
    charClass = charClass.replace(/\[:alnum:\]/g, 'a-zA-Z0-9');
    charClass = charClass.replace(/\[:lower:\]/g, 'a-z');
    charClass = charClass.replace(/\[:upper:\]/g, 'A-Z');
    charClass = charClass.replace(/\[:space:\]/g, ' \\t\\n\\r\\f\\v');
    charClass = charClass.replace(/\[:blank:\]/g, ' \\t');
    charClass = charClass.replace(/\[:punct:\]/g, '!-/:-@\\[-`{-~');
    charClass = charClass.replace(/\[:cntrl:\]/g, '\\x00-\\x1F\\x7F');
    charClass = charClass.replace(/\[:print:\]/g, '\\x20-\\x7E');
    charClass = charClass.replace(/\[:graph:\]/g, '\\x21-\\x7E');
    charClass = charClass.replace(/\[:xdigit:\]/g, '0-9A-Fa-f');

    return charClass;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.+^$()|[\]{}\\]/g, '\\$&');
  }

  // Utility method for expanding multiple patterns
  public async expandMultiplePatterns(patterns: string[], options: GlobOptions = {}): Promise<string[]> {
    const results: string[] = [];

    for (const pattern of patterns) {
      const expanded = await this.expandPathnames(pattern, options);
      results.push(...expanded);
    }

    // Remove duplicates and sort
    return [...new Set(results)].sort();
  }

  // Check if a pattern would match any files (useful for error reporting)
  public async hasMatches(pattern: string, options: GlobOptions = {}): Promise<boolean> {
    const matches = await this.expandPathnames(pattern, options);
    return matches.length > 0 && matches[0] !== pattern;
  }
}