# Security Policy

## 🔐 Core Security Principle: Encryption Key Storage

**LSH is an encrypted secrets manager. The security of your secrets depends entirely on how you store your encryption key.**

### ⚠️ CRITICAL: Never Store `LSH_SECRETS_KEY` in Your Project's `.env` File

**Why This Is Wrong:**
```
❌ INSECURE: Storing the encryption key in the file it encrypts
┌─────────────────────────────────────┐
│ .env file contains:                 │
│ - LSH_SECRETS_KEY=abc123...         │  ← Encryption key
│ - API_KEY=secret                    │  ← Data to encrypt
│ - DATABASE_URL=postgres://...       │  ← Data to encrypt
└─────────────────────────────────────┘
```

**This creates a circular security flaw:**
1. The encryption key is stored in the same file it's meant to protect
2. If `.env` is accidentally committed to git, your encryption key is exposed
3. Anyone with the key can decrypt all your secrets
4. Defeats the entire purpose of encrypted secrets management

### ✅ Correct: Store `LSH_SECRETS_KEY` in Your Shell Profile

**For Individual Developers:**

```bash
# Generate encryption key
lsh key

# Add to your shell profile (choose one based on your shell)
echo 'export LSH_SECRETS_KEY="your-key-here"' >> ~/.zshrc    # For Zsh
echo 'export LSH_SECRETS_KEY="your-key-here"' >> ~/.bashrc   # For Bash
echo 'set -x LSH_SECRETS_KEY "your-key-here"' >> ~/.config/fish/config.fish  # For Fish

# Reload your shell
source ~/.zshrc  # or ~/.bashrc
```

**For Teams:**

1. **Generate key once:**
   ```bash
   lsh key
   ```

2. **Share securely** via one of these methods:
   - 🔒 **Password Manager** (1Password, LastPass, Bitwarden)
   - 🔒 **Encrypted Email** (ProtonMail, GPG)
   - 🔒 **Secure Chat** (Signal, encrypted Slack DM)
   - 🔒 **Team Secrets Platform** (HashiCorp Vault, AWS Secrets Manager)

   **Never:**
   - ❌ Post in public Slack channels
   - ❌ Send via unencrypted email
   - ❌ Commit to git
   - ❌ Store in project files

3. **Each team member adds to their shell profile:**
   ```bash
   # Each developer on their own machine
   echo 'export LSH_SECRETS_KEY="shared-team-key"' >> ~/.zshrc
   source ~/.zshrc
   ```

4. **Verify setup:**
   ```bash
   lsh doctor
   ```

### 🔍 Security Verification Checklist

Before using LSH in production, verify:

- [ ] `LSH_SECRETS_KEY` is **NOT** in your project's `.env` file
- [ ] `LSH_SECRETS_KEY` is in your shell profile (`~/.zshrc`, `~/.bashrc`, etc.)
- [ ] `.env` is in your `.gitignore`
- [ ] You can run `echo $LSH_SECRETS_KEY` and see your key
- [ ] All team members have the same `LSH_SECRETS_KEY` in their shell profiles
- [ ] The encryption key is stored in your team's password manager

### 🛡️ Additional Security Best Practices

#### 1. **Environment Variables in CI/CD**

For GitHub Actions, GitLab CI, etc.:

```yaml
# GitHub Actions example
env:
  LSH_SECRETS_KEY: ${{ secrets.LSH_SECRETS_KEY }}

# Add LSH_SECRETS_KEY to your repository secrets:
# Settings → Secrets and variables → Actions → New repository secret
```

#### 2. **Database Credentials**

If using cloud storage (Supabase/PostgreSQL):

```bash
# Store these in your shell profile too, NOT in project .env
export SUPABASE_URL="your-supabase-url"
export SUPABASE_ANON_KEY="your-anon-key"

# OR use a separate config file
~/.config/lsh/config.env
```

#### 3. **Key Rotation**

Rotate your encryption key periodically:

```bash
# Generate new key
NEW_KEY=$(lsh key --export | cut -d"'" -f2)

# Pull secrets with old key
lsh pull --env production

# Update shell profile with new key
echo "export LSH_SECRETS_KEY='$NEW_KEY'" >> ~/.zshrc
source ~/.zshrc

# Push with new key
lsh push --env production

# Share new key with team via secure channel
```

#### 4. **Multi-Environment Keys**

For maximum security, use different keys per environment:

```bash
# In your shell profile
export LSH_SECRETS_KEY_DEV="dev-key-here"
export LSH_SECRETS_KEY_STAGING="staging-key-here"
export LSH_SECRETS_KEY_PROD="prod-key-here"

# Use environment-specific key
LSH_SECRETS_KEY=$LSH_SECRETS_KEY_PROD lsh pull --env production
```

#### 5. **Audit Access**

Regularly audit who has access to your encryption key:

```bash
# Check Supabase access logs
lsh env production --audit

# Review team members who have the key
# Keep a secure inventory in your password manager
```

#### 6. **Backup Your Key**

**Critical:** If you lose your `LSH_SECRETS_KEY`, your encrypted secrets are **unrecoverable**.

**Backup strategies:**
- Store in team password manager (1Password, LastPass)
- Print and store in physical safe
- Encrypted backup in multiple locations
- Documented in team security runbook

#### 7. **Never Use Dangerous Commands in Production**

```bash
# NEVER set this in production
export LSH_ALLOW_DANGEROUS_COMMANDS=true

# This disables critical security validations
```

## 🚨 Reporting Security Vulnerabilities

If you discover a security vulnerability in LSH, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. **Email:** security@example.com (or create a private security advisory)
3. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and provide a timeline for a fix.

## 🔒 Encryption Details

**LSH uses industry-standard encryption:**

- **Algorithm:** AES-256-CBC
- **Key derivation:** PBKDF2 with SHA-256
- **Iterations:** 100,000
- **Salt:** Random 16-byte salt per encryption
- **IV:** Random 16-byte initialization vector per encryption

**Key format:**
- 64 hexadecimal characters (32 bytes / 256 bits)
- Generated using Node.js `crypto.randomBytes(32)`

## 📋 Security Audit History

| Version | Audit Date | Auditor | Status |
|---------|------------|---------|--------|
| 1.7.x   | 2025-11-23 | Internal | ✅ Passed |

## 🔗 Related Documentation

- [Secrets Management Guide](docs/features/secrets/SECRETS_GUIDE.md)
- [Quick Reference](docs/features/secrets/SECRETS_QUICK_REFERENCE.md)
- [Installation Guide](INSTALL.md)
- [README](README.md)

## 📝 Security Policy Updates

This security policy was last updated on **2025-11-23**.

We review and update this policy:
- After each major release
- Following security audits
- When new threats are identified
- Based on community feedback

## 🙏 Acknowledgments

We follow security best practices from:
- OWASP Top 10
- NIST Cybersecurity Framework
- CIS Controls
- Industry-standard secrets management practices

---

**Remember: Your secrets are only as secure as your encryption key. Protect it accordingly.**
