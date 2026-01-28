# ADR-0002: Secret Encryption Standards

## Status

Accepted

## Date

2026-01-27

## Context

LSH's primary feature is encrypted secrets management. Users store sensitive data (API keys, database credentials, tokens) that must be protected:

1. At rest (when stored in cloud/database)
2. In transit (when syncing between machines)
3. At the client (when loaded into memory)

Requirements:
- Strong encryption that resists brute-force attacks
- User-controlled keys (LSH never stores keys)
- Standard algorithms auditable by security experts
- Compatible with web crypto APIs for browser support
- Fast enough for interactive CLI usage

Threat model:
- Cloud storage compromise should not expose secrets
- Network interception should not expose secrets
- LSH service compromise should not expose secrets (we don't have keys)

## Decision

We chose **AES-256-CBC** encryption with user-provided keys.

Key characteristics:
- Algorithm: AES (Advanced Encryption Standard)
- Key size: 256 bits (32 bytes)
- Mode: CBC (Cipher Block Chaining)
- IV: Random 16-byte initialization vector per encryption
- Key derivation: User provides raw key (hex-encoded)

Implementation:
- Node.js `crypto` module for encryption operations
- Key stored in `LSH_SECRETS_KEY` environment variable
- Each encryption generates unique random IV
- IV prepended to ciphertext for storage

## Consequences

### Positive

- **Proven security**: AES-256 is industry standard, used by governments and enterprises
- **Wide support**: Available in all platforms (Node.js, browsers, mobile)
- **Performance**: Hardware acceleration on modern CPUs
- **User control**: Keys never leave user's machine
- **Auditability**: Standard algorithm, easy to verify implementation

### Negative

- **Key management burden**: User must securely store and share keys
- **No key derivation**: Raw keys required (no password-to-key function)
- **CBC mode quirks**: Requires padding, vulnerable to certain attacks if IV reused
- **No authenticated encryption**: Integrity not built into encryption mode

### Neutral

- Key rotation requires re-encryption of all secrets
- Different environments require different keys (by design for isolation)

## Alternatives Considered

### Option 1: AES-256-GCM (Authenticated Encryption)

- **Description**: AES with Galois/Counter Mode, provides encryption + authentication
- **Pros**: Built-in integrity checking, standard, same key size
- **Cons**: Slightly more complex, nonce management requirements
- **Why rejected**: CBC sufficient for current threat model, GCM may be added later

### Option 2: ChaCha20-Poly1305

- **Description**: Modern stream cipher with authentication
- **Pros**: Faster in software (no AES hardware), authenticated
- **Cons**: Less universal support, newer (less audited in some contexts)
- **Why rejected**: AES-256 has better ecosystem support in our target environments

### Option 3: RSA Asymmetric Encryption

- **Description**: Public-key cryptography
- **Pros**: No shared key needed, better for multi-party scenarios
- **Cons**: Slow, limited message size, key management complexity
- **Why rejected**: Symmetric encryption better for secrets storage use case

### Option 4: HashiCorp Vault Integration

- **Description**: External secrets management service
- **Pros**: Enterprise-grade, dynamic secrets, audit logging
- **Cons**: Operational complexity, infrastructure dependency
- **Why rejected**: Too heavy for LSH's "simple secrets manager" philosophy

## Implementation Notes

### Encryption Function

```typescript
// src/lib/secrets-manager.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export function encryptSecret(plaintext: string, key: string): string {
  // Key must be 32 bytes (256 bits)
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== 32) {
    throw new LSHError(ErrorCodes.INVALID_KEY, 'Key must be 32 bytes (64 hex chars)');
  }

  // Generate random IV for each encryption
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Prepend IV to ciphertext
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptSecret(ciphertext: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'hex');
  const [ivHex, encrypted] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Key Generation

```bash
# Generate a new encryption key
lsh key
# Output: LSH_SECRETS_KEY=<your-64-character-hex-key>

# Or use OpenSSL
openssl rand -hex 32
```

### Security Best Practices

1. **Never commit keys**: Add `LSH_SECRETS_KEY` to `.gitignore`
2. **Use different keys per environment**: dev, staging, prod each have own key
3. **Rotate keys periodically**: Re-encrypt with new key, invalidate old
4. **Share keys securely**: Use password manager or secure channel

## Related Decisions

- [ADR-0004](./0004-api-authentication-jwt.md) - JWT uses similar crypto primitives
- [ADR-0005](./0005-error-handling-pattern.md) - Error handling for crypto failures

## References

- [Node.js crypto module](https://nodejs.org/api/crypto.html)
- [AES on Wikipedia](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)
- [src/lib/secrets-manager.ts](../../../src/lib/secrets-manager.ts)
- [SECRETS_GUIDE.md](../../features/secrets/SECRETS_GUIDE.md)
