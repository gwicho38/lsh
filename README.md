# LSH - Enhanced Shell with Job Management

`lsh` is an extensible CLI shell with advanced job management, CI/CD integration, and persistent daemon for reliable job execution. Built with TypeScript, it provides POSIX-compatible shell features with modern enhancements for automation and pipeline orchestration.

## Features

### Core Shell Features
- **POSIX Shell Compatibility** - Standard shell syntax and builtins
- **ZSH-Compatible Features** - Extended globbing, parameter expansion, associative arrays
- **Interactive Terminal UI** - Built with React/Ink for rich terminal experiences
- **Command History** - Persistent history with search and replay
- **Tab Completion** - Intelligent completion system

### Job Management
- **Persistent Job Daemon** - Background daemon for reliable job execution
- **Cron-Style Scheduling** - Schedule jobs with cron expressions
- **Job Control** - Start, stop, monitor, and manage background jobs
- **Job Registry** - Centralized job tracking and persistence

### CI/CD Integration
- **Webhook Receiver** - GitHub, GitLab, and Jenkins webhook support
- **Pipeline Orchestration** - Workflow engine for complex pipelines
- **Build Analytics** - Track build metrics and performance
- **Cache Management** - Intelligent caching for faster builds

### Security
- **Command Validation** - Prevents command injection attacks
- **Environment Variable Validation** - Validates configuration at startup
- **Webhook Signature Verification** - HMAC verification for webhooks
- **Secure Defaults** - Fail-safe configuration in production

### API & Integration
- **RESTful API** - HTTP API for job control and monitoring
- **JWT Authentication** - Secure API access with token-based auth
- **ML Pipeline Support** - Integration with machine learning workflows
- **Database Persistence** - PostgreSQL/Supabase for data storage

## Installation

### Prerequisites
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- PostgreSQL (optional, for persistence features)
- Redis (optional, for caching)

### Quick Start

**Install from npm (Recommended):**

```bash
npm install -g lsh
```

**Or use the install script:**

```bash
curl -fsSL https://raw.githubusercontent.com/lefv/lsh/main/scripts/install.sh | bash
```

**Verify installation:**

```bash
lsh --version
lsh --help
```

### From Source

```bash
# Clone the repository
git clone https://github.com/lefv/lsh.git
cd lsh

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link globally (optional)
npm link

# Run
lsh
```

## Quick Start

### Interactive Shell

```bash
# Start interactive shell
lsh

# Execute commands
lsh> ls -la
lsh> echo "Hello, LSH!"
lsh> cd /tmp && pwd
```

### Daemon Mode

```bash
# Start the persistent daemon
lsh daemon start

# Check daemon status
lsh daemon status

# Stop the daemon
lsh daemon stop
```

### Job Management

```bash
# Add a scheduled job (runs every day at midnight)
lsh cron add --name "daily-backup" --schedule "0 0 * * *" --command "backup.sh"

# List all jobs
lsh cron list

# Trigger a job manually
lsh cron trigger daily-backup

# Remove a job
lsh cron remove daily-backup
```

### API Server

```bash
# Start API server
lsh api start --port 3030

# With authentication
LSH_API_KEY=your_secret_key lsh api start
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Core Configuration
NODE_ENV=development                    # Environment mode
LSH_API_ENABLED=true                    # Enable API server
LSH_API_PORT=3030                       # API server port

# Security (REQUIRED in production)
LSH_API_KEY=<generate-32-char-key>      # API authentication key
LSH_JWT_SECRET=<generate-32-char-secret> # JWT signing secret
LSH_ALLOW_DANGEROUS_COMMANDS=false      # Allow risky commands (use with caution)

# Webhooks
LSH_ENABLE_WEBHOOKS=true                # Enable webhook receiver
WEBHOOK_PORT=3033                       # Webhook receiver port
GITHUB_WEBHOOK_SECRET=<your-secret>     # GitHub webhook secret
GITLAB_WEBHOOK_SECRET=<your-secret>     # GitLab webhook secret
JENKINS_WEBHOOK_SECRET=<your-secret>    # Jenkins webhook secret

# Database (Optional)
DATABASE_URL=postgresql://localhost:5432/cicd
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>

# Caching (Optional)
REDIS_URL=redis://localhost:6379

# Monitoring
MONITORING_API_PORT=3031                # Monitoring API port
```

### Security Best Practices

**🔒 Production Deployment:**

1. **Always set secrets** - API keys and JWT secrets are mandatory in production
2. **Generate strong keys** - Use `openssl rand -hex 32` for secrets
3. **Enable webhook verification** - Set webhook secrets when using webhooks
4. **Review dangerous commands** - Keep `LSH_ALLOW_DANGEROUS_COMMANDS=false`
5. **Use environment variables** - Never commit `.env` to version control

**Environment Validation:**

LSH validates environment variables at startup and fails fast in production if:
- Required secrets are missing or too short
- Invalid URL formats
- Dangerous commands enabled in production

## Development

### Building

```bash
# Build TypeScript
npm run build

# Watch mode for development
npm run watch

# Type checking only
npm run typecheck
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Lint code
npm run lint

# Auto-fix lint issues
npm run lint:fix
```

**Current Test Coverage:** ~1.5% (baseline established, actively improving)

**Well-tested modules:**
- `command-validator.ts` - 100% coverage
- `env-validator.ts` - 74% coverage

### Electron App

```bash
# Run as desktop application
npm run electron

# Development mode
npm run electron-dev

# Access dashboards
npm run dashboard
```

## Architecture

### Core Components

- **`src/lib/shell-executor.ts`** - Main shell command executor
- **`src/lib/job-manager.ts`** - Job lifecycle management
- **`src/daemon/lshd.ts`** - Persistent background daemon
- **`src/daemon/api-server.ts`** - RESTful API server
- **`src/cicd/webhook-receiver.ts`** - CI/CD webhook integration

### Data Flow

```
User Command → Parser → AST → Executor → Output
                                ↓
                          Job Manager
                                ↓
                          Daemon (persistent)
                                ↓
                          Database/Redis
```

### Security Architecture

```
API Request → JWT Validation → Command Validation → Execution
Webhook → HMAC Verification → Event Processing → Job Trigger
Daemon Startup → Env Validation → Fail Fast if Invalid
```

## API Reference

### Authentication

```bash
# Include API key in header
curl -H "X-API-Key: your_api_key" http://localhost:3030/api/status
```

### Endpoints

**Job Management:**
- `GET /api/jobs` - List all jobs
- `POST /api/jobs` - Create a new job
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs/:id/trigger` - Trigger job execution
- `DELETE /api/jobs/:id` - Remove a job

**Daemon Control:**
- `GET /api/status` - Daemon status
- `GET /api/metrics` - System metrics

**Webhooks:**
- `POST /webhooks/github` - GitHub webhook endpoint
- `POST /webhooks/gitlab` - GitLab webhook endpoint
- `POST /webhooks/jenkins` - Jenkins webhook endpoint

## Troubleshooting

### Common Issues

**Daemon won't start:**
```bash
# Check if already running
ps aux | grep lshd

# Check PID file
cat /tmp/lsh-job-daemon-$USER.pid

# Remove stale PID file
rm /tmp/lsh-job-daemon-$USER.pid
```

**Tests failing:**
```bash
# Clear Jest cache
npm test -- --clearCache

# Check Node version
node --version  # Should be 18+
```

**Environment validation errors:**
```bash
# Check your .env file matches .env.example
cp .env.example .env
# Edit .env with your values

# Generate secrets
openssl rand -hex 32
```

**Lint errors:**
```bash
# Auto-fix what's possible
npm run lint:fix

# Check specific file
npx eslint src/your-file.ts
```

## Contributing

Contributions are welcome! Please:

1. **Fork the repository**
2. **Create a feature branch** - `git checkout -b feature/your-feature`
3. **Make your changes**
4. **Add tests** - Ensure tests pass with `npm test`
5. **Lint your code** - Run `npm run lint:fix`
6. **Commit your changes** - Follow conventional commit format
7. **Push to your fork** - `git push origin feature/your-feature`
8. **Create a Pull Request**

### Code Style

- Use TypeScript with proper types (avoid `any`)
- Prefix unused variables with `_` (e.g., `_unusedVar`)
- Add tests for new features
- Follow existing code structure
- Update documentation for user-facing changes

### Running in Development

```bash
# Terminal 1: Watch TypeScript compilation
npm run watch

# Terminal 2: Run tests in watch mode
npm test -- --watch

# Terminal 3: Run the shell
node dist/cli.js
```

## License

ISC

## Project Status

**Active Development** - This project is under active development. Features and APIs may change.

**Current Focus:**
- Improving test coverage (target: 70%)
- Reducing lint errors
- Adding comprehensive documentation
- Refactoring large modules

## Credits

- [awesome-micro-npm](https://github.com/parro-it/awesome-micro-npm-packages)

## Support

For issues, questions, or contributions:
- **Issues**: https://github.com/gwicho38/lsh/issues
- **Discussions**: https://github.com/gwicho38/lsh/discussions
