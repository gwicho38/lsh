#!/bin/bash
# Install git hooks for LSH development
# Run this script after cloning the repository: ./scripts/install-git-hooks.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

echo "Installing git hooks..."

# Create pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
# Pre-commit hook: Run linter before allowing commit

echo "🔍 Running ESLint..."
npm run lint

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Lint failed! Commit aborted."
  echo "💡 Fix linting errors with: npm run lint:fix"
  echo "   Or skip this hook with: git commit --no-verify"
  exit 1
fi

echo "✅ Lint passed!"
exit 0
EOF

chmod +x "$HOOKS_DIR/pre-commit"

echo "✅ Git hooks installed successfully!"
echo ""
echo "Installed hooks:"
echo "  - pre-commit: Runs ESLint before commits"
echo ""
echo "To skip hooks on a specific commit, use: git commit --no-verify"
