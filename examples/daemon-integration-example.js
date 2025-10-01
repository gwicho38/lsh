#!/usr/bin/env node

/**
 * LSH Daemon Integration Example
 * Demonstrates how to create and manage database-backed cron jobs
 */

import CronJobManager from '../src/lib/cron-job-manager.js';

async function demonstrateDaemonIntegration() {
  console.log('🚀 LSH Daemon Integration Demo\n');

  // 1. Initialize the cron job manager
  console.log('1. Initializing Cron Job Manager...');
  const manager = new CronJobManager('demo-user');
  
  // Check if daemon is running
  if (!manager.isDaemonRunning()) {
    console.log('❌ Daemon is not running. Please start it with: lsh daemon start');
    return;
  }

  // Connect to daemon
  const connected = await manager.connect();
  if (!connected) {
    console.log('❌ Failed to connect to daemon');
    return;
  }
  console.log('✅ Connected to daemon\n');

  // 2. List available templates
  console.log('2. Available Job Templates:');
  const templates = manager.listTemplates();
  templates.forEach(template => {
    console.log(`  - ${template.id}: ${template.name}`);
    console.log(`    Schedule: ${template.schedule}`);
    console.log(`    Category: ${template.category}`);
  });
  console.log('');

  // 3. Create a job from template
  console.log('3. Creating job from template...');
  try {
    const job = await manager.createJobFromTemplate('database-backup', {
      name: 'Demo Database Backup',
      command: 'echo "Backup completed at $(date)" > /tmp/demo_backup.log',
      workingDirectory: '/tmp',
    });
    console.log(`✅ Job created: ${job.id}`);
    console.log(`   Name: ${job.name}`);
    console.log(`   Command: ${job.command}`);
    console.log(`   Schedule: ${job.schedule.cron}`);
  } catch (error) {
    console.log(`❌ Failed to create job: ${error.message}`);
  }
  console.log('');

  // 4. Create a custom job
  console.log('4. Creating custom job...');
  try {
    const customJob = await manager.createCustomJob({
      id: `custom_job_${Date.now()}`,
      name: 'Custom Demo Job',
      description: 'A custom job for demonstration',
      command: 'echo "Custom job executed at $(date)" && sleep 5',
      schedule: {
        cron: '*/2 * * * *', // Every 2 minutes
      },
      workingDirectory: '/tmp',
      priority: 5,
      tags: ['demo', 'custom'],
      maxRetries: 2,
      timeout: 30000, // 30 seconds
    });
    console.log(`✅ Custom job created: ${customJob.id}`);
  } catch (error) {
    console.log(`❌ Failed to create custom job: ${error.message}`);
  }
  console.log('');

  // 5. List all jobs
  console.log('5. Listing all jobs...');
  try {
    const jobs = await manager.listJobs();
    console.log(`📋 Found ${jobs.length} jobs:`);
    jobs.forEach(job => {
      const schedule = job.schedule?.cron || `${job.schedule?.interval}ms interval`;
      console.log(`  ${job.id}: ${job.name}`);
      console.log(`    Status: ${job.status}`);
      console.log(`    Schedule: ${schedule}`);
      console.log(`    Priority: ${job.priority}`);
    });
  } catch (error) {
    console.log(`❌ Failed to list jobs: ${error.message}`);
  }
  console.log('');

  // 6. Get daemon status
  console.log('6. Daemon Status:');
  try {
    const status = await manager.getDaemonStatus();
    console.log(`  PID: ${status.pid}`);
    console.log(`  Uptime: ${Math.floor(status.uptime / 60)} minutes`);
    console.log(`  Memory: ${Math.round(status.memoryUsage.heapUsed / 1024 / 1024)} MB`);
    console.log(`  Jobs: ${status.jobs.total} total, ${status.jobs.running} running`);
  } catch (error) {
    console.log(`❌ Failed to get daemon status: ${error.message}`);
  }
  console.log('');

  // 7. Generate comprehensive report
  console.log('7. Generating comprehensive report...');
  try {
    const report = await manager.generateComprehensiveReport();
    console.log(report);
  } catch (error) {
    console.log(`❌ Failed to generate report: ${error.message}`);
  }

  // 8. Cleanup
  console.log('\n8. Cleanup...');
  manager.disconnect();
  console.log('✅ Disconnected from daemon');

  console.log('\n🎉 Daemon integration demo completed!');
  console.log('\nNext steps:');
  console.log('1. Start the daemon: lsh daemon start');
  console.log('2. Create jobs: lsh cron create-from-template database-backup');
  console.log('3. Monitor jobs: lsh cron list');
  console.log('4. View reports: lsh cron comprehensive-report');
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateDaemonIntegration().catch(console.error);
}

export default demonstrateDaemonIntegration;