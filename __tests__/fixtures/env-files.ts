/**
 * Test fixtures for .env file testing
 */

export const sampleEnvFile = `# Database
DATABASE_URL=postgresql://localhost/mydb
DB_PASSWORD=secret123

# API Keys
API_KEY=abc123xyz
STRIPE_KEY=sk_test_123

# Application
NODE_ENV=development
PORT=3000
`;

export const envWithQuotes = `MESSAGE="Hello, World!"
PATH_WITH_SPACES="/path/with spaces/file.txt"
SINGLE_QUOTED='Single quoted value'
`;

export const envWithComments = `# This is a comment
KEY1=value1
# Another comment
KEY2=value2
  # Indented comment
KEY3=value3
`;

export const envWithSpecialChars = `DATABASE_URL=postgresql://user:p@ssw0rd!@localhost:5432/db
URL_WITH_QUERY=https://api.example.com/v1?key=value&token=abc123
JSON_VALUE={"key":"value","nested":{"data":true}}
`;

export const envWithEmptyLines = `KEY1=value1


KEY2=value2

KEY3=value3
`;

export const envMinimal = `API_KEY=test123
DEBUG=true
`;

export const envProduction = `# Production Environment
NODE_ENV=production
DATABASE_URL=postgresql://prod-server/prod-db
API_KEY=prod_abc123xyz
STRIPE_KEY=sk_live_real_key_here
`;

export const envStaging = `# Staging Environment
NODE_ENV=staging
DATABASE_URL=postgresql://staging-server/staging-db
API_KEY=staging_abc123xyz
STRIPE_KEY=sk_test_staging_key
`;

export const envDevelopment = `# Development Environment
NODE_ENV=development
DATABASE_URL=postgresql://localhost/dev-db
API_KEY=dev_abc123xyz
STRIPE_KEY=sk_test_dev_key
DEBUG=true
`;
