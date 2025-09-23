import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { LSHApiServer } from '../src/daemon/api-server';
import { LSHJobDaemon } from '../src/daemon/lshd';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('../src/daemon/lshd');
jest.mock('fs');

describe('LSH API Server', () => {
  let apiServer: LSHApiServer;
  let mockDaemon: jest.Mocked<LSHJobDaemon>;
  let server: any;

  beforeEach(() => {
    // Create mock daemon
    mockDaemon = {
      getAllJobs: jest.fn(),
      getJob: jest.fn(),
      addJob: jest.fn(),
      updateJob: jest.fn(),
      removeJob: jest.fn(),
      runJob: jest.fn(),
      pauseJob: jest.fn(),
      resumeJob: jest.fn(),
      getStatus: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
    } as any;

    // Initialize API server
    apiServer = new LSHApiServer(mockDaemon, 0); // Use port 0 for random port
    server = apiServer.getApp();
  });

  afterEach(async () => {
    await apiServer.stop();
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should return healthy status without auth', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Authentication', () => {
    beforeEach(() => {
      process.env.LSH_API_KEY = 'test-api-key';
      apiServer = new LSHApiServer(mockDaemon, 0);
      server = apiServer.getApp();
    });

    afterEach(() => {
      delete process.env.LSH_API_KEY;
    });

    it('should reject requests without API key', async () => {
      await request(server)
        .get('/api/jobs')
        .expect(401)
        .expect({ error: 'Authentication required' });
    });

    it('should reject requests with invalid API key', async () => {
      await request(server)
        .get('/api/jobs')
        .set('Authorization', 'Bearer invalid-key')
        .expect(401)
        .expect({ error: 'Invalid API key' });
    });

    it('should accept requests with valid API key', async () => {
      mockDaemon.getAllJobs.mockReturnValue([]);

      await request(server)
        .get('/api/jobs')
        .set('Authorization', 'Bearer test-api-key')
        .expect(200)
        .expect([]);
    });
  });

  describe('Job Management', () => {
    beforeEach(() => {
      // No auth for these tests
      delete process.env.LSH_API_KEY;
    });

    describe('GET /api/jobs', () => {
      it('should list all jobs', async () => {
        const mockJobs = [
          { id: '1', name: 'job1', status: 'pending' },
          { id: '2', name: 'job2', status: 'running' }
        ];
        mockDaemon.getAllJobs.mockReturnValue(mockJobs);

        const response = await request(server)
          .get('/api/jobs')
          .expect(200);

        expect(response.body).toEqual(mockJobs);
      });

      it('should filter jobs by status', async () => {
        const allJobs = [
          { id: '1', name: 'job1', status: 'pending' },
          { id: '2', name: 'job2', status: 'running' },
          { id: '3', name: 'job3', status: 'completed' }
        ];
        mockDaemon.getAllJobs.mockReturnValue(allJobs);

        const response = await request(server)
          .get('/api/jobs?status=running')
          .expect(200);

        expect(response.body).toEqual([
          { id: '2', name: 'job2', status: 'running' }
        ]);
      });
    });

    describe('GET /api/jobs/:id', () => {
      it('should return job details', async () => {
        const mockJob = { id: '1', name: 'test-job', status: 'pending' };
        mockDaemon.getJob.mockReturnValue(mockJob);

        const response = await request(server)
          .get('/api/jobs/1')
          .expect(200);

        expect(response.body).toEqual(mockJob);
      });

      it('should return 404 for non-existent job', async () => {
        mockDaemon.getJob.mockReturnValue(undefined);

        await request(server)
          .get('/api/jobs/999')
          .expect(404)
          .expect({ error: 'Job not found' });
      });
    });

    describe('POST /api/jobs', () => {
      it('should create a new job', async () => {
        const jobSpec = {
          name: 'new-job',
          command: 'echo test',
          type: 'shell'
        };

        const createdJob = {
          id: 'job_123',
          ...jobSpec,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        mockDaemon.addJob.mockReturnValue(createdJob);

        const response = await request(server)
          .post('/api/jobs')
          .send(jobSpec)
          .expect(201);

        expect(response.body).toEqual(createdJob);
        expect(mockDaemon.addJob).toHaveBeenCalledWith(jobSpec);
      });

      it('should validate required fields', async () => {
        await request(server)
          .post('/api/jobs')
          .send({ name: 'test' }) // Missing command
          .expect(400)
          .expect({ error: 'Missing required fields' });
      });
    });

    describe('POST /api/jobs/:id/trigger', () => {
      it('should trigger job execution', async () => {
        const mockJob = { id: '1', name: 'test-job', status: 'pending' };
        mockDaemon.getJob.mockReturnValue(mockJob);
        mockDaemon.runJob.mockResolvedValue({ success: true });

        const response = await request(server)
          .post('/api/jobs/1/trigger')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Job triggered',
          jobId: '1'
        });
      });

      it('should handle job execution errors', async () => {
        mockDaemon.getJob.mockReturnValue({ id: '1' });
        mockDaemon.runJob.mockRejectedValue(new Error('Execution failed'));

        await request(server)
          .post('/api/jobs/1/trigger')
          .expect(500)
          .expect({ error: 'Failed to trigger job' });
      });
    });

    describe('DELETE /api/jobs/:id', () => {
      it('should remove a job', async () => {
        mockDaemon.getJob.mockReturnValue({ id: '1' });
        mockDaemon.removeJob.mockReturnValue(true);

        await request(server)
          .delete('/api/jobs/1')
          .expect(200)
          .expect({ success: true, message: 'Job removed' });
      });

      it('should handle force removal', async () => {
        mockDaemon.getJob.mockReturnValue({ id: '1' });
        mockDaemon.removeJob.mockReturnValue(true);

        await request(server)
          .delete('/api/jobs/1?force=true')
          .expect(200);

        expect(mockDaemon.removeJob).toHaveBeenCalledWith('1', true);
      });
    });
  });

  describe('Status Endpoint', () => {
    it('should return daemon status', async () => {
      const mockStatus = {
        isRunning: true,
        pid: 12345,
        uptime: 3600000,
        memoryUsage: process.memoryUsage(),
        jobCount: 5,
        activeJobs: 2
      };

      mockDaemon.getStatus.mockReturnValue(mockStatus);
      mockDaemon.getAllJobs.mockReturnValue(new Array(5));

      const response = await request(server)
        .get('/api/status')
        .expect(200);

      expect(response.body).toMatchObject({
        isRunning: true,
        pid: 12345,
        uptime: 3600000,
        jobCount: 5
      });
    });
  });

  describe('Webhook Management', () => {
    describe('POST /api/webhooks', () => {
      it('should add a webhook endpoint', async () => {
        const webhook = { url: 'http://example.com/webhook' };

        const response = await request(server)
          .post('/api/webhooks')
          .send(webhook)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Webhook added',
          endpoints: expect.arrayContaining(['http://example.com/webhook'])
        });
      });

      it('should validate webhook URL', async () => {
        await request(server)
          .post('/api/webhooks')
          .send({ url: 'not-a-url' })
          .expect(400)
          .expect({ error: 'Invalid webhook URL' });
      });
    });

    describe('GET /api/webhooks', () => {
      it('should list webhook endpoints', async () => {
        const response = await request(server)
          .get('/api/webhooks')
          .expect(200);

        expect(response.body).toMatchObject({
          enabled: expect.any(Boolean),
          endpoints: expect.any(Array)
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', async () => {
      mockDaemon.getAllJobs.mockImplementation(() => {
        throw new Error('Database error');
      });

      await request(server)
        .get('/api/jobs')
        .expect(500)
        .expect({ error: 'Internal server error' });
    });

    it('should handle 404 for unknown routes', async () => {
      await request(server)
        .get('/api/unknown')
        .expect(404);
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });
  });
});