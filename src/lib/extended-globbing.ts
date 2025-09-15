/**
 * Extended Globbing Implementation
 * Provides ZSH-compatible extended globbing patterns
 */

import * as fs from 'fs';
import * as path from 'path';

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

export class ExtendedGlobber {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Expand extended glob patterns
   */
  public async expandPattern(pattern: string, options: ExtendedGlobOptions = {}): Promise<string[]> {
    const opts = {
      cwd: this.cwd,
      includeHidden: false,
      followSymlinks: false,
      extendedGlob: true,
      ...options,
    };

    // Handle exclusion patterns: *.txt~*backup*
    if (pattern.includes('~')) {
      return this.expandExclusionPattern(pattern, opts);
    }

    // Handle alternation patterns: (foo|bar).txt
    if (pattern.includes('(') && pattern.includes('|') && pattern.includes(')')) {
      return this.expandAlternationPattern(pattern, opts);
    }

    // Handle numeric ranges: <1-10>.txt
    if (pattern.includes('<') && pattern.includes('-') && pattern.includes('>')) {
      return this.expandNumericRange(pattern, opts);
    }

    // Handle qualifiers: *.txt(.L+10)
    if (pattern.includes('(') && pattern.includes('.')) {
      return this.expandQualifiedPattern(pattern, opts);
    }

    // Handle negation patterns: ^*.backup
    if (pattern.startsWith('^')) {
      return this.expandNegationPattern(pattern, opts);
    }

    // Handle recursive patterns: **/*.txt
    if (pattern.includes('**')) {
      return this.expandRecursivePattern(pattern, opts);
    }

    // Fall back to regular globbing
    return this.expandRegularPattern(pattern, opts);
  }

  /**
   * Expand exclusion patterns: *.txt~*backup*
   */
  private async expandExclusionPattern(pattern: string, options: ExtendedGlobOptions): Promise<string[]> {
    const [includePattern, excludePattern] = pattern.split('~');
    
    const includeResults = await this.expandRegularPattern(includePattern, options);
    const excludeResults = await this.expandRegularPattern(excludePattern, options);
    
    return includeResults.filter(file => !excludeResults.includes(file));
  }

  /**
   * Expand alternation patterns: (foo|bar).txt
   */
  private async expandAlternationPattern(pattern: string, options: ExtendedGlobOptions): Promise<string[]> {
    const results: string[] = [];
    
    // Find alternation groups
    const alternationRegex = /\(([^)]+)\)/g;
    let match;
    
    while ((match = alternationRegex.exec(pattern)) !== null) {
      const alternatives = match[1].split('|');
      const prefix = pattern.substring(0, match.index);
      const suffix = pattern.substring(match.index + match[0].length);
      
      for (const alt of alternatives) {
        const altPattern = prefix + alt + suffix;
        const altResults = await this.expandPattern(altPattern, options);
        results.push(...altResults);
      }
    }
    
    return [...new Set(results)]; // Remove duplicates
  }

  /**
   * Expand numeric ranges: <1-10>.txt
   */
  private async expandNumericRange(pattern: string, options: ExtendedGlobOptions): Promise<string[]> {
    const results: string[] = [];
    
    const rangeRegex = /<(\d+)-(\d+)>/g;
    let match;
    
    while ((match = rangeRegex.exec(pattern)) !== null) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      
      for (let i = start; i <= end; i++) {
        const altPattern = pattern.replace(match[0], i.toString());
        const altResults = await this.expandPattern(altPattern, options);
        results.push(...altResults);
      }
    }
    
    return [...new Set(results)];
  }

  /**
   * Expand patterns with qualifiers: *.txt(.L+10)
   */
  private async expandQualifiedPattern(pattern: string, options: ExtendedGlobOptions): Promise<string[]> {
    const qualifierMatch = pattern.match(/^(.+)\(([^)]+)\)$/);
    if (!qualifierMatch) return [];

    const [, basePattern, qualifierStr] = qualifierMatch;
    const baseResults = await this.expandRegularPattern(basePattern, options);
    
    const qualifiers = this.parseQualifiers(qualifierStr);
    return this.filterByQualifiers(baseResults, qualifiers);
  }

  /**
   * Expand negation patterns: ^*.backup
   */
  private async expandNegationPattern(pattern: string, options: ExtendedGlobOptions): Promise<string[]> {
    const negatedPattern = pattern.substring(1); // Remove ^
    const allFiles = await this.getAllFiles(options.cwd || this.cwd, options);
    const negatedFiles = await this.expandRegularPattern(negatedPattern, options);
    
    return allFiles.filter(file => !negatedFiles.includes(file));
  }

  /**
   * Expand recursive patterns: **\/*.txt
   */
  private async expandRecursivePattern(pattern: string, options: ExtendedGlobOptions): Promise<string[]> {
    const results: string[] = [];
    const searchDir = options.cwd || this.cwd;
    
    // Convert **/*.txt to recursive search
    const recursivePattern = pattern.replace(/\*\*\//g, '');
    
    await this.searchRecursively(searchDir, recursivePattern, results, options);
    
    return results;
  }

  /**
   * Expand regular glob patterns
   */
  private async expandRegularPattern(pattern: string, options: ExtendedGlobOptions): Promise<string[]> {
    const results: string[] = [];
    const searchDir = options.cwd || this.cwd;
    
    // Handle tilde expansion
    const expandedPattern = this.expandTilde(pattern);
    
    // Split pattern into segments
    const segments = expandedPattern.split('/').filter(seg => seg.length > 0);
    
    if (segments.length === 0) {
      return [searchDir];
    }
    
    await this.matchSegments(searchDir, segments, results, options);
    
    return results.sort();
  }

  /**
   * Parse qualifiers from string
   */
  private parseQualifiers(qualifierStr: string): GlobQualifier[] {
    const qualifiers: GlobQualifier[] = [];
    
    // Parse size qualifiers: L+10, L-5, L=100
    const sizeMatch = qualifierStr.match(/L([+\-=])(\d+)/);
    if (sizeMatch) {
      qualifiers.push({
        type: 'size',
        operator: sizeMatch[1] as any,
        value: sizeMatch[2],
      });
    }
    
    // Parse time qualifiers: m-1 (modified within 1 day)
    const timeMatch = qualifierStr.match(/m([+\-=])(\d+)/);
    if (timeMatch) {
      qualifiers.push({
        type: 'time',
        operator: timeMatch[1] as any,
        value: timeMatch[2],
      });
    }
    
    // Parse type qualifiers: f (file), d (directory)
    const typeMatch = qualifierStr.match(/[fd]/);
    if (typeMatch) {
      qualifiers.push({
        type: 'type',
        operator: '=',
        value: typeMatch[0],
      });
    }
    
    return qualifiers;
  }

  /**
   * Filter files by qualifiers
   */
  private filterByQualifiers(files: string[], qualifiers: GlobQualifier[]): string[] {
    return files.filter(file => {
      try {
        const stats = fs.statSync(file);
        
        for (const qualifier of qualifiers) {
          if (!this.matchesQualifier(file, stats, qualifier)) {
            return false;
          }
        }
        
        return true;
      } catch {
        return false;
      }
    });
  }

  /**
   * Check if file matches a qualifier
   */
  private matchesQualifier(file: string, stats: fs.Stats, qualifier: GlobQualifier): boolean {
    switch (qualifier.type) {
      case 'size':
        const size = stats.size;
        const targetSize = parseInt(qualifier.value, 10);
        
        switch (qualifier.operator) {
          case '=': return size === targetSize;
          case '+': return size > targetSize;
          case '-': return size < targetSize;
          case '>': return size >= targetSize;
          default: return false;
        }
        
      case 'time':
        const now = Date.now();
        const fileTime = stats.mtime.getTime();
        const daysDiff = (now - fileTime) / (1000 * 60 * 60 * 24);
        const targetDays = parseInt(qualifier.value, 10);
        
        switch (qualifier.operator) {
          case '=': return Math.abs(daysDiff) <= targetDays;
          case '+': return daysDiff > targetDays;
          case '-': return daysDiff < targetDays;
          case '>': return daysDiff >= targetDays;
          default: return false;
        }
        
      case 'type':
        switch (qualifier.value) {
          case 'f': return stats.isFile();
          case 'd': return stats.isDirectory();
          default: return false;
        }
        
      default:
        return true;
    }
  }

  /**
   * Search recursively for files
   */
  private async searchRecursively(
    dir: string,
    pattern: string,
    results: string[],
    options: ExtendedGlobOptions
  ): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip hidden files unless explicitly included
        if (!options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }
        
        if (entry.isDirectory()) {
          // Recursively search subdirectories
          await this.searchRecursively(fullPath, pattern, results, options);
        } else if (entry.isFile()) {
          // Check if file matches pattern
          if (this.matchesPattern(entry.name, pattern)) {
            results.push(fullPath);
          }
        }
      }
    } catch {
      // Directory doesn't exist or not readable
    }
  }

  /**
   * Get all files in directory
   */
  private async getAllFiles(dir: string, options: ExtendedGlobOptions): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (!options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }
        
        if (entry.isFile()) {
          files.push(fullPath);
        } else if (entry.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath, options);
          files.push(...subFiles);
        }
      }
    } catch {
      // Directory doesn't exist or not readable
    }
    
    return files;
  }

  /**
   * Match segments recursively
   */
  private async matchSegments(
    currentPath: string,
    remainingSegments: string[],
    results: string[],
    options: ExtendedGlobOptions
  ): Promise<void> {
    if (remainingSegments.length === 0) {
      results.push(currentPath);
      return;
    }

    const [currentSegment, ...restSegments] = remainingSegments;

    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        if (this.matchesPattern(entry.name, currentSegment)) {
          const fullPath = path.join(currentPath, entry.name);

          if (restSegments.length === 0) {
            results.push(fullPath);
          } else if (entry.isDirectory()) {
            await this.matchSegments(fullPath, restSegments, results, options);
          }
        }
      }
    } catch {
      // Directory doesn't exist or not readable
    }
  }

  /**
   * Check if filename matches pattern
   */
  private matchesPattern(filename: string, pattern: string): boolean {
    const regex = this.patternToRegex(pattern);
    return regex.test(filename);
  }

  /**
   * Convert glob pattern to regex
   */
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

        case '[':
          const closeIdx = this.findClosingBracket(pattern, i);
          if (closeIdx === -1) {
            regexStr += '\\[';
          } else {
            let charClass = pattern.slice(i + 1, closeIdx);
            if (charClass.startsWith('!') || charClass.startsWith('^')) {
              charClass = '^' + charClass.slice(1);
            }
            regexStr += '[' + charClass + ']';
            i = closeIdx;
          }
          break;

        case '\\':
          if (i + 1 < pattern.length) {
            regexStr += '\\' + pattern[i + 1];
            i++;
          } else {
            regexStr += '\\\\';
          }
          break;

        default:
          regexStr += this.escapeRegex(char);
          break;
      }

      i++;
    }

    return new RegExp('^' + regexStr + '$');
  }

  /**
   * Find closing bracket
   */
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

  /**
   * Expand tilde
   */
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

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.+^$()|\[\]{}\\]/g, '\\$&');
  }
}

export default ExtendedGlobber;