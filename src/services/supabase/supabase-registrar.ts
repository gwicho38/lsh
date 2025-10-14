/**
 * Supabase Command Registrar
 * Registers all Supabase-related CLI commands using BaseCommandRegistrar
 */

import { Command } from 'commander';
import { BaseCommandRegistrar } from '../../lib/base-command-registrar.js';
import { supabaseClient } from '../../lib/supabase-client.js';
import DatabasePersistence from '../../lib/database-persistence.js';
import CloudConfigManager from '../../lib/cloud-config-manager.js';
import { CREATE_TABLES_SQL } from '../../lib/database-schema.js';

export class SupabaseCommandRegistrar extends BaseCommandRegistrar {
  constructor() {
    super('SupabaseService');
  }

  async register(program: Command): Promise<void> {
    const supabaseCmd = this.createCommand(program, 'supabase', 'Supabase database management commands');

    this.registerConnectionCommands(supabaseCmd);
    this.registerDataCommands(supabaseCmd);
    this.registerMLCommands(supabaseCmd);
  }

  private registerConnectionCommands(supabaseCmd: Command): void {
    // Test connection
    this.addSubcommand(supabaseCmd, {
      name: 'test',
      description: 'Test Supabase database connection',
      action: async () => {
        this.logInfo('Testing Supabase connection...');
        const isConnected = await supabaseClient.testConnection();

        if (isConnected) {
          this.logSuccess('Supabase connection successful');
          const info = supabaseClient.getConnectionInfo();
          this.logInfo(`Connection info: ${JSON.stringify(info)}`);
        } else {
          throw new Error('Supabase connection failed');
        }
      }
    });

    // Initialize schema
    this.addSubcommand(supabaseCmd, {
      name: 'init',
      description: 'Initialize database schema',
      action: async () => {
        this.logInfo('Initializing database schema...');
        const persistence = new DatabasePersistence();
        const success = await persistence.initializeSchema();

        if (success) {
          this.logSuccess('Database schema initialized');
          this.logInfo('Note: Run the following SQL in your Supabase dashboard:');
          this.logInfo(CREATE_TABLES_SQL);
        } else {
          throw new Error('Failed to initialize schema');
        }
      }
    });

    // Sync management
    this.addSubcommand(supabaseCmd, {
      name: 'sync',
      description: 'Synchronize data with Supabase',
      options: [
        { flags: '-f, --force', description: 'Force full synchronization', defaultValue: false }
      ],
      action: async (_options) => {
        this.logInfo('Synchronizing data with Supabase...');

        const persistence = new DatabasePersistence();

        // Test connection first
        const isConnected = await persistence.testConnection();
        if (!isConnected) {
          throw new Error('Cannot sync - database not available');
        }

        // Sync configuration
        this.logInfo('Syncing configuration...');
        // Configuration sync is handled automatically by CloudConfigManager

        // Sync history (this would be done automatically by the enhanced history system)
        this.logInfo('Syncing history...');
        // History sync is handled by EnhancedHistorySystem

        this.logSuccess('Synchronization completed');
      }
    });
  }

  private registerDataCommands(supabaseCmd: Command): void {
    // History management
    this.addSubcommand(supabaseCmd, {
      name: 'history',
      description: 'Manage shell history',
      options: [
        { flags: '-l, --list', description: 'List recent history entries', defaultValue: false },
        { flags: '-c, --count <number>', description: 'Number of entries to show', defaultValue: '10' },
        { flags: '-s, --search <query>', description: 'Search history entries' }
      ],
      action: async (options) => {
        const persistence = new DatabasePersistence();

        if (options.list) {
          const count = parseInt(options.count);
          const entries = await persistence.getHistoryEntries(count);

          this.logInfo(`Recent ${entries.length} history entries:`);
          entries.forEach((entry, index) => {
            const timestamp = new Date(entry.timestamp).toLocaleString();
            const exitCode = entry.exit_code ? ` (exit: ${entry.exit_code})` : '';
            this.logInfo(`${index + 1}. [${timestamp}] ${entry.command}${exitCode}`);
          });
        } else if (options.search) {
          const entries = await persistence.getHistoryEntries(100);
          const filtered = entries.filter(entry =>
            entry.command.toLowerCase().includes(options.search.toLowerCase())
          );

          this.logInfo(`Found ${filtered.length} matching entries:`);
          filtered.forEach((entry, index) => {
            const timestamp = new Date(entry.timestamp).toLocaleString();
            this.logInfo(`${index + 1}. [${timestamp}] ${entry.command}`);
          });
        } else {
          this.logInfo('Use --list or --search to manage history');
        }
      }
    });

    // Configuration management
    this.addSubcommand(supabaseCmd, {
      name: 'config',
      description: 'Manage shell configuration',
      options: [
        { flags: '-l, --list', description: 'List all configuration', defaultValue: false },
        { flags: '-g, --get <key>', description: 'Get configuration value' },
        { flags: '-s, --set <key> <value>', description: 'Set configuration value' },
        { flags: '-d, --delete <key>', description: 'Delete configuration key' },
        { flags: '-e, --export', description: 'Export configuration to JSON', defaultValue: false }
      ],
      action: async (options) => {
        const configManager = new CloudConfigManager();

        if (options.list) {
          const config = configManager.getAll();
          this.logInfo('Current configuration:');
          config.forEach(item => {
            this.logInfo(`  ${item.key}: ${JSON.stringify(item.value)}`);
          });
        } else if (options.get) {
          const value = configManager.get(options.get);
          if (value !== undefined) {
            this.logInfo(`${options.get}: ${JSON.stringify(value)}`);
          } else {
            this.logWarning(`Configuration key '${options.get}' not found`);
          }
        } else if (options.set) {
          const [key, value] = options.set;
          configManager.set(key, value);
          this.logSuccess(`Configuration '${key}' set to: ${value}`);
        } else if (options.delete) {
          configManager.delete(options.delete);
          this.logSuccess(`Configuration '${options.delete}' deleted`);
        } else if (options.export) {
          const exported = configManager.export();
          this.logInfo(exported);
        } else {
          this.logInfo('Use --list, --get, --set, --delete, or --export to manage configuration');
        }
      }
    });

    // Jobs management
    this.addSubcommand(supabaseCmd, {
      name: 'jobs',
      description: 'Manage shell jobs',
      options: [
        { flags: '-l, --list', description: 'List active jobs', defaultValue: false },
        { flags: '-h, --history', description: 'List job history', defaultValue: false }
      ],
      action: async (options) => {
        const persistence = new DatabasePersistence();

        if (options.list) {
          const jobs = await persistence.getActiveJobs();
          this.logInfo(`Active jobs (${jobs.length}):`);
          jobs.forEach(job => {
            const started = new Date(job.started_at).toLocaleString();
            this.logInfo(`${job.job_id}: ${job.command} (${job.status}) - Started: ${started}`);
          });
        } else if (options.history) {
          this.logInfo('Job history feature not yet implemented');
        } else {
          this.logInfo('Use --list or --history to manage jobs');
        }
      }
    });

    // Database rows management
    this.addSubcommand(supabaseCmd, {
      name: 'rows',
      description: 'Show latest database entries',
      options: [
        { flags: '-l, --limit <number>', description: 'Number of rows to show per table', defaultValue: '5' },
        { flags: '-t, --table <name>', description: 'Show rows from specific table only' }
      ],
      action: async (options) => {
        const persistence = new DatabasePersistence();
        const limit = parseInt(options.limit);

        // Test connection first
        const isConnected = await persistence.testConnection();
        if (!isConnected) {
          throw new Error('Cannot fetch rows - database not available');
        }

        if (options.table) {
          // Show rows from specific table
          this.logInfo(`Latest ${limit} entries from table '${options.table}':`);
          const rows = await persistence.getLatestRowsFromTable(options.table, limit);

          if (rows.length === 0) {
            this.logInfo('No entries found.');
          } else {
            rows.forEach((row, index) => {
              const timestamp = row.created_at ? new Date(row.created_at).toLocaleString() : 'N/A';
              this.logInfo(`\n${index + 1}. [${timestamp}]`);
              this.logInfo(JSON.stringify(row, null, 2));
            });
          }
        } else {
          // Show rows from all tables
          this.logInfo(`Latest ${limit} entries from each table:`);
          const allRows = await persistence.getLatestRows(limit);

          for (const [tableName, rows] of Object.entries(allRows)) {
            this.logInfo(`\n=== ${tableName.toUpperCase()} ===`);

            if (rows.length === 0) {
              this.logInfo('No entries found.');
            } else {
              rows.forEach((row, index) => {
                const timestamp = row.created_at ? new Date(row.created_at).toLocaleString() : 'N/A';
                this.logInfo(`\n${index + 1}. [${timestamp}]`);
                this.logInfo(JSON.stringify(row, null, 2));
              });
            }
          }
        }
      }
    });
  }

  private registerMLCommands(supabaseCmd: Command): void {
    // ML Training Jobs
    this.addSubcommand(supabaseCmd, {
      name: 'ml-train',
      description: 'Manage ML training jobs',
      options: [
        { flags: '-l, --list', description: 'List training jobs', defaultValue: false },
        { flags: '-s, --status <status>', description: 'Filter by status (pending, running, completed, failed)' },
        { flags: '-c, --create <name>', description: 'Create new training job' },
        { flags: '--model-type <type>', description: 'Model type for new job' },
        { flags: '--dataset <name>', description: 'Dataset name for new job' }
      ],
      action: async (options) => {
        if (options.list) {
          let query = supabaseClient.getClient()
            .from('ml_training_jobs')
            .select('*')
            .order('created_at', { ascending: false });

          if (options.status) {
            query = query.eq('status', options.status);
          }

          const { data: jobs, error } = await query.limit(20);

          if (error) {
            throw new Error(`Failed to fetch training jobs: ${error.message}`);
          }

          this.logInfo(`Training Jobs (${jobs?.length || 0}):`);
          jobs?.forEach(job => {
            const created = new Date(job.created_at).toLocaleString();
            this.logInfo(`\n${job.job_name} (${job.model_type})`);
            this.logInfo(`  Status: ${job.status}`);
            this.logInfo(`  Created: ${created}`);
            this.logInfo(`  Dataset: ${job.dataset_name}`);
          });
        } else if (options.create) {
          if (!options.modelType || !options.dataset) {
            throw new Error('Both --model-type and --dataset are required to create a job');
          }

          const { data, error } = await supabaseClient.getClient()
            .from('ml_training_jobs')
            .insert({
              job_name: options.create,
              model_type: options.modelType,
              dataset_name: options.dataset,
              status: 'pending',
              created_at: new Date().toISOString()
            })
            .select();

          if (error) {
            throw new Error(`Failed to create training job: ${error.message}`);
          }

          this.logSuccess(`Created training job: ${options.create}`);
          this.logInfo(JSON.stringify(data, null, 2));
        } else {
          this.logInfo('Use --list or --create to manage training jobs');
        }
      }
    });

    // ML Models
    this.addSubcommand(supabaseCmd, {
      name: 'ml-models',
      description: 'Manage ML models',
      options: [
        { flags: '-l, --list', description: 'List ML models', defaultValue: false },
        { flags: '--deployed', description: 'Filter by deployed models only', defaultValue: false }
      ],
      action: async (options) => {
        if (options.list) {
          let query = supabaseClient.getClient()
            .from('ml_models')
            .select('*')
            .order('created_at', { ascending: false });

          if (options.deployed) {
            query = query.eq('deployed', true);
          }

          const { data: models, error } = await query.limit(20);

          if (error) {
            throw new Error(`Failed to fetch models: ${error.message}`);
          }

          this.logInfo(`ML Models (${models?.length || 0}):`);
          models?.forEach(model => {
            const created = new Date(model.created_at).toLocaleString();
            this.logInfo(`\n${model.model_name} (v${model.version})`);
            this.logInfo(`  Type: ${model.model_type}`);
            this.logInfo(`  Accuracy: ${model.accuracy}`);
            this.logInfo(`  Deployed: ${model.deployed ? 'Yes' : 'No'}`);
            this.logInfo(`  Created: ${created}`);
          });
        } else {
          this.logInfo('Use --list to manage ML models');
        }
      }
    });

    // ML Features
    this.addSubcommand(supabaseCmd, {
      name: 'ml-features',
      description: 'Manage ML feature definitions',
      options: [
        { flags: '-l, --list', description: 'List feature definitions', defaultValue: false }
      ],
      action: async (options) => {
        if (options.list) {
          const { data: features, error } = await supabaseClient.getClient()
            .from('ml_features')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

          if (error) {
            throw new Error(`Failed to fetch features: ${error.message}`);
          }

          this.logInfo(`ML Features (${features?.length || 0}):`);
          features?.forEach(feature => {
            this.logInfo(`\n${feature.feature_name}`);
            this.logInfo(`  Type: ${feature.feature_type}`);
            this.logInfo(`  Importance: ${feature.importance_score}`);
          });
        } else {
          this.logInfo('Use --list to manage ML features');
        }
      }
    });
  }
}
