#!/usr/bin/env node

// Test script to verify the circular reference fix
import { CronJobManager } from './dist/lib/cron-job-manager.js';

async function testJobReports() {
  console.log('Testing job reports with fixed CronJobManager...');

  try {
    const manager = new CronJobManager(process.env.USER || 'testuser');
    await manager.connect();

    console.log('Connected to daemon successfully');

    // Test job listing
    const jobs = await manager.listJobs();
    console.log(`✅ Job listing works: Found ${jobs.length} jobs`);

    // Test job reports
    const reports = await manager.getAllJobReports();
    console.log(`✅ Job reports work: Generated ${reports.length} reports`);

    if (reports.length > 0) {
      console.log('Sample report:', {
        jobId: reports[0].jobId,
        executions: reports[0].executions,
        successRate: reports[0].successRate
      });
    }

    manager.disconnect();
    console.log('✅ All tests passed - circular reference issue is fixed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testJobReports();