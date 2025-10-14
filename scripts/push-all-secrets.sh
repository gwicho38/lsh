#!/bin/bash
# Push secrets for all projects

set -e

echo "🚀 Pushing Secrets for All Projects"
echo "===================================="
echo ""

# Get the lsh command path
LSH_CMD="$(cd "$(dirname "$0")/.." && pwd)/lsh"

if [ ! -f "$LSH_CMD" ]; then
  echo "❌ lsh command not found at: $LSH_CMD"
  echo "   Make sure you're running this from the lsh directory"
  exit 1
fi

# Check if Supabase is configured
if ! grep -q "^SUPABASE_URL=https://" "$(dirname "$0")/../.env" 2>/dev/null; then
  echo "⚠️  Supabase not configured!"
  echo ""
  echo "Run the setup script first:"
  echo "  ./scripts/setup-secrets.sh"
  echo ""
  exit 1
fi

echo "Using lsh at: $LSH_CMD"
echo ""

# Function to push secrets
push_secrets() {
  local project_dir="$1"
  local env_name="$2"
  local env_file="${3:-.env}"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 $env_name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ ! -d "$project_dir" ]; then
    echo "⚠️  Directory not found: $project_dir"
    echo ""
    return
  fi

  cd "$project_dir"

  if [ ! -f "$env_file" ]; then
    echo "⚠️  No $env_file file found"
    echo ""
    return
  fi

  # Count non-empty, non-comment lines
  local count=$(grep -v "^#" "$env_file" | grep -v "^$" | wc -l)
  echo "📄 File: $env_file ($count vars)"

  # Push to cloud
  if "$LSH_CMD" secrets push --file "$env_file" --env "$env_name" 2>&1; then
    echo "✅ Pushed successfully"
  else
    echo "❌ Failed to push"
  fi

  echo ""
}

# Push LSH secrets
push_secrets "$(dirname "$0")/.." "lsh-dev" ".env"

# Push mcli secrets
push_secrets "$HOME/repos/mcli" "mcli-dev" ".env"

# Push myRPG secrets
push_secrets "$HOME/repos/myRPG" "myrpg-dev" ".env"

# Push myAi secrets
push_secrets "$HOME/repos/myAi" "myai-dev" ".env"
push_secrets "$HOME/repos/myAi" "myai-prod" ".env.production"
push_secrets "$HOME/repos/myAi" "myai-staging" ".env.staging"
push_secrets "$HOME/repos/myAi" "myai-test" ".env.test"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ All Done!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 View all environments:"
echo "  ./lsh secrets list"
echo ""
echo "🔍 Show secrets (masked):"
echo "  ./lsh secrets show --env mcli-dev"
echo "  ./lsh secrets show --env myai-dev"
echo ""
echo "💻 Pull on another machine:"
echo "  lsh secrets pull --env mcli-dev"
echo "  lsh secrets pull --env myai-prod"
echo ""
