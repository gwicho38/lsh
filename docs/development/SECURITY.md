# Security Policy

## Overview

LSH (Encrypted Secrets Manager) is a security-focused tool that handles sensitive data including encryption keys, API credentials, and environment variables. We take security seriously and encourage responsible disclosure of any security vulnerabilities.

## Supported Versions

The following versions of LSH are currently supported with security updates:

| Version | Supported          | Notes                                    |
| ------- | ------------------ | ---------------------------------------- |
| 0.8.x   | :white_check_mark: | Current stable release                   |
| 0.7.x   | :white_check_mark: | Previous stable release                  |
| 0.6.x   | :x:                | No longer supported                      |
| < 0.6   | :x:                | No longer supported                      |

**Security Update Policy:**
- Current major/minor version (0.8.x) receives immediate security patches
- Previous major/minor version (0.7.x) receives critical security patches for 90 days after new release
- Older versions receive no security updates - users should upgrade immediately

## Security Features

LSH implements multiple layers of security:

### Encryption & Cryptography
- **AES-256-CBC encryption** for all stored secrets
- **User-controlled encryption keys** - keys never leave your infrastructure
- **HTTPS/TLS** for all network communications with Supabase/PostgreSQL
- **HMAC verification** for webhook authentication
- **JWT authentication** with configurable expiration for API access
- **bcrypt password hashing** for user credentials

### Command Validation & Injection Prevention
- **Command validation** prevents shell injection attacks (`command-validator.ts`)
- **Environment validation** at startup fails fast on missing/malformed secrets (`env-validator.ts`)
- **Input sanitization** for all user-provided data
- **Dangerous command protection** - `LSH_ALLOW_DANGEROUS_COMMANDS=false` by default

### Access Control
- **API key authentication** for REST API endpoints
- **JWT-based authorization** with role-based access control (RBAC)
- **Webhook signature verification** prevents unauthorized job triggers
- **File permission checks** for sensitive configuration files

### Operational Security
- **Secret masking** in output and logs
- **Audit logging** for secret access and modifications
- **Automatic session expiration** for API tokens
- **Rate limiting** on API endpoints
- **CORS protection** with configurable allowed origins
- **Security headers** via Helmet.js middleware

## Reporting a Vulnerability

We value the security community's efforts in making LSH safer. If you discover a security vulnerability, please follow these guidelines:

### Where to Report

**DO NOT** create public GitHub issues for security vulnerabilities. Instead, report them privately through one of these channels:

1. **GitHub Security Advisories** (Preferred):
   - Go to https://github.com/gwicho38/lsh/security/advisories
   - Click "Report a vulnerability"
   - Fill out the form with detailed information

2. **Email**: luis@lefv.io
   - Subject: "[SECURITY] LSH Vulnerability Report"
   - Encrypt sensitive information using our PGP key (available on request)

### What to Include

To help us understand and reproduce the issue, please include:

- **Description** of the vulnerability
- **Impact assessment** (confidentiality, integrity, availability)
- **Affected versions** (e.g., "all versions <= 0.8.0")
- **Steps to reproduce** with detailed instructions
- **Proof of concept** code or exploit (if available)
- **Proposed fix** or mitigation (if you have one)
- **Your contact information** for follow-up questions

### Response Timeline

We are committed to addressing security issues promptly:

| Timeline        | Action                                                          |
| --------------- | --------------------------------------------------------------- |
| **24 hours**    | Initial acknowledgment of your report                           |
| **72 hours**    | Preliminary assessment and severity classification              |
| **7 days**      | Detailed response with timeline for fix or reason for rejection |
| **30 days**     | Target date for patch release (critical vulnerabilities)        |
| **90 days**     | Target date for patch release (moderate/low vulnerabilities)    |

### Severity Classification

We use the following severity levels based on CVSS scores:

- **Critical (9.0-10.0)**: Remote code execution, data exfiltration, complete system compromise
- **High (7.0-8.9)**: Authentication bypass, privilege escalation, significant data exposure
- **Medium (4.0-6.9)**: XSS, CSRF, limited information disclosure
- **Low (0.1-3.9)**: Security misconfigurations, non-exploitable bugs

### What to Expect

**If the vulnerability is accepted:**
1. We will work with you to understand and reproduce the issue
2. We will develop and test a fix in a private security branch
3. We will prepare a security advisory (CVE if applicable)
4. We will coordinate a disclosure timeline with you
5. We will release a patch and publish the security advisory
6. We will credit you in the advisory (unless you prefer to remain anonymous)

**If the vulnerability is declined:**
1. We will provide a detailed explanation of why it doesn't qualify
2. We may still make improvements to clarify documentation or harden defenses
3. You are free to publish your findings after we respond (we ask for 7 days notice)

### Coordinated Disclosure

We follow coordinated disclosure practices:
- **Embargo period**: 90 days from initial report (negotiable for critical issues)
- **Early disclosure**: We may release patches earlier if the vulnerability is being actively exploited
- **Public disclosure**: After patch release, we publish a security advisory with full details
- **Credit**: We acknowledge security researchers in our security advisories and CHANGELOG

## Security Best Practices for Users

### Production Deployment

**Environment Variables:**
```bash
# Required - Generate with: openssl rand -hex 32
LSH_API_KEY=<strong-random-key>
LSH_JWT_SECRET=<strong-random-secret>
LSH_SECRETS_KEY=<generated-via-lsh-lib-secrets-key>

# Required for webhooks
GITHUB_WEBHOOK_SECRET=<github-provided-secret>
GITLAB_WEBHOOK_SECRET=<gitlab-provided-secret>

# Security controls
LSH_ALLOW_DANGEROUS_COMMANDS=false  # MUST be false in production
NODE_ENV=production
```

**Encryption Key Management:**
- Generate **unique** encryption keys per project: `lsh lib secrets key`
- **Never commit** `LSH_SECRETS_KEY` to version control
- Share keys via secure channels (1Password, LastPass, encrypted channels)
- Rotate encryption keys periodically (every 90 days recommended)
- Keep encrypted backups of keys in secure offline storage

**Network Security:**
- Use **HTTPS only** for Supabase/PostgreSQL connections
- Configure **firewall rules** to restrict daemon/API access
- Use **VPN or private networks** for team secret synchronization
- Enable **rate limiting** on public-facing API endpoints

**Access Control:**
- Use **separate environments** (dev/staging/prod) with different keys
- Grant **least privilege** access to secrets
- Implement **API key rotation** every 30-90 days
- Use **short-lived JWT tokens** (default: 24 hours)

**Monitoring & Auditing:**
- Enable **audit logging** for all secret access
- Monitor **daemon logs** for suspicious activity: `/tmp/lsh-job-daemon-$USER.log`
- Set up **alerts** for failed authentication attempts
- Review **webhook logs** for unauthorized access attempts

### Development Best Practices

**For LSH Users:**
- Always verify LSH is installed from official npm: `npm install -g lsh-framework`
- Check package integrity: `npm audit --audit-level moderate`
- Keep LSH updated to the latest version: `npm update -g lsh-framework`
- Use `.env.example` as a template - never commit actual `.env` files
- Test secret rotation scripts in dev/staging before production

**For LSH Contributors:**
- Run tests before committing: `npm test`
- Run security audit: `npm run audit:security`
- Use command validation: Import and use `validateCommand()` for all user input
- Use environment validation: Call `validateEnvironment()` in daemon/API startup
- Follow secure coding guidelines in `CLAUDE.md`

## Known Security Considerations

### Limitations & Assumptions

1. **Encryption Key Security**: LSH's security depends on the secrecy of `LSH_SECRETS_KEY`. If this key is compromised, all secrets encrypted with it are exposed.

2. **Local Storage**: Secrets pulled to local `.env` files are stored in plaintext. Ensure proper file permissions (`chmod 600 .env`) and disk encryption.

3. **Memory Exposure**: Secrets are briefly stored in memory during encryption/decryption. Use memory-safe languages and avoid core dumps in production.

4. **Network Trust**: LSH trusts the configured Supabase/PostgreSQL backend. Use reputable providers and enable all available security features.

5. **Daemon Security**: The LSH daemon runs with user privileges. Ensure the user account is properly secured and has minimal permissions.

6. **Webhook Trust**: Webhooks execute jobs based on external triggers. Always verify webhook signatures and use webhook secrets.

### Out of Scope

The following are explicitly **not** covered by our security policy:

- **Social engineering attacks** targeting your team to obtain encryption keys
- **Physical access attacks** to machines with decrypted secrets
- **Vulnerabilities in dependencies** (we address these via `npm audit` updates)
- **Denial of service attacks** via resource exhaustion (use rate limiting at infrastructure level)
- **Issues in self-hosted infrastructure** (Supabase, PostgreSQL, Redis)
- **Misconfiguration by users** (e.g., setting `LSH_ALLOW_DANGEROUS_COMMANDS=true` in prod)

## Security Disclosure History

Public security advisories will be listed here after disclosure:

- **None yet** - LSH is a young project. We will maintain transparency about all security issues.

See our [CHANGELOG](CHANGELOG.md) for version history and security-related fixes.

## Security Contact

- **Security Lead**: gwicho38 (luis@lefv.io)
- **GitHub Security**: https://github.com/gwicho38/lsh/security/advisories
- **General Issues**: https://github.com/gwicho38/lsh/issues (non-security only)

## Acknowledgments

We appreciate the security research community and will acknowledge all valid security reports in:
- GitHub Security Advisories
- CHANGELOG.md release notes
- This SECURITY.md file

Thank you for helping keep LSH and its users safe!

---

**Last Updated**: 2025-10-19
**Policy Version**: 1.0.0
