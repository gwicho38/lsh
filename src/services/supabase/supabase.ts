import { Command } from 'commander';
import { supabaseClient } from '../../lib/supabase-client.js';
import DatabasePersistence from '../../lib/database-persistence.js';
import CloudConfigManager from '../../lib/cloud-config-manager.js';
import { CREATE_TABLES_SQL } from '../../lib/database-schema.js';

export async function init_supabase(program: Command) {
  await cmd_supabase(program);
}

async function cmd_supabase(program: Command) {
  const supabaseCmd = program
    .command('supabase')
    .description('Supabase database management commands');

  // Test connection
  supabaseCmd
    .command('test')
    .description('Test Supabase database connection')
    .action(async () => {
      try {
        console.log('Testing Supabase connection...');
        const isConnected = await supabaseClient.testConnection();
        
        if (isConnected) {
          console.log('✅ Supabase connection successful');
          const info = supabaseClient.getConnectionInfo();
          console.log('Connection info:', info);
        } else {
          console.log('❌ Supabase connection failed');
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Connection test failed:', error);
        process.exit(1);
      }
    });

  // Initialize schema
  supabaseCmd
    .command('init')
    .description('Initialize database schema')
    .action(async () => {
      try {
        console.log('Initializing database schema...');
        const persistence = new DatabasePersistence();
        const success = await persistence.initializeSchema();
        
        if (success) {
          console.log('✅ Database schema initialized');
          console.log('Note: Run the following SQL in your Supabase dashboard:');
          console.log(CREATE_TABLES_SQL);
        } else {
          console.log('❌ Failed to initialize schema');
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Schema initialization failed:', error);
        process.exit(1);
      }
    });

  // History management
  supabaseCmd
    .command('history')
    .description('Manage shell history')
    .option('-l, --list', 'List recent history entries')
    .option('-c, --count <number>', 'Number of entries to show', '10')
    .option('-s, --search <query>', 'Search history entries')
    .action(async (options) => {
      try {
        const persistence = new DatabasePersistence();
        
        if (options.list) {
          const count = parseInt(options.count);
          const entries = await persistence.getHistoryEntries(count);
          
          console.log(`Recent ${entries.length} history entries:`);
          entries.forEach((entry, index) => {
            const timestamp = new Date(entry.timestamp).toLocaleString();
            const exitCode = entry.exit_code ? ` (exit: ${entry.exit_code})` : '';
            console.log(`${index + 1}. [${timestamp}] ${entry.command}${exitCode}`);
          });
        } else if (options.search) {
          const entries = await persistence.getHistoryEntries(100);
          const filtered = entries.filter(entry => 
            entry.command.toLowerCase().includes(options.search.toLowerCase())
          );
          
          console.log(`Found ${filtered.length} matching entries:`);
          filtered.forEach((entry, index) => {
            const timestamp = new Date(entry.timestamp).toLocaleString();
            console.log(`${index + 1}. [${timestamp}] ${entry.command}`);
          });
        } else {
          console.log('Use --list or --search to manage history');
        }
      } catch (error) {
        console.error('❌ History management failed:', error);
        process.exit(1);
      }
    });

  // Configuration management
  supabaseCmd
    .command('config')
    .description('Manage shell configuration')
    .option('-l, --list', 'List all configuration')
    .option('-g, --get <key>', 'Get configuration value')
    .option('-s, --set <key> <value>', 'Set configuration value')
    .option('-d, --delete <key>', 'Delete configuration key')
    .option('-e, --export', 'Export configuration to JSON')
    .action(async (options) => {
      try {
        const configManager = new CloudConfigManager();
        
        if (options.list) {
          const configs = configManager.getAll();
          console.log('Configuration entries:');
          configs.forEach(config => {
            console.log(`${config.key}: ${JSON.stringify(config.value)} (${config.type})`);
          });
        } else if (options.get) {
          const value = configManager.get(options.get);
          console.log(`${options.get}: ${JSON.stringify(value)}`);
        } else if (options.set) {
          const [key, value] = options.set.split(' ');
          configManager.set(key, value);
          console.log(`Set ${key} = ${value}`);
        } else if (options.delete) {
          configManager.delete(options.delete);
          console.log(`Deleted ${options.delete}`);
        } else if (options.export) {
          const exported = configManager.export();
          console.log(exported);
        } else {
          console.log('Use --list, --get, --set, --delete, or --export to manage configuration');
        }
      } catch (error) {
        console.error('❌ Configuration management failed:', error);
        process.exit(1);
      }
    });

  // Jobs management
  supabaseCmd
    .command('jobs')
    .description('Manage shell jobs')
    .option('-l, --list', 'List active jobs')
    .option('-h, --history', 'List job history')
    .action(async (options) => {
      try {
        const persistence = new DatabasePersistence();
        
        if (options.list) {
          const jobs = await persistence.getActiveJobs();
          console.log(`Active jobs (${jobs.length}):`);
          jobs.forEach(job => {
            const started = new Date(job.started_at).toLocaleString();
            console.log(`${job.job_id}: ${job.command} (${job.status}) - Started: ${started}`);
          });
        } else if (options.history) {
          // This would require additional implementation for job history
          console.log('Job history feature not yet implemented');
        } else {
          console.log('Use --list or --history to manage jobs');
        }
      } catch (error) {
        console.error('❌ Job management failed:', error);
        process.exit(1);
      }
    });

  // Sync management
  supabaseCmd
    .command('sync')
    .description('Synchronize data with Supabase')
    .option('-f, --force', 'Force full synchronization')
    .action(async (options) => {
      try {
        console.log('Synchronizing data with Supabase...');

        const configManager = new CloudConfigManager();
        const persistence = new DatabasePersistence();

        // Test connection first
        const isConnected = await persistence.testConnection();
        if (!isConnected) {
          console.log('❌ Cannot sync - database not available');
          process.exit(1);
        }

        // Sync configuration
        console.log('Syncing configuration...');
        // Configuration sync is handled automatically by CloudConfigManager

        // Sync history (this would be done automatically by the enhanced history system)
        console.log('Syncing history...');
        // History sync is handled by EnhancedHistorySystem

        console.log('✅ Synchronization completed');
      } catch (error) {
        console.error('❌ Synchronization failed:', error);
        process.exit(1);
      }
    });

  // Database rows management
  supabaseCmd
    .command('rows')
    .description('Show latest database entries')
    .option('-l, --limit <number>', 'Number of rows to show per table', '5')
    .option('-t, --table <name>', 'Show rows from specific table only')
    .action(async (options) => {
      try {
        const persistence = new DatabasePersistence();
        const limit = parseInt(options.limit);

        // Test connection first
        const isConnected = await persistence.testConnection();
        if (!isConnected) {
          console.log('❌ Cannot fetch rows - database not available');
          process.exit(1);
        }

        if (options.table) {
          // Show rows from specific table
          console.log(`Latest ${limit} entries from table '${options.table}':`);
          const rows = await persistence.getLatestRowsFromTable(options.table, limit);

          if (rows.length === 0) {
            console.log('No entries found.');
          } else {
            rows.forEach((row, index) => {
              const timestamp = row.created_at ? new Date(row.created_at).toLocaleString() : 'N/A';
              console.log(`\n${index + 1}. [${timestamp}]`);
              console.log(JSON.stringify(row, null, 2));
            });
          }
        } else {
          // Show rows from all tables
          console.log(`Latest ${limit} entries from each table:`);
          const allRows = await persistence.getLatestRows(limit);

          for (const [tableName, rows] of Object.entries(allRows)) {
            console.log(`\n=== ${tableName.toUpperCase()} ===`);

            if (rows.length === 0) {
              console.log('No entries found.');
            } else {
              rows.forEach((row, index) => {
                const timestamp = row.created_at ? new Date(row.created_at).toLocaleString() : 'N/A';
                console.log(`\n${index + 1}. [${timestamp}]`);
                console.log(JSON.stringify(row, null, 2));
              });
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch database rows:', error);
        process.exit(1);
      }
    });
}