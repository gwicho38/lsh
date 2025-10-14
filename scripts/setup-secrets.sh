#!/bin/bash
# LSH Secrets Setup Helper

set -e

echo "🔐 LSH Secrets Setup"
echo "===================="
echo ""

# Check if we're in lsh directory
if [ ! -f "package.json" ] || ! grep -q "gwicho38-lsh" package.json 2>/dev/null; then
  echo "⚠️  Please run this from the lsh directory"
  exit 1
fi

# Check if Supabase is configured
if grep -q "^SUPABASE_URL=https://" .env 2>/dev/null; then
  echo "✅ Supabase already configured"
  SUPABASE_URL=$(grep "^SUPABASE_URL=" .env | cut -d= -f2)
  SUPABASE_KEY=$(grep "^SUPABASE_ANON_KEY=" .env | cut -d= -f2)
else
  echo "📝 Supabase Setup"
  echo ""
  echo "1. Go to https://supabase.com"
  echo "2. Sign in (or create account - it's free!)"
  echo "3. Create a new project"
  echo "4. Go to Settings → API"
  echo "5. Copy your Project URL and anon/public key"
  echo ""
  read -p "Enter your Supabase URL: " SUPABASE_URL
  read -p "Enter your Supabase anon key: " SUPABASE_KEY

  # Add to .env
  if grep -q "^SUPABASE_URL=" .env 2>/dev/null; then
    sed -i "s|^SUPABASE_URL=.*|SUPABASE_URL=$SUPABASE_URL|" .env
    sed -i "s|^SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$SUPABASE_KEY|" .env
  else
    echo "" >> .env
    echo "SUPABASE_URL=$SUPABASE_URL" >> .env
    echo "SUPABASE_ANON_KEY=$SUPABASE_KEY" >> .env
  fi

  echo "✅ Supabase configured"
fi

echo ""

# Check if encryption key exists
if grep -q "^LSH_SECRETS_KEY=" .env 2>/dev/null && [ -n "$(grep "^LSH_SECRETS_KEY=" .env | cut -d= -f2)" ]; then
  echo "✅ Encryption key already set"
  SECRETS_KEY=$(grep "^LSH_SECRETS_KEY=" .env | cut -d= -f2)
else
  echo "🔑 Generating encryption key..."
  SECRETS_KEY=$(openssl rand -hex 32)

  if grep -q "^LSH_SECRETS_KEY=" .env 2>/dev/null; then
    sed -i "s|^LSH_SECRETS_KEY=.*|LSH_SECRETS_KEY=$SECRETS_KEY|" .env
  else
    echo "LSH_SECRETS_KEY=$SECRETS_KEY" >> .env
  fi

  echo "✅ Encryption key generated and saved"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Your Configuration:"
echo "  Supabase URL: ${SUPABASE_URL:0:40}..."
echo "  Encryption Key: ${SECRETS_KEY:0:20}...${SECRETS_KEY: -20}"
echo ""
echo "💾 Save these in a secure location (1Password, etc.)!"
echo ""
echo "🚀 Next Steps:"
echo "  1. Push your lsh secrets:       ./lsh secrets push"
echo "  2. Push mcli secrets:           cd ~/repos/mcli && lsh secrets push --env mcli"
echo "  3. Push myRPG secrets:          cd ~/repos/myRPG && lsh secrets push --env myrpg"
echo "  4. Push myAi secrets:           cd ~/repos/myAi && lsh secrets push --env myai-dev"
echo ""
echo "📱 On other machines:"
echo "  1. Create .env with Supabase + encryption key"
echo "  2. Run: lsh secrets pull"
echo ""
