# LSH v2.0 Migration Plan

## 🎯 Goal

Simplify environment naming in git repositories by using the repo name as the default environment instead of `repo_dev`.

## 📋 Breaking Changes

### Old Behavior (v1.x)
```bash
# In repo: lsh_test_repo
lsh push                    # → lsh_test_repo_dev
lsh push --env dev          # → lsh_test_repo_dev
lsh push --env staging      # → lsh_test_repo_staging
lsh push --env production   # → lsh_test_repo_production
```

### New Behavior (v2.0)
```bash
# In repo: lsh_test_repo
lsh push                    # → lsh_test_repo (simpler!)
lsh push --env dev          # → lsh_test_repo_dev (explicit)
lsh push --env staging      # → lsh_test_repo_staging
lsh push --env production   # → lsh_test_repo_production
```

### Outside Git Repos (No Change)
```bash
# Not in a git repo
lsh push                    # → dev (still default to "dev")
lsh push --env production   # → production
```

## 🔧 Implementation Changes

### 1. Update Default Environment Logic

**File**: `src/lib/secrets-manager.ts`

**Current Logic**:
```typescript
// Default: environment = 'dev'
// In git repo: effectiveEnv = `${repoName}_dev`
```

**New Logic**:
```typescript
// Default:
//   - In git repo: environment = repoName
//   - Not in git repo: environment = 'dev'
// If --env specified: use that (with repo prefix if in repo)
```

**Changes**:
- Update command default from `'dev'` to dynamic value based on git context
- Modify `getRepoAwareEnvironment()` logic
- Update all command registration defaults

### 2. Migration Script

**File**: `src/commands/migrate.ts`

```typescript
lsh migrate v2
```

**What it does**:
1. Scans `~/.lsh/secrets-cache/` for v1.x environments
2. Identifies `repo_dev` patterns
3. Offers to copy/rename to v2.0 format (`repo`)
4. Creates backup before migration
5. Updates IPFS cache and metadata

### 3. Backward Compatibility Mode

**Environment Variable**: `LSH_V1_COMPAT=true`

For users who want to keep v1.x behavior temporarily:
```bash
export LSH_V1_COMPAT=true
lsh push  # Still uses repo_dev format
```

## 📊 Migration Path for Users

### Scenario 1: Single User, Single Repo
```bash
# 1. Update to v2.0
npm install -g lsh-framework@2.0.0

# 2. Run migration
lsh migrate v2

# Output:
# Found v1.x environment: lsh_test_repo_dev
# Migrate to: lsh_test_repo? (Y/n)
# ✅ Migrated lsh_test_repo_dev → lsh_test_repo

# 3. Continue as normal
lsh push  # Now uses lsh_test_repo
```

### Scenario 2: Team with Multiple Hosts

**Coordinator announces**:
```
Team: We're migrating to LSH v2.0!

1. Everyone update: npm update -g lsh-framework
2. Coordinator runs: lsh migrate v2 --push
3. Everyone else runs: lsh pull
```

**Step-by-step**:
```bash
# Coordinator (Host A):
npm update -g lsh-framework@2.0.0
lsh migrate v2                   # Migrates local cache
lsh migrate v2 --push            # Pushes to IPFS in new format

# Team members (Host B, C, D):
npm update -g lsh-framework@2.0.0
lsh pull                         # Pulls from new environment
```

### Scenario 3: Multiple Environments

```bash
# Migrate all environments
lsh migrate v2 --all

# Output:
# Found environments:
#   - lsh_test_repo_dev → lsh_test_repo
#   - lsh_test_repo_staging → lsh_test_repo_staging (no change)
#   - lsh_test_repo_production → lsh_test_repo_production (no change)
#
# Migrate? (Y/n)
```

## 🛡️ Safety Features

### 1. Dry Run
```bash
lsh migrate v2 --dry-run
# Shows what would be migrated without actually doing it
```

### 2. Automatic Backup
```bash
# Migration creates backup:
~/.lsh/backups/v1-migration-2024-11-24/
```

### 3. Rollback
```bash
lsh migrate v2 --rollback
# Restores from backup
```

## 📝 Documentation Updates

### Files to Update:
- [ ] README.md - Update all examples
- [ ] docs/features/secrets/SECRETS_GUIDE.md
- [ ] docs/features/secrets/SECRETS_QUICK_REFERENCE.md
- [ ] docs/releases/2.0.0.md - Comprehensive migration guide
- [ ] examples/* - Update all example scripts

### Key Messaging:
- **What changed**: Default environment naming
- **Why it changed**: Simpler, more intuitive
- **How to migrate**: Run `lsh migrate v2`
- **Compatibility**: V1 compat mode available

## 🧪 Testing Plan

### Test Cases:
1. ✅ Migration from v1.x `repo_dev` to v2.0 `repo`
2. ✅ New install (no migration needed)
3. ✅ Multiple environments (only _dev affected)
4. ✅ Team sync after migration
5. ✅ Rollback functionality
6. ✅ Compatibility mode (`LSH_V1_COMPAT=true`)

## 📅 Release Timeline

### Phase 1: Development (Current)
- Implement new environment logic
- Create migration script
- Update documentation

### Phase 2: Beta Testing
- Release v2.0.0-beta.1
- Test with early adopters
- Gather feedback

### Phase 3: General Release
- Release v2.0.0
- Announce on GitHub, npm
- Provide migration support

## ⚠️ Known Issues

### Issue 1: Orphaned v1.x Environments
If users don't migrate, old `repo_dev` environments remain in IPFS.

**Solution**: Document cleanup command
```bash
lsh env --cleanup-old
```

### Issue 2: Mixed Version Teams
If team has mix of v1.x and v2.0 users.

**Solution**:
- Migration requires coordination
- All team members should update together
- Compatibility mode for transition period

## 🎉 Benefits

### For New Users:
- Simpler mental model
- Less to remember
- Obvious default behavior

### For Existing Users:
- More intuitive naming
- Cleaner environment list
- Still supports explicit `--env` for dev/staging/prod

## 📚 References

- Original issue: User feedback 2024-11-24
- Design discussion: "env name should just be the same as the repo name"
- Breaking changes: v1.x → v2.0 compatibility
