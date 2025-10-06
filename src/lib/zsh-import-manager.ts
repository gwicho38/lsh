/**
 * Enhanced ZSH Import Manager
 * Handles importing ZSH configurations with conflict resolution, diagnostics, and selective import
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ShellExecutor } from './shell-executor.js';
import { parseShellCommand } from './shell-parser.js';

export interface ZshImportOptions {
  autoImport?: boolean;
  selective?: boolean;
  conflictResolution?: 'skip' | 'overwrite' | 'rename' | 'prompt';
  diagnosticLog?: string;
  includeAliases?: boolean;
  includeExports?: boolean;
  includeFunctions?: boolean;
  includeOptions?: boolean;
  includePlugins?: boolean;
  excludePatterns?: string[];
  includePatterns?: string[];
}

export interface ImportDiagnostic {
  timestamp: Date;
  type: 'alias' | 'export' | 'function' | 'setopt' | 'plugin' | 'error';
  name: string;
  status: 'success' | 'failed' | 'skipped' | 'conflict' | 'disabled';
  reason?: string;
  source?: string;
  action?: string;
}

export interface ParsedZshConfig {
  aliases: Array<{ name: string; value: string; line: number }>;
  functions: Array<{ name: string; body: string; line: number }>;
  exports: Array<{ name: string; value: string; line: number }>;
  setopts: Array<{ option: string; enabled: boolean; line: number }>;
  completions: Array<{ config: string; line: number }>;
  plugins: Array<{ name: string; line: number }>;
}

export interface ImportResult {
  success: boolean;
  message: string;
  diagnostics: ImportDiagnostic[];
  stats: {
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
    conflicts: number;
  };
}

export class ZshImportManager {
  private executor: ShellExecutor;
  private options: Required<ZshImportOptions>;
  private diagnostics: ImportDiagnostic[] = [];
  private existingAliases: Set<string> = new Set();
  private existingExports: Set<string> = new Set();
  private existingFunctions: Set<string> = new Set();

  constructor(executor: ShellExecutor, options: ZshImportOptions = {}) {
    this.executor = executor;
    this.options = {
      autoImport: false,
      selective: false,
      conflictResolution: 'skip',
      diagnosticLog: path.join(os.homedir(), '.lsh', 'zsh-import.log'),
      includeAliases: true,
      includeExports: true,
      includeFunctions: true,
      includeOptions: true,
      includePlugins: true,
      excludePatterns: [],
      includePatterns: [],
      ...options,
    };

    // Ensure diagnostic log directory exists
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.options.diagnosticLog);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Import ZSH configuration from .zshrc
   */
  public async importZshConfig(zshrcPath?: string): Promise<ImportResult> {
    const configPath = zshrcPath || path.join(os.homedir(), '.zshrc');

    this.diagnostics = [];
    this.log({ type: 'alias', name: 'IMPORT_START', status: 'success', reason: `Starting import from ${configPath}` });

    try {
      // Check if .zshrc exists
      if (!fs.existsSync(configPath)) {
        const result: ImportResult = {
          success: false,
          message: `ZSH configuration not found: ${configPath}`,
          diagnostics: this.diagnostics,
          stats: { total: 0, succeeded: 0, failed: 0, skipped: 0, conflicts: 0 },
        };
        this.writeDiagnosticLog();
        return result;
      }

      // Load existing items to detect conflicts
      await this.loadExistingItems();

      // Read and parse .zshrc
      const zshrcContent = fs.readFileSync(configPath, 'utf8');
      const parsed = this.parseZshrc(zshrcContent);

      // Apply configurations based on options
      const stats = {
        total: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        conflicts: 0,
      };

      if (this.options.includeAliases) {
        const result = await this.importAliases(parsed.aliases);
        stats.total += result.total;
        stats.succeeded += result.succeeded;
        stats.failed += result.failed;
        stats.skipped += result.skipped;
        stats.conflicts += result.conflicts;
      }

      if (this.options.includeExports) {
        const result = await this.importExports(parsed.exports);
        stats.total += result.total;
        stats.succeeded += result.succeeded;
        stats.failed += result.failed;
        stats.skipped += result.skipped;
        stats.conflicts += result.conflicts;
      }

      if (this.options.includeFunctions) {
        const result = await this.importFunctions(parsed.functions);
        stats.total += result.total;
        stats.succeeded += result.succeeded;
        stats.failed += result.failed;
        stats.skipped += result.skipped;
        stats.conflicts += result.conflicts;
      }

      if (this.options.includeOptions) {
        const result = await this.importSetopts(parsed.setopts);
        stats.total += result.total;
        stats.succeeded += result.succeeded;
        stats.failed += result.failed;
        stats.skipped += result.skipped;
      }

      if (this.options.includePlugins) {
        const result = await this.importPlugins(parsed.plugins);
        stats.total += result.total;
        stats.succeeded += result.succeeded;
        stats.failed += result.failed;
        stats.skipped += result.skipped;
      }

      this.log({
        type: 'alias',
        name: 'IMPORT_COMPLETE',
        status: 'success',
        reason: `Imported ${stats.succeeded}/${stats.total} items`
      });

      const result: ImportResult = {
        success: true,
        message: this.formatImportMessage(stats),
        diagnostics: this.diagnostics,
        stats,
      };

      this.writeDiagnosticLog();
      return result;

    } catch (error: any) {
      this.log({
        type: 'error',
        name: 'IMPORT_ERROR',
        status: 'failed',
        reason: error.message
      });

      const result: ImportResult = {
        success: false,
        message: `Import failed: ${error.message}`,
        diagnostics: this.diagnostics,
        stats: { total: 0, succeeded: 0, failed: 1, skipped: 0, conflicts: 0 },
      };

      this.writeDiagnosticLog();
      return result;
    }
  }

  /**
   * Parse .zshrc with enhanced function parsing
   */
  private parseZshrc(content: string): ParsedZshConfig {
    const lines = content.split('\n');
    const config: ParsedZshConfig = {
      aliases: [],
      functions: [],
      exports: [],
      setopts: [],
      completions: [],
      plugins: [],
    };

    let inFunction = false;
    let functionName = '';
    let functionBody = '';
    let functionStartLine = 0;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed === '') {
        continue;
      }

      // Handle function definitions (multiple formats)
      // Format 1: name() { ... }
      // Format 2: function name { ... }
      // Format 3: function name() { ... }
      const funcMatch = trimmed.match(/^(?:function\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*\)\s*\{?/) ||
                       trimmed.match(/^function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{?/);

      if (funcMatch && !inFunction) {
        inFunction = true;
        functionName = funcMatch[1];
        functionBody = line;
        functionStartLine = i + 1;
        braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

        if (braceCount === 0 && line.includes('{') && line.includes('}')) {
          // Single-line function
          inFunction = false;
          config.functions.push({
            name: functionName,
            body: functionBody,
            line: functionStartLine,
          });
          functionName = '';
          functionBody = '';
        }
        continue;
      }

      if (inFunction) {
        functionBody += '\n' + line;
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;

        if (braceCount <= 0) {
          inFunction = false;
          config.functions.push({
            name: functionName,
            body: functionBody,
            line: functionStartLine,
          });
          functionName = '';
          functionBody = '';
        }
        continue;
      }

      // Parse aliases
      const aliasMatch = trimmed.match(/^alias\s+([^=]+)=(.+)$/);
      if (aliasMatch) {
        config.aliases.push({
          name: aliasMatch[1].trim(),
          value: aliasMatch[2].replace(/^['"]|['"]$/g, ''),
          line: i + 1,
        });
        continue;
      }

      // Parse exports (handle various formats)
      const exportMatch = trimmed.match(/^export\s+([^=]+)(?:=(.+))?$/);
      if (exportMatch) {
        config.exports.push({
          name: exportMatch[1].trim(),
          value: exportMatch[2] ? exportMatch[2].replace(/^['"]|['"]$/g, '') : '',
          line: i + 1,
        });
        continue;
      }

      // Parse setopt
      const setoptMatch = trimmed.match(/^setopt\s+(.+)$/);
      if (setoptMatch) {
        const options = setoptMatch[1].split(/\s+/);
        for (const option of options) {
          config.setopts.push({
            option: option.trim(),
            enabled: true,
            line: i + 1,
          });
        }
        continue;
      }

      // Parse unsetopt
      const unsetoptMatch = trimmed.match(/^unsetopt\s+(.+)$/);
      if (unsetoptMatch) {
        const options = unsetoptMatch[1].split(/\s+/);
        for (const option of options) {
          config.setopts.push({
            option: option.trim(),
            enabled: false,
            line: i + 1,
          });
        }
        continue;
      }

      // Parse completions
      if (trimmed.includes('compinit') || trimmed.includes('autoload')) {
        config.completions.push({
          config: trimmed,
          line: i + 1,
        });
        continue;
      }

      // Parse plugins
      const pluginMatch = trimmed.match(/plugins?=\(([^)]+)\)/);
      if (pluginMatch) {
        const plugins = pluginMatch[1].split(/\s+/).filter(p => p.trim());
        for (const plugin of plugins) {
          config.plugins.push({
            name: plugin.trim(),
            line: i + 1,
          });
        }
        continue;
      }
    }

    return config;
  }

  /**
   * Load existing items to detect conflicts
   */
  private async loadExistingItems(): Promise<void> {
    // Get existing aliases from context
    const context = (this.executor as any).context;
    if (context && context.variables) {
      for (const key in context.variables) {
        if (key.startsWith('alias_')) {
          this.existingAliases.add(key.substring(6));
        } else {
          this.existingExports.add(key);
        }
      }
    }

    // TODO: Load existing functions when function storage is implemented
  }

  /**
   * Import aliases with conflict resolution
   */
  private async importAliases(aliases: Array<{ name: string; value: string; line: number }>): Promise<any> {
    const stats = { total: aliases.length, succeeded: 0, failed: 0, skipped: 0, conflicts: 0 };

    for (const alias of aliases) {
      // Check include/exclude patterns
      if (!this.shouldImport(alias.name)) {
        this.log({
          type: 'alias',
          name: alias.name,
          status: 'skipped',
          reason: 'Excluded by pattern',
          source: `line ${alias.line}`,
        });
        stats.skipped++;
        continue;
      }

      // Check for conflicts
      if (this.existingAliases.has(alias.name)) {
        stats.conflicts++;
        const action = await this.resolveConflict('alias', alias.name);

        if (action === 'skip') {
          this.log({
            type: 'alias',
            name: alias.name,
            status: 'skipped',
            reason: 'Conflict - alias already exists',
            source: `line ${alias.line}`,
            action: 'skipped',
          });
          stats.skipped++;
          continue;
        } else if (action === 'rename') {
          alias.name = `${alias.name}_zsh`;
          this.log({
            type: 'alias',
            name: alias.name,
            status: 'success',
            reason: 'Conflict - renamed to avoid collision',
            source: `line ${alias.line}`,
            action: 'renamed',
          });
        }
      }

      // Import alias
      try {
        const ast = parseShellCommand(`alias ${alias.name}="${alias.value}"`);
        await this.executor.execute(ast);

        this.existingAliases.add(alias.name);
        this.log({
          type: 'alias',
          name: alias.name,
          status: 'success',
          source: `line ${alias.line}`,
        });
        stats.succeeded++;
      } catch (error: any) {
        this.log({
          type: 'alias',
          name: alias.name,
          status: 'failed',
          reason: error.message,
          source: `line ${alias.line}`,
        });
        stats.failed++;
      }
    }

    return stats;
  }

  /**
   * Import environment variables with conflict resolution
   */
  private async importExports(exports: Array<{ name: string; value: string; line: number }>): Promise<any> {
    const stats = { total: exports.length, succeeded: 0, failed: 0, skipped: 0, conflicts: 0 };

    for (const export_ of exports) {
      // Check include/exclude patterns
      if (!this.shouldImport(export_.name)) {
        this.log({
          type: 'export',
          name: export_.name,
          status: 'skipped',
          reason: 'Excluded by pattern',
          source: `line ${export_.line}`,
        });
        stats.skipped++;
        continue;
      }

      // Check for conflicts
      if (this.existingExports.has(export_.name) || process.env[export_.name]) {
        stats.conflicts++;
        const action = await this.resolveConflict('export', export_.name);

        if (action === 'skip') {
          this.log({
            type: 'export',
            name: export_.name,
            status: 'skipped',
            reason: 'Conflict - variable already exists',
            source: `line ${export_.line}`,
            action: 'skipped',
          });
          stats.skipped++;
          continue;
        }
      }

      // Import export
      try {
        const value = export_.value || '';
        const ast = parseShellCommand(`export ${export_.name}="${value}"`);
        await this.executor.execute(ast);

        this.existingExports.add(export_.name);
        this.log({
          type: 'export',
          name: export_.name,
          status: 'success',
          source: `line ${export_.line}`,
        });
        stats.succeeded++;
      } catch (error: any) {
        this.log({
          type: 'export',
          name: export_.name,
          status: 'failed',
          reason: error.message,
          source: `line ${export_.line}`,
        });
        stats.failed++;
      }
    }

    return stats;
  }

  /**
   * Import functions with enhanced parsing
   */
  private async importFunctions(functions: Array<{ name: string; body: string; line: number }>): Promise<any> {
    const stats = { total: functions.length, succeeded: 0, failed: 0, skipped: 0, conflicts: 0 };

    for (const func of functions) {
      // Check include/exclude patterns
      if (!this.shouldImport(func.name)) {
        this.log({
          type: 'function',
          name: func.name,
          status: 'skipped',
          reason: 'Excluded by pattern',
          source: `line ${func.line}`,
        });
        stats.skipped++;
        continue;
      }

      // Check for conflicts
      if (this.existingFunctions.has(func.name)) {
        stats.conflicts++;
        const action = await this.resolveConflict('function', func.name);

        if (action === 'skip') {
          this.log({
            type: 'function',
            name: func.name,
            status: 'skipped',
            reason: 'Conflict - function already exists',
            source: `line ${func.line}`,
            action: 'skipped',
          });
          stats.skipped++;
          continue;
        } else if (action === 'rename') {
          // Rename function in body
          const oldName = func.name;
          func.name = `${func.name}_zsh`;
          func.body = func.body.replace(
            new RegExp(`^(function\\s+)?${oldName}`, 'm'),
            `$1${func.name}`
          );
          this.log({
            type: 'function',
            name: func.name,
            status: 'success',
            reason: 'Conflict - renamed to avoid collision',
            source: `line ${func.line}`,
            action: 'renamed',
          });
        }
      }

      // Import function
      try {
        const ast = parseShellCommand(func.body);
        await this.executor.execute(ast);

        this.existingFunctions.add(func.name);
        this.log({
          type: 'function',
          name: func.name,
          status: 'success',
          source: `line ${func.line}`,
        });
        stats.succeeded++;
      } catch (error: any) {
        this.log({
          type: 'function',
          name: func.name,
          status: 'disabled',
          reason: `Parse error: ${error.message}`,
          source: `line ${func.line}`,
        });
        stats.failed++;
      }
    }

    return stats;
  }

  /**
   * Import ZSH options
   */
  private async importSetopts(setopts: Array<{ option: string; enabled: boolean; line: number }>): Promise<any> {
    const stats = { total: setopts.length, succeeded: 0, failed: 0, skipped: 0, conflicts: 0 };

    for (const setopt of setopts) {
      try {
        const command = setopt.enabled ? 'setopt' : 'unsetopt';
        const ast = parseShellCommand(`${command} ${setopt.option}`);
        await this.executor.execute(ast);

        this.log({
          type: 'setopt',
          name: setopt.option,
          status: 'success',
          source: `line ${setopt.line}`,
        });
        stats.succeeded++;
      } catch (error: any) {
        this.log({
          type: 'setopt',
          name: setopt.option,
          status: 'disabled',
          reason: error.message,
          source: `line ${setopt.line}`,
        });
        stats.failed++;
      }
    }

    return stats;
  }

  /**
   * Import Oh-My-Zsh plugins
   */
  private async importPlugins(plugins: Array<{ name: string; line: number }>): Promise<any> {
    const stats = { total: plugins.length, succeeded: 0, failed: 0, skipped: 0, conflicts: 0 };

    for (const plugin of plugins) {
      this.log({
        type: 'plugin',
        name: plugin.name,
        status: 'disabled',
        reason: 'Oh-My-Zsh plugin support not yet implemented',
        source: `line ${plugin.line}`,
      });
      stats.skipped++;
    }

    return stats;
  }

  /**
   * Check if item should be imported based on include/exclude patterns
   */
  private shouldImport(name: string): boolean {
    // Check exclude patterns first
    if (this.options.excludePatterns.length > 0) {
      for (const pattern of this.options.excludePatterns) {
        if (this.matchPattern(name, pattern)) {
          return false;
        }
      }
    }

    // Check include patterns
    if (this.options.includePatterns.length > 0) {
      for (const pattern of this.options.includePatterns) {
        if (this.matchPattern(name, pattern)) {
          return true;
        }
      }
      return false; // If include patterns specified, only import matching items
    }

    return true; // No patterns specified, import everything
  }

  /**
   * Match name against pattern (supports wildcards)
   */
  private matchPattern(name: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '.*') // Convert * to .*
      .replace(/\?/g, '.'); // Convert ? to .

    return new RegExp(`^${regexPattern}$`).test(name);
  }

  /**
   * Resolve naming conflicts
   */
  private async resolveConflict(type: string, name: string): Promise<'skip' | 'overwrite' | 'rename'> {
    switch (this.options.conflictResolution) {
      case 'skip':
        return 'skip';
      case 'overwrite':
        return 'overwrite';
      case 'rename':
        return 'rename';
      case 'prompt':
        // TODO: Implement interactive prompt for CLI
        return 'skip'; // Default to skip for now
      default:
        return 'skip';
    }
  }

  /**
   * Log diagnostic entry
   */
  private log(entry: Omit<ImportDiagnostic, 'timestamp'>): void {
    this.diagnostics.push({
      timestamp: new Date(),
      ...entry,
    });
  }

  /**
   * Write diagnostic log to file
   */
  private writeDiagnosticLog(): void {
    try {
      const logContent = this.diagnostics
        .map(d => {
          const parts = [
            d.timestamp.toISOString(),
            d.type.padEnd(10),
            d.status.padEnd(10),
            d.name.padEnd(30),
          ];

          if (d.source) parts.push(`[${d.source}]`);
          if (d.reason) parts.push(d.reason);
          if (d.action) parts.push(`(${d.action})`);

          return parts.join(' ');
        })
        .join('\n');

      fs.appendFileSync(this.options.diagnosticLog, logContent + '\n\n', 'utf8');
    } catch (error: any) {
      console.error(`Failed to write diagnostic log: ${error.message}`);
    }
  }

  /**
   * Format import summary message
   */
  private formatImportMessage(stats: any): string {
    const lines = [
      `ZSH Import Complete:`,
      `  ✅ Succeeded: ${stats.succeeded}`,
      `  ❌ Failed: ${stats.failed}`,
      `  ⏭️  Skipped: ${stats.skipped}`,
      `  ⚠️  Conflicts: ${stats.conflicts}`,
      `  📊 Total: ${stats.total}`,
    ];

    if (stats.failed > 0) {
      lines.push(`\nSee diagnostic log: ${this.options.diagnosticLog}`);
    }

    return lines.join('\n');
  }

  /**
   * Get import statistics from last run
   */
  public getLastImportStats(): any {
    if (this.diagnostics.length === 0) {
      return null;
    }

    const stats = {
      total: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      conflicts: 0,
      byType: {} as any,
    };

    for (const diagnostic of this.diagnostics) {
      if (diagnostic.name === 'IMPORT_START' || diagnostic.name === 'IMPORT_COMPLETE' || diagnostic.name === 'IMPORT_ERROR') {
        continue;
      }

      stats.total++;

      if (diagnostic.status === 'success') stats.succeeded++;
      if (diagnostic.status === 'failed') stats.failed++;
      if (diagnostic.status === 'skipped') stats.skipped++;
      if (diagnostic.status === 'conflict') stats.conflicts++;

      if (!stats.byType[diagnostic.type]) {
        stats.byType[diagnostic.type] = { total: 0, succeeded: 0, failed: 0, skipped: 0 };
      }
      stats.byType[diagnostic.type].total++;
      if (diagnostic.status === 'success') stats.byType[diagnostic.type].succeeded++;
      if (diagnostic.status === 'failed') stats.byType[diagnostic.type].failed++;
      if (diagnostic.status === 'skipped') stats.byType[diagnostic.type].skipped++;
    }

    return stats;
  }
}
