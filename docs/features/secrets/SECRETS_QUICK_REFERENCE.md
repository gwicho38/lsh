# LSH Secrets Manager - Quick Reference 🔐

## 🚀 Your Credentials

```bash
SUPABASE_URL=https://uljsqvwkomdrlnofmlad.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsanNxdndrb21kcmxub2ZtbGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDIyNDQsImV4cCI6MjA3MjM3ODI0NH0.QCpfcEpxGX_5Wn8ljf_J2KWjJLGdF8zRsV_7OatxmHI
LSH_SECRETS_KEY=fdc6fca3488483b15315e9512083c26de2e973671f3211cb6015bb86ba09fe02
```

⚠️ **Keep these safe!** Store in 1Password/LastPass

---

## 📦 Your Environments

| Environment | Project | Secrets |
|-------------|---------|---------|
| `lsh-dev` | LSH Shell | 25 vars |
| `mcli-dev` | MCLI | 25 vars |
| `myrpg-dev` | MyRPG | 25 vars |
| `myai-dev` | MyAI Dev | 23 vars |
| `myai-prod` | MyAI Production | 49 vars |
| `myai-staging` | MyAI Staging | 44 vars |
| `myai-test` | MyAI Test | 42 vars |

---

## 💻 New Machine Setup (One-Time)

```bash
# 1. Install LSH
npm install -g gwicho38-lsh

# 2. Create config directory
mkdir -p ~/.lsh-config

# 3. Add your credentials
cat > ~/.lsh-config/.env <<EOF
SUPABASE_URL=https://uljsqvwkomdrlnofmlad.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsanNxdndrb21kcmxub2ZtbGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDIyNDQsImV4cCI6MjA3MjM3ODI0NH0.QCpfcEpxGX_5Wn8ljf_J2KWjJLGdF8zRsV_7OatxmHI
LSH_SECRETS_KEY=fdc6fca3488483b15315e9512083c26de2e973671f3211cb6015bb86ba09fe02
EOF

# 4. Done! Start pulling secrets
```

---

## 🚀 Smart Sync (Recommended - New!)

```bash
# Smart sync - automatically handles everything!
cd ~/repos/my-project
lsh sync

# Smart sync AND load in one command!
eval "$(lsh sync --load)"

# Now your secrets are synced AND loaded in your shell
echo $DATABASE_URL
```

## 📥 Pull Secrets (Manual Method)

```bash
# MCLI Project
cd ~/repos/mcli
lsh pull --env mcli-dev

# MyRPG Project
cd ~/repos/myRPG
lsh pull --env myrpg-dev

# MyAI Projects
cd ~/repos/myAi
lsh pull --env myai-dev        # Development
lsh pull --env myai-staging    # Staging
lsh pull --env myai-prod       # Production

# LSH Shell
cd ~/repos/lsh
lsh pull --env lsh-dev
```

---

## 📤 Push Secrets (After Updates)

```bash
# Push from current directory
lsh push --env mcli-dev

# Push specific file
lsh push --file .env.production --env myai-prod

# Push with absolute path
lsh push --file /path/to/.env --env custom-env
```

---

## 🔍 View & Manage

```bash
# List all environments
lsh list

# Show secrets (masked)
lsh show --env mcli-dev

# Generate new encryption key
lsh key
```

---

## 🛠️ Common Workflows

### Starting Work on New Machine
```bash
cd ~/repos/mcli
lsh pull --env mcli-dev
npm install
npm start
```

### Updating API Keys
```bash
# 1. Edit .env
nano ~/repos/mcli/.env

# 2. Push changes
lsh push --env mcli-dev

# 3. Pull on other machines
lsh pull --env mcli-dev
```

### Setting Up New Project
```bash
cd ~/repos/new-project

# Push first time
lsh push --env new-project-dev

# Pull on other machines
lsh pull --env new-project-dev
```

---

## 🚨 Troubleshooting

### "No secrets found"
```bash
# Make sure environment exists
lsh list

# Push if missing
lsh push --env myenv
```

### "Decryption failed"
```bash
# Wrong encryption key!
# Check LSH_SECRETS_KEY matches the one used to encrypt
echo $LSH_SECRETS_KEY
```

### "Supabase not configured"
```bash
# Add to .env or ~/.lsh-config/.env:
SUPABASE_URL=https://uljsqvwkomdrlnofmlad.supabase.co
SUPABASE_ANON_KEY=eyJh...
```

### "File not found"
```bash
# Use absolute path
lsh push --file /home/user/project/.env --env myenv

# Or cd to directory first
cd ~/repos/project
lsh push --env myenv
```

---

## 📋 Cheat Sheet

| Command | Description |
|---------|-------------|
| `lsh sync` | 🆕 Smart sync (auto push/pull) |
| `lsh sync --load` | 🆕 Sync AND load into shell |
| `lsh list` | Show all environments |
| `lsh push` | Upload .env to cloud |
| `lsh pull` | Download .env from cloud |
| `lsh show` | View secrets (masked) |
| `lsh key` | Generate encryption key |

---

## 🎯 Pro Tips

1. **Backup your keys** - Save credentials in 1Password
2. **Team sharing** - Share `LSH_SECRETS_KEY` securely via 1Password shared vault
3. **Git ignore** - Never commit `.env` files (already in .gitignore)
4. **Multiple envs** - Use dev/staging/prod for different configs
5. **Quick setup** - Keep this file handy for new machines

---

## 📱 Mobile Quick Copy

```
SUPABASE_URL=https://uljsqvwkomdrlnofmlad.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsanNxdndrb21kcmxub2ZtbGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDIyNDQsImV4cCI6MjA3MjM3ODI0NH0.QCpfcEpxGX_5Wn8ljf_J2KWjJLGdF8zRsV_7OatxmHI
LSH_SECRETS_KEY=fdc6fca3488483b15315e9512083c26de2e973671f3211cb6015bb86ba09fe02
```

---

## 🔒 Security Checklist

- [ ] Credentials saved in 1Password
- [ ] `.env` in `.gitignore`
- [ ] `LSH_SECRETS_KEY` never committed to git
- [ ] Supabase 2FA enabled (recommended)
- [ ] Team members have secure key access

---

## 📞 Quick Help

**Need help?**
```bash
lsh --help
lsh push --help
lsh pull --help
```

**Full documentation:**
- `SECRETS_GUIDE.md` - Complete guide
- `SECRETS_QUICK_REFERENCE.md` - This file

---

**Last Updated:** October 2025
**Total Environments:** 7
**Total Secrets:** 233 variables

🎉 **You're all set!** No more copying .env files!
