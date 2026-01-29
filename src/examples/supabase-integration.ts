/**
 * Supabase Integration Example
 * Demonstrates how to use LSH with Supabase PostgreSQL
 */

import { supabaseClient } from '../lib/supabase-client.js';
import DatabasePersistence from '../lib/database-persistence.js';
import CloudConfigManager from '../lib/cloud-config-manager.js';
import EnhancedHistorySystem from '../lib/enhanced-history-system.js';


async function demonstrateSupabaseIntegration() {
  console.log('🚀 LSH Supabase Integration Demo\n');

  // 1. Test database connection
  console.log('1. Testing Supabase connection...');
  const isConnected = await supabaseClient.testConnection();
  if (!isConnected) {
    console.log('❌ Database connection failed');
    return;
  }
  console.log('✅ Database connection successful\n');

  // 2. Initialize database persistence
  console.log('2. Initializing database persistence...');
  const persistence = new DatabasePersistence('demo-user');
  console.log('✅ Database persistence initialized\n');

  // 3. Demonstrate configuration management
  console.log('3. Configuration management demo...');
  const configManager = new CloudConfigManager({
    userId: 'demo-user',
    enableCloudSync: true,
  });

  // Set some configuration values
  configManager.set('theme', 'dark', 'UI theme preference');
  configManager.set('max_history', 1000, 'Maximum history entries');
  configManager.set('auto_complete', true, 'Enable auto-completion');
  
  console.log('Configuration set:');
  configManager.getAll().forEach(config => {
    console.log(`  ${config.key}: ${JSON.stringify(config.value)}`);
  });
  console.log('✅ Configuration management working\n');

  // 4. Demonstrate history management
  console.log('4. History management demo...');
  const historySystem = new EnhancedHistorySystem({
    userId: 'demo-user',
    enableCloudSync: true,
  });

  // Add some sample commands
  historySystem.addCommand('ls -la', 0);
  historySystem.addCommand('cd /home/user', 0);
  historySystem.addCommand('git status', 0);
  historySystem.addCommand('npm install', 0);

  // Save to database
  const entries = historySystem.getAllEntries();
  for (const entry of entries) {
    await persistence.saveHistoryEntry({
      session_id: persistence.getSessionId(),
      command: entry.command,
      working_directory: '/home/user',
      exit_code: entry.exitCode,
      timestamp: new Date(entry.timestamp).toISOString(),
      hostname: 'demo-host',
    });
  }

  console.log(`Added ${entries.length} history entries`);
  console.log('✅ History management working\n');

  // 5. Demonstrate job management
  console.log('5. Job management demo...');
  await persistence.saveJob({
    session_id: persistence.getSessionId(),
    job_id: 'job_1',
    command: 'long-running-task',
    status: 'running',
    working_directory: '/home/user',
    started_at: new Date().toISOString(),
  });

  const activeJobs = await persistence.getActiveJobs();
  console.log(`Active jobs: ${activeJobs.length}`);
  activeJobs.forEach(job => {
    console.log(`  ${job.job_id}: ${job.command} (${job.status})`);
  });
  console.log('✅ Job management working\n');

  // 6. Demonstrate session management
  console.log('6. Session management demo...');
  await persistence.startSession('/home/user', {
    PATH: '/usr/bin:/bin',
    HOME: '/home/user',
    USER: 'demo-user',
  });

  console.log(`Session started: ${persistence.getSessionId()}`);
  console.log('✅ Session management working\n');

  // 7. Show statistics
  console.log('7. Statistics:');
  const historyStats = await historySystem.getHistoryStats();
  console.log('History stats:', historyStats);

  const configStats = configManager.getStats();
  console.log('Config stats:', configStats);

  // 8. Cleanup
  console.log('\n8. Cleanup...');
  await persistence.endSession();
  historySystem.destroy();
  configManager.destroy();
  console.log('✅ Cleanup completed');

  console.log('\n🎉 Supabase integration demo completed successfully!');
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateSupabaseIntegration().catch(console.error);
}

export default demonstrateSupabaseIntegration;