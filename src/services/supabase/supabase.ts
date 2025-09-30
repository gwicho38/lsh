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
    .action(async (_options) => {
      try {
        console.log('Synchronizing data with Supabase...');

        const _configManager = new CloudConfigManager();
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

  // ML Training Jobs management
  supabaseCmd
    .command('ml-train')
    .description('Manage ML training jobs')
    .option('-l, --list', 'List training jobs')
    .option('-s, --status <status>', 'Filter by status (pending, running, completed, failed)')
    .option('-c, --create <name>', 'Create new training job')
    .option('--model-type <type>', 'Model type for new job')
    .option('--dataset <name>', 'Dataset name for new job')
    .action(async (options) => {
      try {
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
            console.error('❌ Failed to fetch training jobs:', error);
            process.exit(1);
          }

          console.log(`Training Jobs (${jobs?.length || 0}):`);
          jobs?.forEach(job => {
            const created = new Date(job.created_at).toLocaleString();
            console.log(`\n${job.job_name} (${job.model_type})`);
            console.log(`  Status: ${job.status}`);
            console.log(`  Dataset: ${job.dataset_name}`);
            if (job.test_rmse) {
              console.log(`  Test RMSE: ${job.test_rmse.toFixed(4)}`);
              console.log(`  Test MAE: ${job.test_mae.toFixed(4)}`);
              console.log(`  Test R²: ${job.test_r2.toFixed(4)}`);
            }
            console.log(`  Created: ${created}`);
          });
        } else if (options.create) {
          if (!options.modelType || !options.dataset) {
            console.error('❌ --model-type and --dataset are required for creating jobs');
            process.exit(1);
          }

          const newJob = {
            job_name: options.create,
            model_type: options.modelType,
            dataset_name: options.dataset,
            status: 'pending',
            hyperparameters: {},
            feature_names: [],
            target_variable: 'target'
          };

          const { data, error } = await supabaseClient.getClient()
            .from('ml_training_jobs')
            .insert(newJob)
            .select()
            .single();

          if (error) {
            console.error('❌ Failed to create training job:', error);
            process.exit(1);
          }

          console.log('✅ Training job created:');
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log('Use --list or --create to manage training jobs');
        }
      } catch (error) {
        console.error('❌ ML training job management failed:', error);
        process.exit(1);
      }
    });

  // ML Model Versions management
  supabaseCmd
    .command('ml-models')
    .description('Manage ML model versions')
    .option('-l, --list', 'List model versions')
    .option('-c, --compare', 'Compare model performance')
    .option('-d, --deploy <id>', 'Deploy a model version')
    .option('--top <n>', 'Show top N models by performance', '10')
    .action(async (options) => {
      try {
        if (options.list || options.compare) {
          const { data: models, error } = await supabaseClient.getClient()
            .from('ml_model_versions')
            .select('*')
            .order('test_r2', { ascending: false })
            .limit(parseInt(options.top));

          if (error) {
            console.error('❌ Failed to fetch models:', error);
            process.exit(1);
          }

          console.log(`\nTop ${models?.length || 0} Models by R² Score:`);
          console.log('='.repeat(80));

          models?.forEach((model, index) => {
            console.log(`\n${index + 1}. ${model.model_name} v${model.version} (${model.model_type})`);
            console.log(`   RMSE: ${model.test_rmse.toFixed(4)} | MAE: ${model.test_mae.toFixed(4)} | R²: ${model.test_r2.toFixed(4)}`);
            if (model.test_mape) {
              console.log(`   MAPE: ${model.test_mape.toFixed(2)}%`);
            }
            console.log(`   Deployed: ${model.is_deployed ? '✅ Yes' : '❌ No'}`);
            console.log(`   Path: ${model.model_path}`);

            if (model.feature_importance) {
              const topFeatures = Object.entries(model.feature_importance)
                .sort((a: any, b: any) => b[1] - a[1])
                .slice(0, 5);
              console.log(`   Top Features: ${topFeatures.map(([name, imp]) => `${name}(${(imp as number).toFixed(3)})`).join(', ')}`);
            }
          });

          if (options.compare && models && models.length > 1) {
            console.log('\n\nModel Comparison Summary:');
            console.log('='.repeat(80));
            console.log(`Best by RMSE: ${models[0].model_name} v${models[0].version} (${models[0].test_rmse.toFixed(4)})`);

            const sortedByR2 = [...models].sort((a, b) => b.test_r2 - a.test_r2);
            console.log(`Best by R²: ${sortedByR2[0].model_name} v${sortedByR2[0].version} (${sortedByR2[0].test_r2.toFixed(4)})`);

            const sortedByMAE = [...models].sort((a, b) => a.test_mae - b.test_mae);
            console.log(`Best by MAE: ${sortedByMAE[0].model_name} v${sortedByMAE[0].version} (${sortedByMAE[0].test_mae.toFixed(4)})`);
          }
        } else if (options.deploy) {
          const { data, error } = await supabaseClient.getClient()
            .from('ml_model_versions')
            .update({
              is_deployed: true,
              deployed_at: new Date().toISOString()
            })
            .eq('id', options.deploy)
            .select()
            .single();

          if (error) {
            console.error('❌ Failed to deploy model:', error);
            process.exit(1);
          }

          console.log(`✅ Model ${data.model_name} v${data.version} deployed successfully`);
        } else {
          console.log('Use --list, --compare, or --deploy to manage models');
        }
      } catch (error) {
        console.error('❌ ML model management failed:', error);
        process.exit(1);
      }
    });

  // ML Feature Sets management
  supabaseCmd
    .command('ml-features')
    .description('Manage ML feature sets')
    .option('-l, --list', 'List feature sets')
    .option('-d, --details <name>', 'Show feature set details')
    .action(async (options) => {
      try {
        if (options.list) {
          const { data: featureSets, error } = await supabaseClient.getClient()
            .from('ml_feature_sets')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('❌ Failed to fetch feature sets:', error);
            process.exit(1);
          }

          console.log(`Feature Sets (${featureSets?.length || 0}):`);
          featureSets?.forEach(fs => {
            console.log(`\n${fs.feature_set_name} v${fs.version}`);
            console.log(`  Features: ${fs.feature_count}`);
            console.log(`  Used in: ${fs.used_in_models?.length || 0} models`);
            if (fs.description) {
              console.log(`  Description: ${fs.description}`);
            }
          });
        } else if (options.details) {
          const { data: fs, error } = await supabaseClient.getClient()
            .from('ml_feature_sets')
            .select('*')
            .eq('feature_set_name', options.details)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (error) {
            console.error('❌ Failed to fetch feature set details:', error);
            process.exit(1);
          }

          console.log(`\nFeature Set: ${fs.feature_set_name} v${fs.version}`);
          console.log('='.repeat(80));
          console.log(`\nFeatures (${fs.feature_count}):`);

          fs.features.forEach((feature: any, index: number) => {
            console.log(`  ${index + 1}. ${feature.name} (${feature.type})`);
            if (feature.params) {
              console.log(`     Params: ${JSON.stringify(feature.params)}`);
            }
            if (feature.importance) {
              console.log(`     Importance: ${feature.importance.toFixed(4)}`);
            }
          });

          if (fs.correlation_with_target) {
            console.log(`\nTop Correlations with Target:`);
            const topCorr = Object.entries(fs.correlation_with_target)
              .sort((a: any, b: any) => Math.abs(b[1]) - Math.abs(a[1]))
              .slice(0, 10);
            topCorr.forEach(([name, corr]: [string, any]) => {
              console.log(`  ${name}: ${corr.toFixed(4)}`);
            });
          }
        } else {
          console.log('Use --list or --details to manage feature sets');
        }
      } catch (error) {
        console.error('❌ ML feature set management failed:', error);
        process.exit(1);
      }
    });
}