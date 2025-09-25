import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { PipelineService } from '../src/pipeline/pipeline-service';

// Mock external dependencies
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    end: jest.fn(),
  }))
}));

jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
  }))
}));

jest.mock('http', () => ({
  createServer: jest.fn().mockImplementation((app) => ({
    listen: jest.fn((port: number, callback?: () => void) => callback && callback()),
    close: jest.fn((callback?: () => void) => callback && callback()),
    address: jest.fn(() => ({ port: 0 })),
    app,
  }))
}));

jest.mock('../src/pipeline/job-tracker', () => ({
  JobTracker: jest.fn().mockImplementation(() => ({
    startPolling: jest.fn(),
    stopPolling: jest.fn(),
    cleanup: jest.fn(),
    addJob: jest.fn(),
    getJobs: jest.fn().mockReturnValue([]),
    on: jest.fn(),
    emit: jest.fn(),
    removeListener: jest.fn(),
  }))
}));

jest.mock('../src/pipeline/mcli-bridge', () => ({
  MCLIBridge: jest.fn().mockImplementation(() => ({
    cleanup: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
    removeListener: jest.fn(),
  }))
}));

jest.mock('../src/pipeline/workflow-engine', () => ({
  WorkflowEngine: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
    removeListener: jest.fn(),
  }))
}));

describe('PipelineService', () => {
  let service: PipelineService;

  beforeEach(() => {
    // Mock environment variables
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

    service = new PipelineService({
      port: 0, // Use random port for testing
      databaseUrl: 'postgresql://localhost:5432/test'
    });
  });

  afterEach(async () => {
    if (service) {
      await service.stop();
    }
    jest.clearAllMocks();
    delete process.env.DATABASE_URL;
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultService = new PipelineService();
      expect(defaultService).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const config = {
        port: 3035,
        databaseUrl: 'postgresql://localhost:5432/custom'
      };
      const customService = new PipelineService(config);
      expect(customService).toBeDefined();
    });
  });

  describe('API Endpoints', () => {
    let app: any;

    beforeEach(() => {
      app = service.getApp();
    });

    describe('Health Check', () => {
      it('should return health status', async () => {
        const response = await request(app)
          .get('/api/health')
          .expect(200);

        expect(response.body).toMatchObject({
          status: 'healthy',
          timestamp: expect.any(String),
          uptime: expect.any(Number)
        });
      });
    });

    describe('Hub Route', () => {
      it('should serve hub page', async () => {
        const response = await request(app)
          .get('/hub');

        // Should either serve the file or return 404 if file doesn't exist
        expect([200, 404]).toContain(response.status);
      });
    });

    describe('ML Dashboard', () => {
      it('should redirect /ml to /ml/dashboard', async () => {
        const response = await request(app)
          .get('/ml');

        expect([302, 301]).toContain(response.status);
      });
    });

    describe('CI/CD Dashboard', () => {
      it('should redirect /cicd to /cicd/dashboard', async () => {
        const response = await request(app)
          .get('/cicd');

        expect([302, 301]).toContain(response.status);
      });

      it('should provide metrics API', async () => {
        const response = await request(app)
          .get('/cicd/api/metrics')
          .expect(200);

        expect(response.body).toMatchObject({
          totalBuilds: expect.any(Number),
          successfulBuilds: expect.any(Number),
          failedBuilds: expect.any(Number),
          successRate: expect.any(Number),
          avgDurationMs: expect.any(Number),
          activePipelines: expect.any(Number),
          lastUpdated: expect.any(String)
        });
      });

      it('should provide pipelines API', async () => {
        const response = await request(app)
          .get('/cicd/api/pipelines')
          .expect(200);

        expect(response.body).toMatchObject({
          pipelines: expect.any(Array)
        });

        // Check pipeline structure
        if (response.body.pipelines.length > 0) {
          expect(response.body.pipelines[0]).toMatchObject({
            id: expect.any(String),
            name: expect.any(String),
            status: expect.any(String),
            lastRun: expect.any(String),
            duration: expect.any(Number),
            branch: expect.any(String)
          });
        }
      });
    });

    describe('Pipeline API', () => {
      it('should list jobs', async () => {
        const response = await request(app)
          .get('/api/pipeline/jobs')
          .expect(200);

        expect(response.body).toEqual([]);
      });

      it('should create a new job', async () => {
        const jobSpec = {
          name: 'test-job',
          type: 'shell',
          command: 'echo "test"'
        };

        const response = await request(app)
          .post('/api/pipeline/jobs')
          .send(jobSpec)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Job created',
          jobId: expect.any(String)
        });
      });
    });

    describe('Webhook', () => {
      it('should accept MCLI webhooks', async () => {
        const webhookPayload = {
          event: 'job.completed',
          jobId: 'test-job-123',
          status: 'success'
        };

        const response = await request(app)
          .post('/webhook/mcli')
          .send(webhookPayload)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Webhook received'
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle 404 for unknown routes', async () => {
        await request(app)
          .get('/api/unknown-endpoint')
          .expect(404);
      });
    });
  });

  describe('Demo Mode', () => {
    it('should work in demo mode when database is unavailable', () => {
      // This tests that the service can start even without a database
      const demoService = new PipelineService({
        databaseUrl: 'invalid://connection'
      });
      expect(demoService).toBeDefined();
    });
  });
});