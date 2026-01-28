# ADR-0004: API Authentication with JWT

## Status

Accepted

## Date

2026-01-27

## Context

LSH exposes a REST API for:
- Remote job management
- CI/CD webhook integration
- Programmatic access to secrets
- Dashboard and monitoring interfaces

Authentication requirements:
- Stateless (no session management)
- Support for machine-to-machine auth (API keys)
- Support for user auth (future SaaS features)
- Configurable token expiration
- Role-based access control (admin, user, readonly)

Security considerations:
- API may be exposed to network (not just localhost)
- Webhook endpoints need distinct authentication (HMAC)
- Tokens should be revocable

## Decision

We chose **JWT (JSON Web Tokens) with Bearer authentication**.

Key characteristics:
- Token format: JWT (RFC 7519)
- Algorithm: HS256 (HMAC with SHA-256)
- Transport: `Authorization: Bearer <token>` header
- Claims: user_id, role, exp (expiration)
- Secret: `LSH_JWT_SECRET` environment variable

Token structure:
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_123",
    "role": "admin",
    "iat": 1706400000,
    "exp": 1706486400
  },
  "signature": "..."
}
```

## Consequences

### Positive

- **Stateless**: No session storage needed
- **Self-contained**: Token carries all needed info
- **Standard**: Widely supported, many libraries available
- **Flexible**: Custom claims for roles and permissions
- **Verifiable**: Signature prevents tampering

### Negative

- **Token size**: Larger than simple session IDs
- **Revocation complexity**: Need blocklist for early revocation
- **Secret management**: Single secret for all tokens
- **Clock skew**: Expiration requires synchronized clocks

### Neutral

- Token refresh pattern needed for long-lived sessions
- Different approach needed for webhooks (HMAC)

## Alternatives Considered

### Option 1: Simple API Keys

- **Description**: Random string per user, lookup in database
- **Pros**: Simple, easy to revoke, familiar pattern
- **Cons**: Database lookup on every request, no embedded permissions
- **Why rejected**: Want stateless auth, JWT better for microservices future

### Option 2: OAuth 2.0

- **Description**: Full OAuth authorization framework
- **Pros**: Industry standard, supports delegated auth
- **Cons**: Complex implementation, overkill for CLI tool
- **Why rejected**: Too heavyweight for current use case

### Option 3: mTLS (Mutual TLS)

- **Description**: Client certificate authentication
- **Pros**: Very secure, no passwords/tokens in transit
- **Cons**: Certificate management complexity, harder to debug
- **Why rejected**: Too complex for target users, barrier to adoption

### Option 4: Session Cookies

- **Description**: Traditional session-based auth
- **Pros**: Simple, browser-friendly, easy revocation
- **Cons**: Stateful, requires session storage, CSRF risks
- **Why rejected**: Need stateless auth for API use case

## Implementation Notes

### Token Generation

```typescript
// src/cicd/auth.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.LSH_JWT_SECRET;

export function generateToken(userId: string, role: string): string {
  const payload = {
    sub: userId,
    role: role,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
    algorithm: 'HS256'
  });
}
```

### Token Verification

```typescript
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    }) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new LSHError(ErrorCodes.TOKEN_EXPIRED, 'Token has expired');
    }
    throw new LSHError(ErrorCodes.INVALID_TOKEN, 'Invalid token');
  }
}
```

### Express Middleware

```typescript
// src/daemon/api-server.ts
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

### Role-Based Access

```typescript
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Usage
app.delete('/jobs/:id', authMiddleware, requireRole('admin'), deleteJobHandler);
```

### Webhook Authentication (Different Pattern)

Webhooks use HMAC signatures instead of JWT:

```typescript
// src/cicd/webhook-receiver.ts
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Use constant-time comparison (see ADR for constant-time utils)
  return constantTimeCompare(`sha256=${expected}`, signature);
}
```

## Security Considerations

1. **Secret strength**: `LSH_JWT_SECRET` should be 256+ bits of entropy
2. **HTTPS required**: Never send JWT over unencrypted connections
3. **Token storage**: Clients should store tokens securely
4. **Expiration**: Use short-lived tokens (24h default)
5. **Rotation**: Rotate JWT secret periodically

## Related Decisions

- [ADR-0002](./0002-secret-encryption-standards.md) - Same crypto primitives
- [ADR-0003](./0003-daemon-process-architecture.md) - API runs in daemon

## References

- [RFC 7519 - JSON Web Token](https://tools.ietf.org/html/rfc7519)
- [jsonwebtoken npm package](https://github.com/auth0/node-jsonwebtoken)
- [src/cicd/auth.ts](../../../src/cicd/auth.ts)
- [src/daemon/api-server.ts](../../../src/daemon/api-server.ts)
