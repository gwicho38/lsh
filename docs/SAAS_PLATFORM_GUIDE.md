# LSH SaaS Platform Guide

## Overview

The LSH SaaS platform transforms the LSH secrets manager into a multi-tenant hosted service with:

- **Multi-tenant architecture** - Organizations, teams, and role-based access control
- **Web dashboard** - Next.js-based UI for managing secrets, teams, and billing
- **Authentication** - Email/password, OAuth (Google, GitHub, Microsoft), and magic links
- **Per-team encryption** - Each team has isolated encryption keys
- **Billing integration** - Stripe for subscriptions and payments
- **Audit logging** - Comprehensive activity tracking
- **RESTful API** - Full-featured API for all operations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      LSH SaaS Platform                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (Next.js)          Backend (Node.js/Express)     │
│  ┌──────────────────┐        ┌──────────────────────┐      │
│  │ - Login/Signup   │◄───────┤ - Authentication     │      │
│  │ - Dashboard      │        │ - Authorization      │      │
│  │ - Team Mgmt      │        │ - RBAC               │      │
│  │ - Secrets UI     │        │ - Multi-tenant logic │      │
│  │ - Billing UI     │        │ - Audit logging      │      │
│  │ - Audit Logs     │        │ - Email service      │      │
│  └──────────────────┘        └──────────────────────┘      │
│          │                            │                     │
│          └────────────────────────────┘                     │
│                     │                                       │
│          ┌──────────▼───────────┐                          │
│          │   RESTful API        │                          │
│          │   /api/v1/*          │                          │
│          └──────────┬───────────┘                          │
│                     │                                       │
│       ┌─────────────┴──────────────┐                       │
│       │                            │                       │
│   ┌───▼────┐                  ┌───▼─────┐                 │
│   │ Stripe │                  │ Resend  │                 │
│   │ Billing│                  │  Email  │                 │
│   └────────┘                  └─────────┘                 │
│                                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │  Supabase     │
              │  PostgreSQL   │
              │               │
              │  - users      │
              │  - orgs       │
              │  - teams      │
              │  - secrets    │
              │  - audit_logs │
              └───────────────┘
```

## Database Schema

See `migrations/001_saas_multi_tenant_schema.sql` for the complete schema.

**Core Tables:**
- `organizations` - Top-level tenant container
- `users` - User accounts with email/OAuth auth
- `organization_members` - User-org relationships with RBAC roles (owner, admin, member, viewer)
- `teams` - Sub-organizations for grouping secrets
- `team_members` - User-team assignments
- `encryption_keys` - Per-team encryption keys (encrypted at rest)
- `secrets` - Encrypted secrets with team isolation
- `audit_logs` - Comprehensive audit trail
- `subscriptions` - Stripe subscription management
- `invoices` - Generated invoices
- `api_keys` - API keys for CLI authentication

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

**New dependencies added:**
- `express` - Web server
- `cors` - CORS middleware
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication

### 2. Database Setup

Apply the migration to create tables:

```bash
# Using Supabase
psql -h db.your-project.supabase.co \\
  -U postgres \\
  -d postgres \\
  -f migrations/001_saas_multi_tenant_schema.sql

# Or using local PostgreSQL
psql -U postgres -d lsh_saas -f migrations/001_saas_multi_tenant_schema.sql
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required Configuration:**

```env
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Authentication
LSH_JWT_SECRET=$(openssl rand -hex 32)

# Master Encryption Key (for encrypting team keys)
LSH_MASTER_KEY=$(openssl rand -hex 32)

# Email Service (Resend)
RESEND_API_KEY=re_your_key
EMAIL_FROM=noreply@yourdomain.com
BASE_URL=https://app.yourdomain.com

# Stripe Billing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...

# API Server
LSH_SAAS_API_PORT=3031
LSH_SAAS_API_HOST=0.0.0.0
LSH_CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### 4. Build and Start

```bash
# Build TypeScript
npm run build

# Start SaaS API server
npm run saas:api

# Or dev mode (builds + starts)
npm run saas:dev
```

The API server will be available at `http://localhost:3031`.

## API Endpoints

### Authentication

```bash
POST /api/v1/auth/signup
POST /api/v1/auth/login
POST /api/v1/auth/verify-email
POST /api/v1/auth/resend-verification
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
```

### Organizations

```bash
POST   /api/v1/organizations
GET    /api/v1/organizations/:id
GET    /api/v1/organizations/:id/members
POST   /api/v1/organizations/:id/members
PATCH  /api/v1/organizations/:id/members/:userId/role
DELETE /api/v1/organizations/:id/members/:userId
```

### Teams

```bash
POST /api/v1/organizations/:orgId/teams
GET  /api/v1/organizations/:orgId/teams
GET  /api/v1/teams/:id
PUT  /api/v1/teams/:id
DELETE /api/v1/teams/:id
```

### Secrets

```bash
POST   /api/v1/teams/:teamId/secrets
GET    /api/v1/teams/:teamId/secrets
GET    /api/v1/teams/:teamId/secrets/:id
PUT    /api/v1/teams/:teamId/secrets/:id
DELETE /api/v1/teams/:teamId/secrets/:id
GET    /api/v1/teams/:teamId/secrets/export/env
POST   /api/v1/teams/:teamId/secrets/import/env
```

### Billing

```bash
POST /api/v1/organizations/:id/billing/checkout
POST /api/v1/billing/webhooks (Stripe webhook)
```

### Audit Logs

```bash
GET /api/v1/organizations/:id/audit-logs
```

## Subscription Tiers

### Free Tier
- 1 organization
- 3 team members
- 10 secrets
- 3 environments
- 30-day audit log retention
- 1,000 API calls/month

### Pro Tier ($29/month)
- 1 organization
- Unlimited team members
- Unlimited secrets
- Unlimited environments
- 1-year audit log retention
- 100,000 API calls/month
- Priority support

### Enterprise Tier (Custom pricing)
- Multiple organizations
- Unlimited everything
- Unlimited audit log retention
- SSO/SAML integration
- SLA support
- On-premise deployment option

## Stripe Setup

### 1. Create Products and Prices

In Stripe Dashboard:

1. Create "Pro" product
   - Add monthly price (e.g., $29)
   - Add yearly price (e.g., $290)
   - Copy price IDs to `.env`

2. Create "Enterprise" product
   - Add monthly price
   - Add yearly price
   - Copy price IDs to `.env`

3. Set up webhook endpoint
   - Add endpoint: `https://yourdomain.com/api/v1/billing/webhooks`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Copy webhook secret to `.env`

## Email Setup (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain
3. Generate API key
4. Add to `.env`:
   ```env
   RESEND_API_KEY=re_your_key
   EMAIL_FROM=noreply@yourdomain.com
   ```

## Deployment

### Option 1: Cloud Deployment (Recommended)

**Frontend (Vercel):**
```bash
cd saas
vercel deploy
```

**Backend API (Railway/Render):**
```bash
# Create railway.toml or render.yaml
# Push to GitHub
# Connect to Railway/Render
```

**Database (Supabase):**
- Already configured via `SUPABASE_URL`

### Option 2: Self-Hosted

**Using Docker:**

```dockerfile
# Dockerfile (backend)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
CMD ["node", "dist/daemon/saas-api-server.js"]
```

**Docker Compose:**

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3031:3031"
    env_file:
      - .env
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: lsh_saas
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d

volumes:
  postgres_data:
```

Deploy:

```bash
docker-compose up -d
```

### Option 3: Kubernetes

See `docs/kubernetes/` for manifests.

## Security Best Practices

1. **Master Key Security**
   - Store `LSH_MASTER_KEY` in a secret manager (AWS Secrets Manager, etc.)
   - Never commit to version control
   - Rotate periodically
   - Back up securely

2. **Database Security**
   - Enable SSL/TLS
   - Use strong passwords
   - Enable Row Level Security (RLS) in Supabase
   - Regular backups

3. **API Security**
   - HTTPS only in production
   - Rate limiting (recommended: 100 req/15min per IP)
   - CORS whitelist
   - Security headers (CSP, HSTS, etc.)

4. **Audit Logging**
   - All sensitive operations are logged
   - Logs include IP address and user agent
   - Regular review of audit logs
   - Retention policy based on tier

## Monitoring

### Health Check

```bash
curl http://localhost:3031/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-15T...",
  "uptime": 3600
}
```

### Metrics to Monitor

- API response times
- Database query performance
- Error rates
- Active users
- Subscription metrics
- Encryption/decryption performance

## Testing

### API Testing

```bash
# Signup
curl -X POST http://localhost:3031/api/v1/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Login
curl -X POST http://localhost:3031/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# Create Organization (with JWT token)
curl -X POST http://localhost:3031/api/v1/organizations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <token>" \\
  -d '{
    "name": "My Company",
    "slug": "my-company"
  }'
```

## Next.js Dashboard Setup

Create a new Next.js app in the `saas/` directory:

```bash
npx create-next-app@latest saas
cd saas
npm install @tanstack/react-query axios zustand
```

**Recommended stack:**
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand + React Query
- **Auth:** NextAuth.js
- **Forms:** React Hook Form + Zod

**Directory structure:**
```
saas/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── signup/
│   │   └── verify-email/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── teams/
│   │   ├── secrets/
│   │   ├── members/
│   │   ├── billing/
│   │   └── audit-logs/
│   └── api/
│       └── auth/
├── components/
│   ├── ui/ (shadcn components)
│   ├── auth/
│   ├── teams/
│   ├── secrets/
│   └── billing/
├── lib/
│   ├── api-client.ts
│   ├── auth.ts
│   └── types.ts
└── hooks/
    ├── use-auth.ts
    ├── use-teams.ts
    └── use-secrets.ts
```

**API Client Example:**

```typescript
// lib/api-client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const organizations = {
  create: (data) => api.post('/organizations', data),
  get: (id) => api.get(`/organizations/${id}`),
  members: (id) => api.get(`/organizations/${id}/members`),
};

export const secrets = {
  list: (teamId, environment) =>
    api.get(`/teams/${teamId}/secrets`, { params: { environment } }),
  create: (teamId, data) =>
    api.post(`/teams/${teamId}/secrets`, data),
  update: (teamId, secretId, data) =>
    api.put(`/teams/${teamId}/secrets/${secretId}`, data),
  delete: (teamId, secretId) =>
    api.delete(`/teams/${teamId}/secrets/${secretId}`),
};

export default api;
```

## CLI Integration

Users can authenticate the CLI with API keys:

```bash
# Generate API key in dashboard
# Then configure CLI
lsh config set api-key <your-api-key>
lsh config set api-url https://api.yourdomain.com

# Pull secrets
lsh pull --team my-team --env production

# Push secrets
lsh push --team my-team --env production
```

## Support & Troubleshooting

### Common Issues

**1. "No active encryption key found for team"**
- Solution: Encryption key is auto-created on first secret. Check database for encryption_keys table.

**2. "TIER_LIMIT_EXCEEDED"**
- Solution: User has reached their plan limit. Upgrade subscription.

**3. "Email verification token expired"**
- Solution: Use resend verification endpoint.

**4. Stripe webhook errors**
- Solution: Check webhook secret matches, verify endpoint URL is accessible.

### Logs

```bash
# API server logs
tail -f /tmp/lsh-saas-api.log

# Database logs (Supabase)
# Check Supabase dashboard > Logs

# Stripe webhook logs
# Check Stripe dashboard > Developers > Webhooks
```

## Roadmap

- [ ] SSO/SAML integration
- [ ] Mobile app (React Native)
- [ ] Advanced secret rotation automation
- [ ] Secret versioning
- [ ] Team-level access policies
- [ ] Integration marketplace (AWS, GCP, Azure secrets sync)
- [ ] Secret scanning for leaked credentials
- [ ] Compliance reports (SOC 2, GDPR)

## Contributing

See the main LSH README for contribution guidelines.

## License

MIT - See LICENSE file
