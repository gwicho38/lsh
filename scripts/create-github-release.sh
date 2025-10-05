#!/bin/bash
# Create GitHub Release using gh CLI
# Usage: ./scripts/create-github-release.sh v0.5.2

set -e

VERSION=${1:-$(git describe --tags --abbrev=0)}

if [ -z "$VERSION" ]; then
    echo "❌ No version specified and no tags found"
    echo "Usage: $0 v0.5.2"
    exit 1
fi

echo "🚀 Creating GitHub Release for $VERSION"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found"
    echo "Install: brew install gh"
    exit 1
fi

# Create release
gh release create "$VERSION" \
    --title "Release $VERSION" \
    --notes "## Changes in $VERSION

See [CHANGELOG.md](https://github.com/gwicho38/lsh/blob/main/CHANGELOG.md) for details.

### Installation
\`\`\`bash
npm install -g gwicho38-lsh@latest
# or
lsh self update
\`\`\`

### Verification
\`\`\`bash
lsh self version
# Should show: $VERSION
\`\`\`
" \
    --latest

echo "✅ Release created: https://github.com/gwicho38/lsh/releases/tag/$VERSION"
