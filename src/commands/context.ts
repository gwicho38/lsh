/**
 * Context Command - Comprehensive ML/Agent-Friendly Documentation
 *
 * Provides thorough usage information in machine-readable format
 * for ML models and automation agents to quickly build context.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CommandSpec {
  command: string;
  description: string;
  options?: Array<{
    flag: string;
    description: string;
    default?: string;
  }>;
  examples?: string[];
  notes?: string[];
}

interface ContextOutput {
  tool: {
    name: string;
    package: string;
    version: string;
    purpose: string;
    repository: string;
  };
  quickStart: string[];
  commands: {
    setup: CommandSpec[];
    secrets: CommandSpec[];
    operations: CommandSpec[];
    automation: CommandSpec[];
    config: CommandSpec[];
    backend: CommandSpec[];
    self: CommandSpec[];
  };
  environment: {
    required: Array<{ name: string; description: string; example?: string }>;
    optional: Array<{ name: string; description: string; default?: string }>;
  };
  files: Array<{ path: string; description: string }>;
  patterns: {
    name: string;
    description: string;
    commands: string[];
  }[];
  troubleshooting: Array<{
    error: string;
    cause: string;
    solution: string;
  }>;
}

/**
 * Get current version from package.json
 */
function getVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Build comprehensive context data structure
 */
function buildContextData(): ContextOutput {
  return {
    tool: {
      name: 'lsh',
      package: 'lsh-framework',
      version: getVersion(),
      purpose: 'Encrypted secrets manager for .env files with multi-host sync via IPFS/Storacha',
      repository: 'https://github.com/gwicho38/lsh',
    },

    quickStart: [
      'npm install -g lsh-framework',
      'lsh init                    # Interactive setup (first time)',
      'lsh doctor                  # Verify configuration',
      'lsh push                    # Push secrets to cloud',
      'lsh pull                    # Pull secrets from cloud',
    ],

    commands: {
      setup: [
        {
          command: 'lsh init',
          description: 'Interactive setup wizard for first-time configuration',
          examples: ['lsh init'],
          notes: ['Guides through encryption key generation, Storacha auth, and initial push'],
        },
        {
          command: 'lsh key',
          description: 'Generate a new AES-256 encryption key',
          examples: ['lsh key', 'lsh key >> .env'],
          notes: ['Outputs LSH_SECRETS_KEY=<64-char-hex>', 'Add to .env or shell profile'],
        },
        {
          command: 'lsh doctor',
          description: 'Diagnose configuration and connectivity issues',
          examples: ['lsh doctor'],
          notes: ['Checks: encryption key, Storacha auth, network, local files'],
        },
      ],

      secrets: [
        {
          command: 'lsh push',
          description: 'Upload encrypted .env to cloud storage',
          options: [
            { flag: '-f, --file <path>', description: 'Path to .env file', default: '.env' },
            { flag: '-e, --env <name>', description: 'Environment name', default: 'dev' },
            { flag: '-g, --global', description: 'Use global workspace ($HOME)' },
            { flag: '--force', description: 'Force push even with destructive changes' },
          ],
          examples: [
            'lsh push',
            'lsh push --env prod',
            'lsh push --file .env.staging --env staging',
            'lsh push --global',
          ],
        },
        {
          command: 'lsh pull',
          description: 'Download .env from cloud storage',
          options: [
            { flag: '-f, --file <path>', description: 'Path to .env file', default: '.env' },
            { flag: '-e, --env <name>', description: 'Environment name', default: 'dev' },
            { flag: '-g, --global', description: 'Use global workspace ($HOME)' },
            { flag: '--force', description: 'Overwrite without backup' },
          ],
          examples: [
            'lsh pull',
            'lsh pull --env prod',
            'lsh pull --file .env.local --env local',
          ],
        },
        {
          command: 'lsh sync',
          description: 'Smart sync - check status and auto-resolve differences',
          examples: ['lsh sync'],
          notes: ['Compares local and cloud, suggests or auto-performs sync'],
        },
        {
          command: 'lsh list',
          description: 'List secrets in local .env file',
          options: [
            { flag: '-f, --file <path>', description: 'Path to .env file', default: '.env' },
            { flag: '--format <type>', description: 'Output format: env|json|yaml|toml|export', default: 'env' },
            { flag: '--keys-only', description: 'Show only keys, not values' },
            { flag: '--no-mask', description: 'Show full values (not masked)' },
          ],
          examples: [
            'lsh list',
            'lsh list --format json',
            'lsh list --format export',
            'eval "$(lsh list --format export)"',
          ],
        },
        {
          command: 'lsh env',
          description: 'List cloud environments or view specific environment',
          examples: ['lsh env', 'lsh env prod'],
        },
        {
          command: 'lsh status',
          description: 'Show detailed sync status report',
          examples: ['lsh status'],
          notes: ['Shows local hash, cloud hash, sync state, last sync time'],
        },
      ],

      operations: [
        {
          command: 'lsh get <key>',
          description: 'Get a specific secret value',
          options: [
            { flag: '--all', description: 'Get all secrets as key=value pairs' },
            { flag: '--no-mask', description: 'Show unmasked value' },
          ],
          examples: [
            'lsh get API_KEY',
            'lsh get API_KEY --no-mask',
            'lsh get --all',
            'API_KEY=$(lsh get API_KEY --no-mask)',
          ],
        },
        {
          command: 'lsh set <key> <value>',
          description: 'Set a specific secret value',
          examples: [
            'lsh set API_KEY sk-abc123',
            'lsh set DATABASE_URL "postgres://user:pass@host/db"',
            'printenv | lsh set  # Batch import from stdin',
          ],
        },
        {
          command: 'lsh load',
          description: 'Auto-load secrets into current shell environment',
          examples: [
            'lsh load',
            'source <(lsh load)',
          ],
          notes: ['Outputs export statements for sourcing'],
        },
        {
          command: 'lsh create',
          description: 'Create a new .env file',
          examples: ['lsh create'],
        },
        {
          command: 'lsh delete',
          description: 'Delete .env file',
          examples: ['lsh delete'],
          notes: ['Prompts for confirmation'],
        },
      ],

      automation: [
        {
          command: 'lsh daemon start',
          description: 'Start persistent background daemon',
          examples: ['lsh daemon start'],
          notes: ['Required for cron jobs and scheduled tasks'],
        },
        {
          command: 'lsh daemon stop',
          description: 'Stop the background daemon',
          examples: ['lsh daemon stop'],
        },
        {
          command: 'lsh daemon status',
          description: 'Check daemon status',
          examples: ['lsh daemon status'],
        },
        {
          command: 'lsh cron add',
          description: 'Add a scheduled job',
          options: [
            { flag: '--name <name>', description: 'Job name (required)' },
            { flag: '--schedule <cron>', description: 'Cron expression (required)' },
            { flag: '--command <cmd>', description: 'Command to execute (required)' },
          ],
          examples: [
            'lsh cron add --name "daily-backup" --schedule "0 0 * * *" --command "lsh push"',
            'lsh cron add --name "monthly-rotate" --schedule "0 0 1 * *" --command "./rotate-keys.sh && lsh push --force"',
          ],
        },
        {
          command: 'lsh cron list',
          description: 'List all scheduled jobs',
          examples: ['lsh cron list'],
        },
        {
          command: 'lsh cron remove <name>',
          description: 'Remove a scheduled job',
          examples: ['lsh cron remove daily-backup'],
        },
      ],

      config: [
        {
          command: 'lsh config show',
          description: 'Show current configuration',
          examples: ['lsh config show'],
        },
        {
          command: 'lsh config get <key>',
          description: 'Get a configuration value',
          examples: ['lsh config get default_env'],
        },
        {
          command: 'lsh config set <key> <value>',
          description: 'Set a configuration value',
          examples: ['lsh config set default_env prod'],
        },
      ],

      backend: [
        {
          command: 'lsh storacha login <email>',
          description: 'Authenticate with Storacha/IPFS network',
          examples: ['lsh storacha login user@example.com'],
          notes: ['Sends verification email', 'One-time per machine'],
        },
        {
          command: 'lsh supabase init',
          description: 'Initialize Supabase backend connection',
          examples: ['lsh supabase init'],
          notes: ['Alternative to Storacha', 'Requires SUPABASE_URL and SUPABASE_ANON_KEY'],
        },
        {
          command: 'lsh supabase test',
          description: 'Test Supabase connectivity',
          examples: ['lsh supabase test'],
        },
      ],

      self: [
        {
          command: 'lsh self update',
          description: 'Update to latest version from npm',
          options: [
            { flag: '--check', description: 'Only check, do not install' },
            { flag: '-y, --yes', description: 'Skip confirmation prompt' },
          ],
          examples: ['lsh self update', 'lsh self update --check'],
        },
        {
          command: 'lsh self version',
          description: 'Show detailed version information',
          examples: ['lsh self version'],
        },
        {
          command: 'lsh self info',
          description: 'Show installation and environment info',
          examples: ['lsh self info'],
        },
        {
          command: 'lsh --help',
          description: 'Show help',
          examples: ['lsh --help', 'lsh push --help'],
        },
        {
          command: 'lsh --version',
          description: 'Show version',
          examples: ['lsh --version'],
        },
        {
          command: 'lsh context',
          description: 'Show this comprehensive ML/agent context',
          options: [
            { flag: '--json', description: 'Output as JSON for parsing' },
          ],
          examples: ['lsh context', 'lsh context --json'],
        },
      ],
    },

    environment: {
      required: [
        {
          name: 'LSH_SECRETS_KEY',
          description: 'AES-256 encryption key (64 hex characters)',
          example: 'a1b2c3d4e5f6...64chars',
        },
      ],
      optional: [
        {
          name: 'LSH_STORACHA_ENABLED',
          description: 'Enable IPFS storage via Storacha',
          default: 'true',
        },
        {
          name: 'SUPABASE_URL',
          description: 'Supabase project URL (alternative backend)',
        },
        {
          name: 'SUPABASE_ANON_KEY',
          description: 'Supabase anonymous key',
        },
        {
          name: 'LSH_API_ENABLED',
          description: 'Enable REST API server',
          default: 'false',
        },
        {
          name: 'LSH_API_PORT',
          description: 'API server port',
          default: '3030',
        },
        {
          name: 'LSH_API_KEY',
          description: 'API authentication key',
        },
      ],
    },

    files: [
      { path: '.env', description: 'Local environment file (default target)' },
      { path: '~/.config/lsh/lshrc', description: 'Global LSH configuration' },
      { path: '~/.lsh/secrets-cache/', description: 'Encrypted secrets cache' },
      { path: '~/.lsh/secrets-metadata.json', description: 'Sync metadata index' },
    ],

    patterns: [
      {
        name: 'First-Time Setup',
        description: 'Initial configuration on a new machine',
        commands: [
          'npm install -g lsh-framework',
          'lsh init',
          'lsh doctor',
        ],
      },
      {
        name: 'Daily Workflow',
        description: 'Typical developer daily usage',
        commands: [
          'cd ~/project',
          'lsh pull',
          '# ... work ...',
          'lsh push',
        ],
      },
      {
        name: 'Team Onboarding',
        description: 'Add new team member with shared secrets',
        commands: [
          '# Get LSH_SECRETS_KEY from password manager',
          'echo "LSH_SECRETS_KEY=<shared-key>" >> .env',
          'lsh storacha login team@company.com',
          'lsh pull --env prod',
        ],
      },
      {
        name: 'CI/CD Integration',
        description: 'Use secrets in CI pipeline',
        commands: [
          'export LSH_SECRETS_KEY=${{ secrets.LSH_KEY }}',
          'lsh pull --env $ENV',
          'source <(lsh list --format export)',
        ],
      },
      {
        name: 'Multi-Environment Deploy',
        description: 'Manage dev/staging/prod separately',
        commands: [
          'lsh push --env dev',
          'lsh push --env staging',
          'lsh push --env prod',
          'lsh pull --env staging  # Switch to staging',
        ],
      },
      {
        name: 'Automatic Key Rotation',
        description: 'Schedule monthly key rotation',
        commands: [
          'lsh daemon start',
          'lsh cron add --name "rotate" --schedule "0 0 1 * *" --command "lsh key >> .env && lsh push --force"',
        ],
      },
      {
        name: 'Load Secrets to Shell',
        description: 'Export all secrets to current shell session',
        commands: [
          'eval "$(lsh list --format export)"',
          '# Or: source <(lsh list --format export)',
        ],
      },
      {
        name: 'Get Single Secret',
        description: 'Retrieve one secret for use in script',
        commands: [
          'API_KEY=$(lsh get API_KEY --no-mask)',
          'curl -H "Authorization: Bearer $API_KEY" https://api.example.com',
        ],
      },
    ],

    troubleshooting: [
      {
        error: 'No secrets found for environment',
        cause: 'Environment does not exist in cloud storage',
        solution: 'Run `lsh env` to list environments, then `lsh push --env <name>` to create',
      },
      {
        error: 'Decryption failed',
        cause: 'LSH_SECRETS_KEY does not match the key used to encrypt',
        solution: 'Ensure LSH_SECRETS_KEY in .env matches the original. If lost, generate new key with `lsh key` and re-push',
      },
      {
        error: 'Storacha authentication required',
        cause: 'Not authenticated with Storacha IPFS network',
        solution: 'Run `lsh storacha login your@email.com` and verify via email',
      },
      {
        error: '.env file not found',
        cause: 'No local .env file exists',
        solution: 'Run `lsh pull` to download from cloud, or `lsh create` to create new',
      },
      {
        error: 'Network error / timeout',
        cause: 'Cannot reach Storacha or Supabase',
        solution: 'Check internet connection. Run `lsh doctor` to diagnose',
      },
    ],
  };
}

/**
 * Format context data as human-readable text
 */
function formatAsText(data: ContextOutput): string {
  const lines: string[] = [];

  // Header
  lines.push('================================================================================');
  lines.push('LSH - Encrypted Secrets Manager - ML/Agent Context');
  lines.push('================================================================================');
  lines.push('');
  lines.push(`Version: ${data.tool.version}`);
  lines.push(`Package: ${data.tool.package}`);
  lines.push(`Purpose: ${data.tool.purpose}`);
  lines.push(`Repository: ${data.tool.repository}`);
  lines.push('');

  // Quick Start
  lines.push('QUICK START');
  lines.push('--------------------------------------------------------------------------------');
  for (const cmd of data.quickStart) {
    lines.push(`  ${cmd}`);
  }
  lines.push('');

  // Commands by category
  const categories = [
    { key: 'setup', title: 'SETUP COMMANDS' },
    { key: 'secrets', title: 'SECRETS COMMANDS' },
    { key: 'operations', title: 'SECRET OPERATIONS' },
    { key: 'automation', title: 'AUTOMATION COMMANDS' },
    { key: 'config', title: 'CONFIGURATION COMMANDS' },
    { key: 'backend', title: 'BACKEND COMMANDS' },
    { key: 'self', title: 'SELF-MANAGEMENT' },
  ] as const;

  for (const cat of categories) {
    const cmds = data.commands[cat.key];
    lines.push(cat.title);
    lines.push('--------------------------------------------------------------------------------');

    for (const cmd of cmds) {
      lines.push(`  ${cmd.command}`);
      lines.push(`    ${cmd.description}`);

      if (cmd.options && cmd.options.length > 0) {
        lines.push('    Options:');
        for (const opt of cmd.options) {
          const def = opt.default ? ` (default: ${opt.default})` : '';
          lines.push(`      ${opt.flag}  ${opt.description}${def}`);
        }
      }

      if (cmd.examples && cmd.examples.length > 0) {
        lines.push('    Examples:');
        for (const ex of cmd.examples) {
          lines.push(`      $ ${ex}`);
        }
      }

      if (cmd.notes && cmd.notes.length > 0) {
        lines.push('    Notes:');
        for (const note of cmd.notes) {
          lines.push(`      - ${note}`);
        }
      }

      lines.push('');
    }
  }

  // Environment Variables
  lines.push('ENVIRONMENT VARIABLES');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('Required:');
  for (const env of data.environment.required) {
    lines.push(`  ${env.name}`);
    lines.push(`    ${env.description}`);
    if (env.example) {
      lines.push(`    Example: ${env.example}`);
    }
  }
  lines.push('');
  lines.push('Optional:');
  for (const env of data.environment.optional) {
    const def = env.default ? ` (default: ${env.default})` : '';
    lines.push(`  ${env.name}${def}`);
    lines.push(`    ${env.description}`);
  }
  lines.push('');

  // File Locations
  lines.push('FILE LOCATIONS');
  lines.push('--------------------------------------------------------------------------------');
  for (const file of data.files) {
    lines.push(`  ${file.path}`);
    lines.push(`    ${file.description}`);
  }
  lines.push('');

  // Common Patterns
  lines.push('COMMON PATTERNS');
  lines.push('--------------------------------------------------------------------------------');
  for (const pattern of data.patterns) {
    lines.push(`  ${pattern.name}`);
    lines.push(`    ${pattern.description}`);
    for (const cmd of pattern.commands) {
      lines.push(`    $ ${cmd}`);
    }
    lines.push('');
  }

  // Troubleshooting
  lines.push('TROUBLESHOOTING');
  lines.push('--------------------------------------------------------------------------------');
  for (const issue of data.troubleshooting) {
    lines.push(`  Error: "${issue.error}"`);
    lines.push(`    Cause: ${issue.cause}`);
    lines.push(`    Solution: ${issue.solution}`);
    lines.push('');
  }

  // Footer
  lines.push('================================================================================');
  lines.push('For more information: https://github.com/gwicho38/lsh');
  lines.push('Static context file: llms.txt (in repository root)');
  lines.push('================================================================================');

  return lines.join('\n');
}

/**
 * Register the context command
 */
export function registerContextCommand(program: Command): void {
  program
    .command('context')
    .description('Show comprehensive ML/agent-friendly usage documentation')
    .option('--json', 'Output as JSON for programmatic parsing')
    .action((options) => {
      const data = buildContextData();

      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(formatAsText(data));
      }
    });
}
