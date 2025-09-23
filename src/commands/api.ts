/**
 * API Server Commands for LSH
 */

import { Command } from 'commander';
import chalk from 'chalk';
import crypto from 'crypto';
import DaemonClient from '../lib/daemon-client.js';

export function registerApiCommands(program: Command) {
  const api = program
    .command('api')
    .description('API server management and configuration');

  // Start daemon with API server enabled
  api
    .command('start')
    .description('Start daemon with API server enabled')
    .option('-p, --port <port>', 'API port', '3030')
    .option('-k, --api-key <key>', 'API key (generated if not provided)')
    .option('--webhooks', 'Enable webhook support', false)
    .action(async (options) => {
      try {
        const apiKey = options.apiKey || crypto.randomBytes(32).toString('hex');
        const daemonClient = new DaemonClient();

        // Check if daemon is already running
        if (daemonClient.isDaemonRunning()) {
          console.log(chalk.yellow('⚠️  Daemon is already running. Restarting with API enabled...'));

          // Stop existing daemon
          await daemonClient.connect();
          await daemonClient.stopDaemon();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Write API configuration to environment or a config file
        process.env.LSH_API_ENABLED = 'true';
        process.env.LSH_API_PORT = options.port;
        process.env.LSH_API_KEY = apiKey;
        process.env.LSH_ENABLE_WEBHOOKS = options.webhooks ? 'true' : 'false';

        // Restart the daemon which will pick up the environment variables
        await daemonClient.restartDaemon();

        console.log(chalk.green('✅ Daemon started with API server'));
        console.log(chalk.blue(`\n📡 API Server: http://localhost:${options.port}`));
        console.log(chalk.yellow(`🔑 API Key: ${apiKey}`));
        console.log(chalk.gray('\nStore this API key securely. You will need it to authenticate API requests.'));
        console.log(chalk.gray(`\nExample usage:`));
        console.log(chalk.gray(`  curl -H "X-API-Key: ${apiKey}" http://localhost:${options.port}/api/status`));

      } catch (error: any) {
        console.error(chalk.red(`❌ Failed to start API server: ${error.message}`));
        process.exit(1);
      }
    });

  // Generate API key
  api
    .command('key')
    .description('Generate a new API key')
    .action(() => {
      const apiKey = crypto.randomBytes(32).toString('hex');
      console.log(chalk.green('🔑 Generated API Key:'));
      console.log(apiKey);
      console.log(chalk.gray('\nSet this as LSH_API_KEY environment variable:'));
      console.log(chalk.gray(`  export LSH_API_KEY="${apiKey}"`));
    });

  // Test API connection
  api
    .command('test')
    .description('Test API server connection')
    .option('-p, --port <port>', 'API port', '3030')
    .option('-k, --api-key <key>', 'API key')
    .action(async (options) => {
      try {
        const apiKey = options.apiKey || process.env.LSH_API_KEY;
        if (!apiKey) {
          console.error(chalk.red('❌ API key required. Use --api-key or set LSH_API_KEY environment variable'));
          process.exit(1);
        }

        const response = await fetch(`http://localhost:${options.port}/api/status`, {
          headers: {
            'X-API-Key': apiKey
          }
        });

        if (response.ok) {
          const status = await response.json();
          console.log(chalk.green('✅ API server is running'));
          console.log('Status:', JSON.stringify(status, null, 2));
        } else {
          console.error(chalk.red(`❌ API server returned ${response.status}: ${response.statusText}`));
        }
      } catch (error: any) {
        console.error(chalk.red(`❌ Failed to connect to API server: ${error.message}`));
        console.log(chalk.yellow('Make sure the daemon is running with API enabled:'));
        console.log(chalk.gray('  lsh api start'));
      }
    });

  // Configure webhooks
  api
    .command('webhook')
    .description('Configure webhook endpoints')
    .argument('<action>', 'Action: add, list, remove')
    .argument('[endpoint]', 'Webhook endpoint URL')
    .option('-p, --port <port>', 'API port', '3030')
    .option('-k, --api-key <key>', 'API key')
    .action(async (action, endpoint, options) => {
      try {
        const apiKey = options.apiKey || process.env.LSH_API_KEY;
        if (!apiKey) {
          console.error(chalk.red('❌ API key required'));
          process.exit(1);
        }

        const baseUrl = `http://localhost:${options.port}`;

        switch (action) {
          case 'add':
            if (!endpoint) {
              console.error(chalk.red('❌ Endpoint URL required'));
              process.exit(1);
            }

            const addResponse = await fetch(`${baseUrl}/api/webhooks`, {
              method: 'POST',
              headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ endpoint })
            });

            if (addResponse.ok) {
              const result = await addResponse.json();
              console.log(chalk.green('✅ Webhook added successfully'));
              console.log('Endpoints:', result.endpoints);
            } else {
              console.error(chalk.red('❌ Failed to add webhook'));
            }
            break;

          case 'list':
            const listResponse = await fetch(`${baseUrl}/api/webhooks`, {
              headers: { 'X-API-Key': apiKey }
            });

            if (listResponse.ok) {
              const webhooks = await listResponse.json();
              console.log(chalk.blue('📮 Webhook Configuration:'));
              console.log(`Enabled: ${webhooks.enabled}`);
              console.log('Endpoints:', webhooks.endpoints);
            }
            break;

          default:
            console.error(chalk.red(`❌ Unknown action: ${action}`));
            console.log('Valid actions: add, list, remove');
        }
      } catch (error: any) {
        console.error(chalk.red(`❌ Failed: ${error.message}`));
      }
    });

  // Example client code generator
  api
    .command('example')
    .description('Generate example client code')
    .option('-l, --language <lang>', 'Language (js, python, curl)', 'js')
    .option('-p, --port <port>', 'API port', '3030')
    .action((options) => {
      const apiKey = process.env.LSH_API_KEY || 'YOUR_API_KEY';

      switch (options.language) {
        case 'js':
          console.log(chalk.blue('// JavaScript Example Client\n'));
          console.log(`const LSHClient = {
  baseURL: 'http://localhost:${options.port}',
  apiKey: '${apiKey}',

  async request(path, options = {}) {
    const response = await fetch(\`\${this.baseURL}\${path}\`, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(\`API error: \${response.statusText}\`);
    }

    return response.json();
  },

  // Get daemon status
  async getStatus() {
    return this.request('/api/status');
  },

  // List all jobs
  async listJobs() {
    return this.request('/api/jobs');
  },

  // Create a new job
  async createJob(jobSpec) {
    return this.request('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(jobSpec)
    });
  },

  // Trigger job execution
  async triggerJob(jobId) {
    return this.request(\`/api/jobs/\${jobId}/trigger\`, {
      method: 'POST'
    });
  },

  // Stream events using EventSource
  streamEvents() {
    const eventSource = new EventSource(\`\${this.baseURL}/api/events\`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Event:', data);
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
    };

    return eventSource;
  }
};

// Example usage
(async () => {
  try {
    const status = await LSHClient.getStatus();
    console.log('Daemon status:', status);

    // Create a job
    const job = await LSHClient.createJob({
      name: 'Example Job',
      command: 'echo "Hello from API"',
      type: 'shell'
    });
    console.log('Created job:', job);

    // Trigger the job
    const result = await LSHClient.triggerJob(job.id);
    console.log('Job result:', result);

  } catch (error) {
    console.error('Error:', error);
  }
})();`);
          break;

        case 'python':
          console.log(chalk.blue('# Python Example Client\n'));
          console.log(`import requests
import json
from typing import Dict, Any, Optional

class LSHClient:
    def __init__(self, base_url: str = "http://localhost:${options.port}", api_key: str = "${apiKey}"):
        self.base_url = base_url
        self.api_key = api_key
        self.headers = {
            "X-API-Key": api_key,
            "Content-Type": "application/json"
        }

    def request(self, method: str, path: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make an API request"""
        url = f"{self.base_url}{path}"
        response = requests.request(method, url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()

    def get_status(self) -> Dict[str, Any]:
        """Get daemon status"""
        return self.request("GET", "/api/status")

    def list_jobs(self) -> list:
        """List all jobs"""
        return self.request("GET", "/api/jobs")

    def create_job(self, job_spec: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new job"""
        return self.request("POST", "/api/jobs", job_spec)

    def trigger_job(self, job_id: str) -> Dict[str, Any]:
        """Trigger job execution"""
        return self.request("POST", f"/api/jobs/{job_id}/trigger")

# Example usage
if __name__ == "__main__":
    client = LSHClient()

    # Get status
    status = client.get_status()
    print(f"Daemon status: {json.dumps(status, indent=2)}")

    # Create a job
    job = client.create_job({
        "name": "Example Job",
        "command": "echo 'Hello from Python'",
        "type": "shell"
    })
    print(f"Created job: {job}")

    # Trigger the job
    result = client.trigger_job(job["id"])
    print(f"Job result: {result}")`);
          break;

        case 'curl':
          console.log(chalk.blue('# cURL Examples\n'));
          console.log(`# Get daemon status
curl -H "X-API-Key: ${apiKey}" \\
  http://localhost:${options.port}/api/status

# List all jobs
curl -H "X-API-Key: ${apiKey}" \\
  http://localhost:${options.port}/api/jobs

# Create a new job
curl -X POST \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Example Job",
    "command": "echo Hello World",
    "type": "shell"
  }' \\
  http://localhost:${options.port}/api/jobs

# Trigger a job
curl -X POST \\
  -H "X-API-Key: ${apiKey}" \\
  http://localhost:${options.port}/api/jobs/JOB_ID/trigger

# Stream events
curl -H "X-API-Key: ${apiKey}" \\
  -H "Accept: text/event-stream" \\
  http://localhost:${options.port}/api/events`);
          break;
      }
    });
}

export default registerApiCommands;