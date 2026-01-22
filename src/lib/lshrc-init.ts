/**
 * .lshrc Initialization
 * Creates and manages the user's .lshrc configuration file
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { ENV_VARS } from '../constants/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LshrcOptions {
  autoImportZsh?: boolean;
  importOptions?: string[]; // e.g., ['--rename-conflicts', '--no-functions']
  createIfMissing?: boolean;
}

export class LshrcManager {
  private lshrcPath: string;

  constructor(lshrcPath?: string) {
    // Use process.env[ENV_VARS.HOME] if set (for testability), fallback to os.homedir()
    const homeDir = process.env[ENV_VARS.HOME] || os.homedir();
    this.lshrcPath = lshrcPath || path.join(homeDir, '.lshrc');
  }

  /**
   * Initialize .lshrc if it doesn't exist
   */
  // TODO(@gwicho38): Review - initialize
  public initialize(options: LshrcOptions = {}): boolean {
    try {
      // Check if .lshrc already exists
      if (fs.existsSync(this.lshrcPath)) {
        return false; // Already exists, no action needed
      }

      if (!options.createIfMissing) {
        return false; // Don't create if not requested
      }

      // Copy template to user's home directory
      const templatePath = path.join(__dirname, '../../templates/.lshrc.template');

      if (!fs.existsSync(templatePath)) {
        // Template not found, create basic .lshrc
        this.createBasicLshrc(options);
        return true;
      }

      // Copy template
      let content = fs.readFileSync(templatePath, 'utf8');

      // Enable auto-import if requested
      if (options.autoImportZsh) {
        const importCmd = `zsh-source${options.importOptions ? ' ' + options.importOptions.join(' ') : ''}`;
        content = content.replace(
          '# zsh-source',
          importCmd
        );
      }

      fs.writeFileSync(this.lshrcPath, content, 'utf8');
      console.log(`✅ Created ${this.lshrcPath}`);

      return true;
    } catch (error) {
      const err = error as Error;
      console.error(`Failed to initialize .lshrc: ${err.message}`);
      return false;
    }
  }

  /**
   * Create basic .lshrc without template
   */
  // TODO(@gwicho38): Review - createBasicLshrc
  private createBasicLshrc(options: LshrcOptions): void {
    const content = `# LSH Configuration File
# Location: ${this.lshrcPath}

${options.autoImportZsh ? `# Auto-import ZSH configurations
zsh-source${options.importOptions ? ' ' + options.importOptions.join(' ') : ''}
` : '# Uncomment to auto-import ZSH configurations\n# zsh-source\n'}

# Add your aliases, functions, and environment variables here
`;

    fs.writeFileSync(this.lshrcPath, content, 'utf8');
    console.log(`✅ Created ${this.lshrcPath}`);
  }

  /**
   * Check if .lshrc exists
   */
  // TODO(@gwicho38): Review - exists
  public exists(): boolean {
    return fs.existsSync(this.lshrcPath);
  }

  /**
   * Source .lshrc commands
   */
  // TODO(@gwicho38): Review - source
  public async source(_executor?: unknown): Promise<string[]> {
    if (!this.exists()) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.lshrcPath, 'utf8');
      const commands: string[] = [];

      for (const line of content.split('\n')) {
        const trimmed = line.trim();

        // Skip comments and empty lines
        if (trimmed.startsWith('#') || trimmed === '') {
          continue;
        }

        commands.push(trimmed);
      }

      return commands;
    } catch (error) {
      const err = error as Error;
      console.error(`Failed to source .lshrc: ${err.message}`);
      return [];
    }
  }

  /**
   * Enable auto-import in existing .lshrc
   */
  // TODO(@gwicho38): Review - enableAutoImport
  public enableAutoImport(options: string[] = []): boolean {
    try {
      if (!this.exists()) {
        // Create new .lshrc with auto-import enabled
        this.initialize({ autoImportZsh: true, importOptions: options, createIfMissing: true });
        return true;
      }

      let content = fs.readFileSync(this.lshrcPath, 'utf8');

      // Check if auto-import is already enabled
      if (content.includes('zsh-source') && !content.match(/^#.*zsh-source/m)) {
        console.log('Auto-import is already enabled in .lshrc');
        return false;
      }

      // Add auto-import configuration
      const autoImportBlock = `
# ZSH Auto-Import (added by LSH)
zsh-source${options.length > 0 ? ' ' + options.join(' ') : ''}
`;

      // Find the ZSH import section or add at the top
      if (content.includes('# ZSH IMPORT CONFIGURATION')) {
        content = content.replace(
          /# zsh-source/,
          `zsh-source${options.length > 0 ? ' ' + options.join(' ') : ''}`
        );
      } else {
        content = autoImportBlock + '\n' + content;
      }

      fs.writeFileSync(this.lshrcPath, content, 'utf8');
      console.log('✅ Auto-import enabled in .lshrc');
      return true;
    } catch (error) {
      const err = error as Error;
      console.error(`Failed to enable auto-import: ${err.message}`);
      return false;
    }
  }

  /**
   * Disable auto-import in .lshrc
   */
  // TODO(@gwicho38): Review - disableAutoImport
  public disableAutoImport(): boolean {
    try {
      if (!this.exists()) {
        return false;
      }

      let content = fs.readFileSync(this.lshrcPath, 'utf8');

      // Comment out zsh-source lines
      content = content.replace(/^(zsh-source.*)$/gm, '# $1');

      // Remove auto-import blocks
      content = content.replace(/# ZSH Auto-Import[\s\S]*?(?=\n#|\n\n|$)/g, '');

      fs.writeFileSync(this.lshrcPath, content, 'utf8');
      console.log('✅ Auto-import disabled in .lshrc');
      return true;
    } catch (error) {
      const err = error as Error;
      console.error(`Failed to disable auto-import: ${err.message}`);
      return false;
    }
  }

  /**
   * Get .lshrc path
   */
  // TODO(@gwicho38): Review - getPath
  public getPath(): string {
    return this.lshrcPath;
  }
}

/**
 * Initialize .lshrc on first run
 */
// TODO(@gwicho38): Review - initializeLshrc
export function initializeLshrc(options: LshrcOptions = {}): boolean {
  const manager = new LshrcManager();
  return manager.initialize(options);
}

/**
 * Check if .lshrc exists
 */
// TODO(@gwicho38): Review - lshrcExists
export function lshrcExists(): boolean {
  const manager = new LshrcManager();
  return manager.exists();
}
