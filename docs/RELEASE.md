# LSH Release Process

Complete guide for releasing new versions of LSH from source to npm.

## Quick Start

```bash
# Automated release (recommended)
./scripts/release.sh patch   # 0.5.1 → 0.5.2
./scripts/release.sh minor   # 0.5.1 → 0.6.0
./scripts/release.sh major   # 0.5.1 → 1.0.0
```

---

## Full Release Workflow

### 1. **Prepare Release**

```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Ensure working directory is clean
git status
```

### 2. **Run Tests**

```bash
# Run full test suite
npm test

# Optional: Run linting
npm run lint
```

### 3. **Bump Version**

Choose version type based on changes:
- **patch** (0.5.1 → 0.5.2): Bug fixes
- **minor** (0.5.1 → 0.6.0): New features (backward compatible)
- **major** (0.5.1 → 1.0.0): Breaking changes

```bash
# Automated (recommended)
./scripts/release.sh patch

# Manual
npm version patch  # or minor/major
```

### 4. **Push to GitHub**

```bash
# Push commits and tags
git push origin main
git push origin v0.5.2  # Replace with your version
```

### 5. **Wait for CI/CD**

GitHub Actions will automatically:
1. ✅ Run CI tests on all Node versions
2. ✅ Build the project
3. ✅ Publish to npm (if CI passes)
4. ✅ Create GitHub release

Monitor: https://github.com/gwicho38/lsh/actions

### 6. **Verify Publication**

```bash
# Check npm registry
npm view lsh-framework version

# Should show 0.5.2
```

### 7. **Test Installation**

```bash
# Update your local installation
lsh self update

# Verify version
lsh self version

# Should show 0.5.2
```

---

## Manual Publication (If Automated Fails)

If GitHub Actions doesn't publish automatically:

```bash
# 1. Login to npm
npm login

# 2. Build the project
npm run build

# 3. Publish
npm publish

# 4. Verify
npm view lsh-framework version
```

---

## GitHub Secrets Setup

For automated publishing to work, ensure these secrets are configured:

1. Go to: https://github.com/gwicho38/lsh/settings/secrets/actions

2. Add `NPM_TOKEN`:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Create "Automation" token
   - Copy token
   - Add as `NPM_TOKEN` secret in GitHub

3. `GITHUB_TOKEN` is automatic (no setup needed)

---

## Version Numbering (Semantic Versioning)

Following semantic versioning (M.m.p):

- **Major (M)**: Breaking changes (0.x.x → 1.x.x)
- **Minor (m)**: New features, backward compatible (x.0.x → x.1.x)
- **Patch (p)**: Bug fixes (x.x.0 → x.x.1)

### Examples:

- `0.5.1 → 0.5.2`: Bug fix in interactive shell
- `0.5.2 → 0.6.0`: New feature (e.g., `lsh self update`)
- `0.6.0 → 1.0.0`: Major rewrite or breaking API changes

---

## Rollback Procedure

If a release has issues:

### 1. Deprecate on npm
```bash
npm deprecate lsh-framework@0.5.2 "This version has issues, use 0.5.1"
```

### 2. Unpublish (within 72 hours)
```bash
npm unpublish lsh-framework@0.5.2
```

### 3. Delete Git Tag
```bash
git tag -d v0.5.2
git push origin :refs/tags/v0.5.2
```

---

## Troubleshooting

### CI Fails
- Check logs: https://github.com/gwicho38/lsh/actions
- Fix issue and create new version

### npm Publish Fails
- Check npm token is valid
- Verify package name isn't taken
- Ensure version doesn't already exist

### Users Can't Update
- Verify: `npm view lsh-framework version`
- Check CI passed: `lsh self update --skip-ci-check`
- Manual install: `npm install -g lsh-framework@latest`

---

## Release Checklist

Before releasing, ensure:

- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Version bumped correctly
- [ ] CHANGELOG.md updated (if exists)
- [ ] Git working directory clean
- [ ] On `main` branch
- [ ] Pulled latest from origin
- [ ] GitHub Actions secrets configured
- [ ] CI passing on main branch

After releasing:

- [ ] CI/CD completed successfully
- [ ] npm shows correct version
- [ ] `lsh self update` works
- [ ] GitHub release created
- [ ] Announce release (optional)

---

## Quick Reference

```bash
# Full release process (one command)
./scripts/release.sh patch

# Manual steps
npm version patch
git push origin main --tags
npm publish

# Verify
npm view lsh-framework version
lsh self update
lsh self version
```

---

## Support

Issues with releases? Open an issue:
https://github.com/gwicho38/lsh/issues
