# Ralph Agent Configuration

## Autonomous Operation Mode

Ralph operates as a **continuous improvement agent**. Unlike task-driven development, Ralph:
- Analyzes the codebase to discover issues
- Reasons about improvement priorities
- Self-assigns tasks based on impact
- Maintains a perpetual backlog of improvements

## Build & Test Instructions

### Build
```bash
npm install && npm run build
```

### Test
```bash
npm test
```

### Lint
```bash
npm run lint
```

## Analysis Commands

### Initial Analysis (Run at start of each session)
```bash
# Check git status
git status
git log --oneline -5

# Run tests
npm test

# Run linter
npm run lint
```

### Security Analysis
```bash
# Check for secrets accidentally committed
grep -rn "password\|secret\|api_key\|token" --include="*.py" --include="*.ts" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v ".pyc" | head -20
```

## Reasoning Framework

When deciding what to work on, use this priority matrix:

| Impact | Effort | Priority |
|--------|--------|----------|
| High   | Low    | 🔴 Do First |
| High   | High   | 🟡 Plan Carefully |
| Low    | Low    | 🟢 Quick Win |
| Low    | High   | ⚪ Deprioritize |

### Impact Factors
- **Security**: Vulnerabilities = highest impact
- **Stability**: Production bugs > dev-only issues
- **Testing**: Critical paths > edge cases
- **Typing**: Public APIs > internal code

### Effort Estimation
- **1 loop**: Single file, < 50 lines changed
- **2-3 loops**: Multiple files, < 200 lines
- **4+ loops**: Architectural change, break into smaller tasks

## End-of-Loop Workflow (REQUIRED)

**After completing work in each loop, you MUST build, commit, and push.**

### Complete Workflow:
```bash
# Step 1: Run tests (MUST PASS before proceeding)
npm test

# Step 2: Run build (MUST SUCCEED before proceeding)
npm install && npm run build

# Step 3: Run lint/format (fix any issues)
npm run lint

# Step 4: Stage all changes
git add -A

# Step 5: Commit with conventional message
git commit -m "type(scope): description

- Detail 1
- Detail 2"

# Step 6: Push to remote (REQUIRED)
git push
```

### Commit Message Format:
```bash
# Types: feat, fix, test, refactor, security, docs, chore, perf
git commit -m "fix(auth): add input validation to login endpoint"
git commit -m "feat(api): implement rate limiting middleware"
git commit -m "test(utils): add edge case tests for parser"
git commit -m "security(deps): update vulnerable dependencies"
git commit -m "refactor(core): extract retry logic into utility"
```

### Pre-Commit Checks:
1. ✅ All tests pass
2. ✅ Build succeeds
3. ✅ Lint passes (no errors)
4. ✅ No secrets/credentials in diff
5. ✅ fix_plan.md is updated

### If Checks Fail:
- **Test failure**: Fix the test or revert changes
- **Build failure**: Fix build errors before committing
- **Lint failure**: Run auto-fix or manually correct
- **Cannot fix**: Revert with `git checkout -- .` and document in fix_plan.md

### Push Policy:
- **ALWAYS push after every successful commit**
- **NEVER leave commits unpushed**
- If push fails (e.g., conflicts), resolve and push immediately

## Notes
- Every loop should end with a push (if changes were made)
- Update fix_plan.md BEFORE committing (include in same commit)
- Discover new issues while working - add them to backlog
- The backlog should never be empty

## GitHub Issue Polling (REQUIRED - EVERY LOOP)

**CRITICAL**: At the start of EVERY execution loop, you MUST poll GitHub issues.

### Required Polling Commands:
```bash
gh issue list --state open --limit 20
gh issue list --label "bug" --state open
gh issue list --label "ralph-task" --state open
gh issue list --assignee @me --state open
```

### Issue Priority:
1. **P0 - Critical bugs**: Work on immediately
2. **P1 - ralph-task labeled**: High priority for autonomous work
3. **P2 - Open bugs**: Address when no higher priority items

### Issue Workflow:
- **ALWAYS check GitHub issues first** before picking a task
- Create branches from issues: `git checkout -b fix/issue-<number>-description`
- Reference issue numbers in commits: `fix: description (fixes #<number>)`
- Close issues when PRs are merged

## Feature Branch → PR → Merge Workflow (REQUIRED)

**CRITICAL**: When on a feature branch (not main/master), complete the full PR lifecycle within the execution loop.

### Required Steps:
```bash
# 1. Push feature branch
git push -u origin HEAD

# 2. Create PR
gh pr create --fill --base main

# 3. Wait for CI
gh run watch

# 4. Merge after CI passes
gh pr merge --squash --delete-branch

# 5. Switch back to main
git checkout main && git pull origin main
```

### Rules:
- **NEVER** leave feature branches unmerged
- **ALWAYS** delete branch after merge
- If CI fails, fix and retry until merged

