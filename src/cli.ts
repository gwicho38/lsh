#!/usr/bin/env node

/**
 * LSH CLI Entry Point
 * Supports interactive mode and script execution
 */

import { Command } from 'commander';
import InteractiveShell from './lib/interactive-shell.js';
import ScriptRunner from './lib/script-runner.js';
import { parseShellCommand } from './lib/shell-parser.js';
import selfCommand from './commands/self.js';
import { registerApiCommands } from './commands/api.js';
import { registerZshImportCommands } from './commands/zsh-import.js';
import { registerThemeCommands } from './commands/theme.js';
import { init_daemon } from './services/daemon/daemon.js';
import { init_ishell } from './services/shell/shell.js';
import { init_lib } from './services/lib/lib.js';
import { init_supabase } from './services/supabase/supabase.js';
import { init_cron } from './services/cron/cron.js';
import { init_secrets } from './services/secrets/secrets.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get version from package.json
function getVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || '0.5.1';
  } catch {
    return '0.5.1';
  }
}

const program = new Command();

program
  .name('lsh')
  .description('LSH - Encrypted secrets manager with automatic rotation and team sync')
  .version(getVersion())
  .showSuggestionAfterError(true)
  .showHelpAfterError('(add --help for additional information)')
  .allowUnknownOption(false)
  .enablePositionalOptions();

// Options for main command
program
  .option('-i, --interactive', 'Start interactive shell')
  .option('-c, --command <command>', 'Execute command string')
  .option('-s, --script <file>', 'Execute script file')
  .option('--rc <file>', 'Use custom rc file')
  .option('--zsh-compat', 'Enable ZSH compatibility mode')
  .option('--source-zshrc', 'Source ~/.zshrc configuration')
  .option('--package-manager <manager>', 'Package manager (npm, yarn, brew, apt, yum)')
  .option('-v, --verbose', 'Verbose output')
  .option('-d, --debug', 'Debug mode')
  .action(async (options) => {
    try {
      if (options.command) {
        // Execute single command
        await executeCommand(options.command, options);
      } else if (options.script) {
        // Execute script file
        await executeScript(options.script, options);
      } else if (options.interactive) {
        // Start interactive shell only if -i or --interactive is specified
        await startInteractiveShell(options);
      } else {
        // No arguments - show secrets-focused help
        console.log('LSH - Encrypted Secrets Manager with Automatic Rotation');
        console.log('');
        console.log('🔐 Secrets Management (Primary Features):');
        console.log('  sync                    Check sync status & get recommendations');
        console.log('  push                    Upload .env to encrypted cloud storage');
        console.log('  pull                    Download .env from cloud storage');
        console.log('  list                    List all stored environments');
        console.log('  show                    View secrets (masked)');
        console.log('  key                     Generate encryption key');
        console.log('  create                  Create new .env file');
        console.log('  get <key>               Get a specific secret value');
        console.log('  set <key> <value>       Set a specific secret value');
        console.log('  delete                  Delete .env file');
        console.log('  status                  Get detailed secrets status');
        console.log('');
        console.log('🔄 Automation (Schedule secret rotation):');
        console.log('  lib cron add            Schedule automatic tasks');
        console.log('  lib cron list           List scheduled jobs');
        console.log('  lib daemon start        Start persistent daemon');
        console.log('');
        console.log('🚀 Quick Start:');
        console.log('  lsh key                           # Generate encryption key');
        console.log('  lsh push --env dev                # Push your secrets');
        console.log('  lsh pull --env dev                # Pull on another machine');
        console.log('');
        console.log('📚 More Commands:');
        console.log('  lib api                 API server management');
        console.log('  lib supabase            Supabase database management');
        console.log('  lib daemon              Daemon management');
        console.log('  lib cron                Cron job management');
        console.log('  self                    Self-management commands');
        console.log('  self zsh                ZSH compatibility commands');
        console.log('  -i, --interactive       Start interactive shell');
        console.log('  --help                  Show all options');
        console.log('');
        console.log('📖 Documentation: https://github.com/gwicho38/lsh');
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// Script execution subcommand
program
  .command('script <file>')
  .description('Execute a shell script')
  .option('-a, --args <args...>', 'Script arguments')
  .option('-c, --cwd <dir>', 'Working directory')
  .option('-e, --env <key=value>', 'Environment variables')
  .action(async (file, options) => {
    try {
      await executeScript(file, options);
    } catch (error) {
      console.error(`Script error: ${error.message}`);
      process.exit(1);
    }
  });

// Configuration subcommand
program
  .command('config')
  .description('Manage LSH configuration')
  .option('--init', 'Initialize configuration')
  .option('--show', 'Show current configuration')
  .option('--validate', 'Validate configuration')
  .action(async (options) => {
    try {
      await handleConfig(options);
    } catch (error) {
      console.error(`Config error: ${error.message}`);
      process.exit(1);
    }
  });

// Self-management commands
program.addCommand(selfCommand);

// ZSH compatibility commands (under self)
selfCommand
  .command('zsh')
  .description('ZSH compatibility commands')
  .option('--migrate', 'Migrate ZSH configuration to LSH')
  .option('--source', 'Source ZSH configuration')
  .option('--check', 'Check ZSH availability')
  .action(async (options) => {
    try {
      await handleZshCompatibility(options);
    } catch (error) {
      console.error(`ZSH compatibility error: ${error.message}`);
      process.exit(1);
    }
  });

// Help subcommand
program
  .command('help')
  .description('Show detailed help')
  .action(() => {
    showDetailedHelp();
  });

/**
 * Calculate string similarity (Levenshtein distance)
 */
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshtein(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Find similar commands for suggestions
 */
function findSimilarCommands(input: string, validCommands: string[]): string[] {
  const similarities = validCommands
    .map(cmd => ({ cmd, score: similarity(input, cmd) }))
    .filter(item => item.score > 0.5) // Only suggest if similarity > 50%
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // Top 3 suggestions

  return similarities.map(item => item.cmd);
}

// Register async command modules
(async () => {
  // REPL interactive shell
  await init_ishell(program);

  // Library commands (parent for service commands)
  const libCommand = await init_lib(program);

  // Nest service commands under lib
  await init_supabase(libCommand);
  await init_daemon(libCommand);
  await init_cron(libCommand);
  registerApiCommands(libCommand);

  // Secrets as top-level command
  await init_secrets(program);

  // Self-management commands with nested utilities
  registerZshImportCommands(selfCommand);
  registerThemeCommands(selfCommand);

  // Pre-parse check for unknown commands
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const firstArg = args[0];
    const validCommands = program.commands.map(cmd => cmd.name());
    const validOptions = ['-i', '--interactive', '-c', '--command', '-s', '--script',
                         '--rc', '--zsh-compat', '--source-zshrc', '--package-manager',
                         '-v', '--verbose', '-d', '--debug', '-h', '--help', '-V', '--version'];

    // Check if first argument looks like a command but isn't valid
    if (!firstArg.startsWith('-') &&
        !validCommands.includes(firstArg) &&
        !validOptions.some(opt => args.includes(opt))) {

      const suggestions = findSimilarCommands(firstArg, validCommands);
      console.error(`error: unknown command '${firstArg}'`);

      if (suggestions.length > 0) {
        console.error(`\nDid you mean one of these?`);
        suggestions.forEach(cmd => console.error(`    ${cmd}`));
      }

      console.error(`\nRun 'lsh --help' to see available commands.`);
      process.exit(1);
    }
  }

  // Configure custom error output for better suggestions
  program.configureOutput({
    writeErr: (str) => {
      // Intercept error messages to add suggestions
      if (str.includes('error: unknown command')) {
        const match = str.match(/unknown command '([^']+)'/);
        if (match) {
          const unknownCommand = match[1];
          const validCommands = program.commands.map(cmd => cmd.name());
          const suggestions = findSimilarCommands(unknownCommand, validCommands);

          process.stderr.write(str);
          if (suggestions.length > 0) {
            process.stderr.write(`\nDid you mean one of these?\n`);
            suggestions.forEach(cmd => process.stderr.write(`    ${cmd}\n`));
          }
          process.stderr.write(`\nRun 'lsh --help' to see available commands.\n`);
          return;
        }
      }
      process.stderr.write(str);
    }
  });

  // Add custom error handler for unknown commands
  program.on('command:*', (operands) => {
    const unknownCommand = operands[0];
    const validCommands = program.commands.map(cmd => cmd.name());
    const suggestions = findSimilarCommands(unknownCommand, validCommands);

    console.error(`error: unknown command '${unknownCommand}'`);

    if (suggestions.length > 0) {
      console.error(`\nDid you mean one of these?`);
      suggestions.forEach(cmd => console.error(`    ${cmd}`));
    }

    console.error(`\nRun 'lsh --help' to see available commands.`);
    process.exit(1);
  });

  // Parse command line arguments after all commands are registered
  program.parse(process.argv);
})();

/**
 * Start interactive shell
 */
async function startInteractiveShell(options: any): Promise<void> {
  const shellOptions: any = {
    verbose: options.verbose,
    debug: options.debug,
  };

  // Only set rcFile if explicitly provided
  if (options.rc) {
    shellOptions.rcFile = options.rc;
  }

  const shell = new InteractiveShell(shellOptions);
  await shell.start();
}

/**
 * Execute single command
 */
async function executeCommand(command: string, options: any): Promise<void> {
  const { ShellExecutor } = await import('./lib/shell-executor.js');
  const executor = new ShellExecutor();

  // Load configuration if rc file specified
  if (options.rc) {
    await loadRcFile(executor, options.rc);
  }

  try {
    const ast = parseShellCommand(command);
    const result = await executor.execute(ast);

    if (result.stdout) {
      console.log(result.stdout);
    }
    if (result.stderr) {
      console.error(result.stderr);
    }

    process.exit(result.exitCode);
  } catch (error) {
    console.error(`Command error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Execute script file
 */
async function executeScript(scriptPath: string, options: any): Promise<void> {
  if (!fs.existsSync(scriptPath)) {
    console.error(`Script file not found: ${scriptPath}`);
    process.exit(1);
  }

  const runner = new ScriptRunner({
    cwd: options.cwd,
    env: parseEnvOptions(options.env),
  });

  const result = await runner.executeScript(scriptPath, {
    args: options.args || [],
  });

  if (result.output) {
    console.log(result.output);
  }
  if (result.errors) {
    console.error(result.errors);
  }

  process.exit(result.exitCode);
}

/**
 * Handle configuration commands
 */
async function handleConfig(options: any): Promise<void> {
  const rcFile = path.join(process.env.HOME || '/', '.lshrc');

  if (options.init) {
    await initializeConfig(rcFile);
  } else if (options.show) {
    await showConfig(rcFile);
  } else if (options.validate) {
    await validateConfig(rcFile);
  } else {
    console.log('Configuration management:');
    console.log('  --init     Initialize default configuration');
    console.log('  --show     Show current configuration');
    console.log('  --validate Validate configuration file');
  }
}

/**
 * Initialize configuration file
 */
async function initializeConfig(rcFile: string): Promise<void> {
  if (fs.existsSync(rcFile)) {
    console.log(`Configuration file already exists: ${rcFile}`);
    return;
  }

  const defaultConfig = `# LSH Configuration File
# This file is executed when LSH starts in interactive mode

# Enable ZSH features
setopt EXTENDED_GLOB
setopt AUTO_CD
setopt SHARE_HISTORY
setopt HIST_IGNORE_DUPS

# Set prompt
export PROMPT='%n@%m:%~$ '
export RPROMPT='%T'

# Set history options
export HISTSIZE=10000
export HISTFILE=~/.lsh_history

# Aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'

# Functions
greet() {
    echo "Hello from LSH!"
}

# Welcome message
echo "LSH interactive shell loaded. Type 'help' for commands."
`;

  try {
    fs.writeFileSync(rcFile, defaultConfig, 'utf8');
    console.log(`✅ Created configuration file: ${rcFile}`);
  } catch (error) {
    console.error(`❌ Failed to create configuration: ${error.message}`);
  }
}

/**
 * Show current configuration
 */
async function showConfig(rcFile: string): Promise<void> {
  if (!fs.existsSync(rcFile)) {
    console.log(`❌ Configuration file not found: ${rcFile}`);
    console.log('Run "lsh config --init" to create one.');
    return;
  }

  try {
    const content = fs.readFileSync(rcFile, 'utf8');
    console.log(`📄 Configuration file: ${rcFile}`);
    console.log('='.repeat(50));
    console.log(content);
  } catch (error) {
    console.error(`❌ Failed to read configuration: ${error.message}`);
  }
}

/**
 * Validate configuration file
 */
async function validateConfig(rcFile: string): Promise<void> {
  if (!fs.existsSync(rcFile)) {
    console.log(`❌ Configuration file not found: ${rcFile}`);
    return;
  }

  try {
    const content = fs.readFileSync(rcFile, 'utf8');
    const lines = content.split('\n');
    let valid = true;
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#') || line === '') {
        continue;
      }

      try {
        parseShellCommand(line);
      } catch (error) {
        valid = false;
        errors.push(`Line ${i + 1}: ${error.message}`);
      }
    }

    if (valid) {
      console.log(`✅ Configuration file is valid: ${rcFile}`);
    } else {
      console.log(`❌ Configuration file has errors: ${rcFile}`);
      errors.forEach(error => console.log(`  ${error}`));
    }
  } catch (error) {
    console.error(`❌ Failed to validate configuration: ${error.message}`);
  }
}

/**
 * Load rc file
 */
async function loadRcFile(executor: any, rcFile: string): Promise<void> {
  if (!fs.existsSync(rcFile)) {
    console.error(`Configuration file not found: ${rcFile}`);
    return;
  }

  try {
    const content = fs.readFileSync(rcFile, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('#') || trimmed === '') {
        continue;
      }

      try {
        const ast = parseShellCommand(trimmed);
        await executor.execute(ast);
      } catch (error) {
        console.error(`Config error: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`Failed to load configuration: ${error.message}`);
  }
}

/**
 * Parse environment variable options
 */
function parseEnvOptions(envOptions: string[]): Record<string, string> {
  const env: Record<string, string> = {};
  
  if (envOptions) {
    for (const option of envOptions) {
      const [key, value] = option.split('=', 2);
      if (key && value !== undefined) {
        env[key] = value;
      }
    }
  }
  
  return env;
}

/**
 * Handle ZSH compatibility commands
 */
async function handleZshCompatibility(options: any): Promise<void> {
  const { ShellExecutor } = await import('./lib/shell-executor.js');
  const executor = new ShellExecutor();

  if (options.migrate) {
    const result = await executor.getZshCompatibility().migrateZshConfig();
    console.log(result.message);
    process.exit(result.success ? 0 : 1);
  } else if (options.source) {
    const result = await executor.getZshCompatibility().sourceZshConfig();
    console.log(result.message);
    process.exit(result.success ? 0 : 1);
  } else if (options.check) {
    const result = await executor.getZshCompatibility().checkZshAvailability();
    if (result.available) {
      console.log(`✅ ZSH is available: version ${result.version}`);
      console.log(`   Path: ${result.path}`);
    } else {
      console.log('❌ ZSH is not available on this system');
    }
  } else {
    console.log('ZSH Compatibility Commands:');
    console.log('  --migrate  Migrate ZSH configuration to LSH');
    console.log('  --source   Source ZSH configuration');
    console.log('  --check    Check ZSH availability');
  }
}

/**
 * Show detailed help
 */
function showDetailedHelp(): void {
  console.log('LSH - Modern Shell with ZSH Features');
  console.log('====================================');
  console.log('');
  console.log('Usage:');
  console.log('  lsh                    Show help (default)');
  console.log('  lsh -i                 Start interactive shell');
  console.log('  lsh -c "command"       Execute command string');
  console.log('  lsh -s script.sh       Execute script file');
  console.log('  lsh script.sh          Execute script file');
  console.log('');
  console.log('Options:');
  console.log('  -i, --interactive      Start interactive shell');
  console.log('  -c, --command <cmd>    Execute command string');
  console.log('  -s, --script <file>    Execute script file');
  console.log('  --rc <file>            Use custom rc file');
  console.log('  -v, --verbose          Verbose output');
  console.log('  -d, --debug            Debug mode');
  console.log('  -h, --help             Show help');
  console.log('  -V, --version          Show version');
  console.log('');
  console.log('Subcommands:');
  console.log('  secrets                 Secrets management (primary feature)');
  console.log('  repl                    JavaScript REPL interactive shell');
  console.log('  script <file>           Execute shell script');
  console.log('  config                  Manage configuration');
  console.log('  help                    Show detailed help');
  console.log('');
  console.log('Self-Management (lsh self <command>):');
  console.log('  self update             Update to latest version');
  console.log('  self version            Show version information');
  console.log('  self uninstall          Uninstall LSH from system');
  console.log('  self theme              Manage themes (import Oh-My-Zsh themes)');
  console.log('  self zsh                ZSH compatibility commands');
  console.log('  self zsh-import         Import ZSH configs (aliases, functions, exports)');
  console.log('');
  console.log('Library Commands (lsh lib <command>):');
  console.log('  lib api                 API server management');
  console.log('  lib supabase            Supabase database management');
  console.log('  lib daemon              Daemon management');
  console.log('  lib daemon job          Job management');
  console.log('  lib daemon db           Database integration');
  console.log('  lib cron                Cron job management');
  console.log('');
  console.log('Examples:');
  console.log('');
  console.log('  Shell Usage:');
  console.log('    lsh                                  # Show this help');
  console.log('    lsh -i                               # Start interactive shell');
  console.log('    lsh repl                            # Start JavaScript REPL');
  console.log('    lsh -c "echo hello && pwd"          # Execute command');
  console.log('    lsh my-script.sh arg1 arg2          # Execute script');
  console.log('');
  console.log('  Configuration:');
  console.log('    lsh config --init                   # Initialize config');
  console.log('    lsh config --show                   # Show config');
  console.log('    lsh self version                    # Show version');
  console.log('    lsh self update                     # Update to latest');
  console.log('');
  console.log('  Self-Management:');
  console.log('    lsh self update                     # Update to latest version');
  console.log('    lsh self version                    # Show version');
  console.log('    lsh self theme list                 # List available themes');
  console.log('    lsh self theme import robbyrussell  # Import Oh-My-Zsh theme');
  console.log('    lsh self zsh-import aliases         # Import ZSH aliases');
  console.log('');
  console.log('  Secrets Management:');
  console.log('    lsh secrets sync                    # Check sync status');
  console.log('    lsh secrets push                    # Push secrets to cloud');
  console.log('    lsh secrets pull                    # Pull secrets from cloud');
  console.log('    lsh secrets list                    # List environments');
  console.log('');
  console.log('  Library Services:');
  console.log('    lsh lib daemon start                # Start daemon');
  console.log('    lsh lib daemon status               # Check daemon status');
  console.log('    lsh lib daemon job list             # List all jobs');
  console.log('    lsh lib cron list                   # List cron jobs');
  console.log('    lsh lib api start                   # Start API server');
  console.log('    lsh lib api key                     # Generate API key');
  console.log('');
  console.log('Features:');
  console.log('  ✅ POSIX Shell Compliance (85-95%)');
  console.log('  ✅ ZSH Features (arrays, globbing, floating point)');
  console.log('  ✅ Advanced Job Management');
  console.log('  ✅ Interactive Mode with History & Completion');
  console.log('  ✅ Configuration via ~/.lshrc');
  console.log('  ✅ Script Execution');
  console.log('  ✅ Command Line Interface');
}