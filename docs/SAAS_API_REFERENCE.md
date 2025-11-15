# LSH SaaS API Reference

Base URL: `https://api.yourdomain.com/api/v1`

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Authentication

### Signup
```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": false
    },
    "message": "Verification email sent"
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "organizations": [ ... ],
    "currentOrganization": { ... },
    "token": {
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token",
      "expiresIn": 604800
    }
  }
}
```

### Verify Email
```http
POST /auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh-token"
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

## Organizations

### Create Organization
```http
POST /organizations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Company",
  "slug": "my-company"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "uuid",
      "name": "My Company",
      "slug": "my-company",
      "subscriptionTier": "free",
      "subscriptionStatus": "active",
      "createdAt": "2025-11-15T..."
    }
  }
}
```

### Get Organization
```http
GET /organizations/:organizationId
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "organization": { ... },
    "usage": {
      "memberCount": 3,
      "teamCount": 2,
      "secretCount": 45,
      "environmentCount": 3
    }
  }
}
```

### Get Organization Members
```http
GET /organizations/:organizationId/members
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "uuid",
        "userId": "uuid",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "owner",
        "invitedAt": "2025-11-15T...",
        "acceptedAt": "2025-11-15T..."
      }
    ]
  }
}
```

### Add Organization Member
```http
POST /organizations/:organizationId/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "role": "member"
}
```

**Roles:** `owner`, `admin`, `member`, `viewer`

## Teams

### Create Team
```http
POST /organizations/:organizationId/teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Backend Team",
  "slug": "backend",
  "description": "Backend services and APIs"
}
```

### Get Organization Teams
```http
GET /organizations/:organizationId/teams
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "teams": [
      {
        "id": "uuid",
        "organizationId": "uuid",
        "name": "Backend Team",
        "slug": "backend",
        "description": "Backend services and APIs",
        "createdAt": "2025-11-15T..."
      }
    ]
  }
}
```

## Secrets

### Create Secret
```http
POST /teams/:teamId/secrets
Authorization: Bearer <token>
Content-Type: application/json

{
  "environment": "production",
  "key": "DATABASE_URL",
  "value": "postgresql://...",
  "description": "Production database connection",
  "tags": ["database", "critical"],
  "rotationIntervalDays": 90
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "secret": {
      "id": "uuid",
      "teamId": "uuid",
      "environment": "production",
      "key": "DATABASE_URL",
      "encryptedValue": "***REDACTED***",
      "description": "Production database connection",
      "tags": ["database", "critical"],
      "createdAt": "2025-11-15T..."
    }
  }
}
```

### List Team Secrets
```http
GET /teams/:teamId/secrets?environment=production&decrypt=false
Authorization: Bearer <token>
```

**Query Parameters:**
- `environment` (optional): Filter by environment
- `decrypt` (optional): Set to `true` to decrypt values (default: `false`)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "secrets": [
      {
        "id": "uuid",
        "key": "DATABASE_URL",
        "environment": "production",
        "encryptedValue": "***REDACTED***",
        "description": "Production database",
        "tags": ["database"],
        "createdAt": "2025-11-15T..."
      }
    ]
  }
}
```

### Get Secret by ID
```http
GET /teams/:teamId/secrets/:secretId?decrypt=true
Authorization: Bearer <token>
```

### Update Secret
```http
PUT /teams/:teamId/secrets/:secretId
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": "new-secret-value",
  "description": "Updated description",
  "tags": ["updated"],
  "rotationIntervalDays": 60
}
```

### Delete Secret
```http
DELETE /teams/:teamId/secrets/:secretId
Authorization: Bearer <token>
```

### Export Secrets to .env
```http
GET /teams/:teamId/secrets/export/env?environment=production
Authorization: Bearer <token>
```

**Response:** Plain text `.env` file
```
# Production database connection
DATABASE_URL=postgresql://...

# API Key
API_KEY=sk_live_...
```

### Import Secrets from .env
```http
POST /teams/:teamId/secrets/import/env
Authorization: Bearer <token>
Content-Type: application/json

{
  "environment": "staging",
  "content": "DATABASE_URL=...\nAPI_KEY=..."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "created": 5,
    "updated": 2,
    "errors": []
  }
}
```

## Billing

### Create Checkout Session
```http
POST /organizations/:organizationId/billing/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "tier": "pro",
  "billingPeriod": "monthly",
  "successUrl": "https://app.yourdomain.com/billing/success",
  "cancelUrl": "https://app.yourdomain.com/billing"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_...",
    "url": "https://checkout.stripe.com/..."
  }
}
```

### Stripe Webhook
```http
POST /billing/webhooks
Stripe-Signature: <signature>
Content-Type: application/json

{
  "type": "customer.subscription.created",
  "data": { ... }
}
```

**Supported events:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## Audit Logs

### Get Organization Audit Logs
```http
GET /organizations/:organizationId/audit-logs?limit=50&offset=0&action=secret.create
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Max results (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `action` (optional): Filter by action type
- `userId` (optional): Filter by user
- `teamId` (optional): Filter by team
- `startDate` (optional): Filter by date range
- `endDate` (optional): Filter by date range

**Response 200:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "organizationId": "uuid",
        "teamId": "uuid",
        "userId": "uuid",
        "userEmail": "user@example.com",
        "action": "secret.create",
        "resourceType": "secret",
        "resourceId": "uuid",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2025-11-15T...",
        "newValue": {
          "key": "API_KEY",
          "environment": "production"
        }
      }
    ],
    "total": 150
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { } // Optional additional context
  }
}
```

**Common error codes:**
- `UNAUTHORIZED` (401): Missing or invalid authentication
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `INVALID_INPUT` (400): Invalid request data
- `EMAIL_ALREADY_EXISTS` (400): Email already registered
- `EMAIL_NOT_VERIFIED` (403): Email not verified
- `INVALID_CREDENTIALS` (401): Wrong email/password
- `INVALID_TOKEN` (401): Invalid or expired token
- `TIER_LIMIT_EXCEEDED` (402): Subscription limit reached
- `ALREADY_EXISTS` (400): Resource already exists
- `INTERNAL_ERROR` (500): Server error

## Rate Limiting

- **Default:** 100 requests per 15 minutes per IP
- **Authenticated:** 1000 requests per 15 minutes per user
- **Exceeded:** Returns `429 Too Many Requests`

Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1637123456
```

## Pagination

List endpoints support pagination:

**Request:**
```http
GET /organizations/:id/audit-logs?limit=50&offset=100
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [ ... ],
    "total": 500
  }
}
```

Calculate pages:
- Total pages = `Math.ceil(total / limit)`
- Current page = `(offset / limit) + 1`

## Webhooks (Future)

Subscribe to events via webhooks:

**Events:**
- `organization.created`
- `team.created`
- `secret.created`
- `secret.updated`
- `secret.deleted`
- `member.invited`
- `subscription.updated`

## SDKs & Client Libraries

### JavaScript/TypeScript
```bash
npm install @lsh/api-client
```

```typescript
import { LSHClient } from '@lsh/api-client';

const client = new LSHClient({
  apiUrl: 'https://api.yourdomain.com',
  apiKey: 'your-api-key',
});

// Login
const { user, token } = await client.auth.login({
  email: 'user@example.com',
  password: 'password',
});

// Create secret
await client.secrets.create('team-id', {
  environment: 'production',
  key: 'API_KEY',
  value: 'secret-value',
});
```

### Python
```bash
pip install lsh-client
```

```python
from lsh_client import LSHClient

client = LSHClient(
    api_url='https://api.yourdomain.com',
    api_key='your-api-key'
)

# Login
user, token = client.auth.login(
    email='user@example.com',
    password='password'
)

# Create secret
client.secrets.create(
    team_id='team-id',
    environment='production',
    key='API_KEY',
    value='secret-value'
)
```

## Testing

Use the API with curl:

```bash
# Set variables
export API_URL="http://localhost:3031/api/v1"
export TOKEN="your-jwt-token"

# Create organization
curl -X POST "$API_URL/organizations" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Test Org", "slug": "test-org"}'

# List secrets
curl "$API_URL/teams/team-id/secrets?environment=dev" \\
  -H "Authorization: Bearer $TOKEN"
```

## Support

- Documentation: https://docs.yourdomain.com
- API Status: https://status.yourdomain.com
- Support: support@yourdomain.com
