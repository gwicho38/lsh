#!/bin/bash
# LSH Release Helper Script
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

VERSION_TYPE=${1:-patch}

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       LSH Release Process             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check git status
echo -e "${YELLOW}[1/8] Checking git status...${NC}"
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}✗ Uncommitted changes detected!${NC}"
    echo "Please commit or stash your changes first."
    exit 1
fi
echo -e "${GREEN}✓ Working directory is clean${NC}"
echo ""

# Step 2: Pull latest
echo -e "${YELLOW}[2/8] Pulling latest from origin...${NC}"
git pull origin main
echo -e "${GREEN}✓ Up to date with origin/main${NC}"
echo ""

# Step 3: Run tests
echo -e "${YELLOW}[3/8] Running tests...${NC}"
npm test
echo -e "${GREEN}✓ All tests passed${NC}"
echo ""

# Step 4: Build
echo -e "${YELLOW}[4/8] Building project...${NC}"
# Clean any root-owned build artifacts first
sudo rm -rf dist types lsh 2>/dev/null || true
npm run build
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Step 5: Bump version
echo -e "${YELLOW}[5/8] Bumping version ($VERSION_TYPE)...${NC}"
OLD_VERSION=$(node -p "require('./package.json').version")
npm version $VERSION_TYPE --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✓ Version bumped: ${OLD_VERSION} → ${NEW_VERSION}${NC}"
echo ""

# Step 6: Commit and tag
echo -e "${YELLOW}[6/8] Creating git commit and tag...${NC}"
git add package.json package-lock.json
git commit -m "chore: bump version to ${NEW_VERSION}"
git tag "v${NEW_VERSION}"
echo -e "${GREEN}✓ Created commit and tag v${NEW_VERSION}${NC}"
echo ""

# Step 7: Push to GitHub
echo -e "${YELLOW}[7/8] Pushing to GitHub...${NC}"
read -p "Push to GitHub? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main
    git push origin "v${NEW_VERSION}"
    echo -e "${GREEN}✓ Pushed to GitHub${NC}"
    echo ""
    echo -e "${CYAN}GitHub Actions will now:${NC}"
    echo -e "  1. Run CI tests"
    echo -e "  2. Publish to npm (if CI passes)"
    echo -e "  3. Create GitHub release"
    echo ""
    echo -e "${CYAN}Monitor progress: https://github.com/gwicho38/lsh/actions${NC}"
else
    echo -e "${YELLOW}Skipped push to GitHub${NC}"
    echo -e "${YELLOW}To push manually:${NC}"
    echo -e "  git push origin main"
    echo -e "  git push origin v${NEW_VERSION}"
fi
echo ""

# Step 8: Summary
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Release Summary               ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo -e "${GREEN}Version:${NC} ${NEW_VERSION}"
echo -e "${GREEN}Tag:${NC} v${NEW_VERSION}"
echo -e "${GREEN}Status:${NC} Ready for publication"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Wait for CI to pass"
echo -e "  2. Check npm: npm view gwicho38-lsh version"
echo -e "  3. Test install: lsh self update"
echo ""
