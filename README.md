# LSH - Enhanced Shell with Job Management

`lsh` is an extensible CLI shell with advanced job management, CI/CD integration, and persistent daemon for reliable job execution.

## Quick Start

```bash
npm install
npm run build
lsh  # Start interactive shell
```

## Features

- ZSH-compatible features
- Persistent job daemon
- CI/CD webhook integration (GitHub, GitLab, Jenkins)
- ML pipeline support
- RESTful API for job control
- Interactive terminal UI

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Required in production
LSH_API_KEY=your_secret_key
LSH_JWT_SECRET=your_jwt_secret
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Optional
DATABASE_URL=postgresql://localhost:5432/cicd
REDIS_URL=redis://localhost:6379
```

⚠️ **Security**: Webhook secrets are mandatory in production. Never commit `.env` to version control.

## Usage

```bash
# Interactive shell
lsh

# Execute command
lsh -c "ls -la"

# Start daemon
lsh daemon start

# Start API server
lsh api start --port 3030
```

## Development

```bash
npm test              # Run tests
npm run build         # Build TypeScript
npm run lint          # Lint code
```

## Contributors

lsh is a work in progress. All contributions, cleanup, and feedback are welcome.

## Reference

- [awesome-micro-npm](https://github.com/parro-it/awesome-micro-npm-packages)