/**
 * Mock DatabasePersistence for testing without actual database
 */

export interface MockJobData {
  job_id: string;
  command: string;
  status: string;
  output?: string;
  started_at: string;
  completed_at?: string;
  working_directory?: string;
}

export class MockDatabasePersistence {
  private storage: Map<string, MockJobData> = new Map();
  private saveCallCount = 0;
  private getCallCount = 0;

  async saveJob(job: MockJobData): Promise<void> {
    this.saveCallCount++;
    this.storage.set(job.job_id, { ...job });
  }

  async getActiveJobs(): Promise<MockJobData[]> {
    this.getCallCount++;
    return Array.from(this.storage.values());
  }

  async getJob(jobId: string): Promise<MockJobData | null> {
    this.getCallCount++;
    return this.storage.get(jobId) || null;
  }

  // Test helpers
  reset(): void {
    this.storage.clear();
    this.saveCallCount = 0;
    this.getCallCount = 0;
  }

  getSaveCallCount(): number {
    return this.saveCallCount;
  }

  getGetCallCount(): number {
    return this.getCallCount;
  }

  getStorageSize(): number {
    return this.storage.size;
  }

  hasJob(jobId: string): boolean {
    return this.storage.has(jobId);
  }

  getAllJobs(): MockJobData[] {
    return Array.from(this.storage.values());
  }
}

export default MockDatabasePersistence;
