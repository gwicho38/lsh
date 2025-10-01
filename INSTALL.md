# LSH Installation Guide

Complete installation instructions for LSH (Luis Shell) - A powerful, extensible shell with advanced job management and database persistence.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
  - [Option 1: Install from npm (Recommended)](#option-1-install-from-npm-recommended)
  - [Option 2: Install from Source](#option-2-install-from-source)
  - [Option 3: Quick Install Script](#option-3-quick-install-script)
- [Configuration](#configuration)
- [Updating LSH](#updating-lsh)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Uninstallation](#uninstallation)

## Prerequisites

Before installing LSH, ensure you have:

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Operating System**: macOS, Linux, or Windows (with WSL)

Check your versions:

```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be 8.0.0 or higher
```

If you need to install or update Node.js, visit [nodejs.org](https://nodejs.org/).

## Installation Methods

### Option 1: Install from npm (Recommended)

The easiest way to install LSH is from the npm registry:

```bash
# Install globally
npm install -g lsh

# Or with sudo if you encounter permission errors
sudo npm install -g lsh
```

**Verify installation:**

```bash
lsh --version
lsh --help
```

### Option 2: Install from Source

For development or to use the latest features:

```bash
# Clone the repository
git clone https://github.com/lefv/lsh.git
cd lsh

# Install dependencies
npm install

# Build the project
npm run build

# Link globally for development
npm link

# Or install globally with sudo
sudo npm link
```

**Verify installation:**

```bash
lsh --version
which lsh  # Should show the global npm bin path
```

### Option 3: Quick Install Script

Use the automated installation script:

```bash
# Install from npm (default)
curl -fsSL https://raw.githubusercontent.com/lefv/lsh/main/scripts/install.sh | bash

# Or install from source
curl -fsSL https://raw.githubusercontent.com/lefv/lsh/main/scripts/install.sh | bash -s -- --source

# With sudo for global installation
curl -fsSL https://raw.githubusercontent.com/lefv/lsh/main/scripts/install.sh | bash -s -- --sudo
```

The script will:
- Check prerequisites
- Install LSH
- Verify installation
- Optionally set up shell integration

## Configuration

### 1. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Core Configuration
USER=your_username
HOME=/home/your_username
NODE_ENV=development

# API Configuration (optional)
LSH_API_ENABLED=false
LSH_API_PORT=3030
LSH_API_KEY=your_api_key_here

# Database (optional - for persistence features)
DATABASE_URL=postgresql://localhost:5432/lsh
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

# Security
LSH_ALLOW_DANGEROUS_COMMANDS=false
```

### 2. Initialize Configuration

```bash
# Initialize default .lshrc configuration
lsh config --init

# Verify configuration
lsh config --show

# Validate configuration
lsh config --validate
```

### 3. Shell Integration

Add LSH to your shell RC file for easy access:

**For Bash (~/.bashrc):**

```bash
# LSH Shell Integration
export PATH="$PATH:$(npm prefix -g)/bin"
```

**For Zsh (~/.zshrc):**

```bash
# LSH Shell Integration
export PATH="$PATH:$(npm prefix -g)/bin"

# Optional: Enable ZSH compatibility mode
alias lsh="lsh --zsh-compat"
```

**Apply changes:**

```bash
# Bash
source ~/.bashrc

# Zsh
source ~/.zshrc
```

## Updating LSH

LSH includes a built-in self-update mechanism:

### Check for Updates

```bash
lsh self update --check
```

### Install Updates

```bash
# Interactive update (asks for confirmation)
lsh self update

# Auto-update without confirmation
lsh self update --yes
```

### Manual Update

```bash
# Update from npm
npm update -g lsh

# Or with sudo
sudo npm update -g lsh
```

## Verification

After installation, verify everything is working:

```bash
# Check version
lsh --version

# Show installation info
lsh self info

# Test basic commands
lsh --help
lsh config --show

# Start interactive shell
lsh
```

## Troubleshooting

### Command Not Found

If `lsh` command is not found after installation:

1. **Check npm global bin path:**
   ```bash
   npm prefix -g
   ```

2. **Add to PATH:**
   ```bash
   export PATH="$PATH:$(npm prefix -g)/bin"
   ```

3. **Refresh shell:**
   ```bash
   hash -r    # For bash/zsh
   rehash     # For zsh
   ```

4. **Restart terminal**

### Permission Errors

If you encounter EACCES errors:

**Option 1: Use sudo**
```bash
sudo npm install -g lsh
```

**Option 2: Fix npm permissions (recommended)**
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

Add to your `~/.bashrc` or `~/.zshrc`:
```bash
export PATH=~/.npm-global/bin:$PATH
```

### Build Errors

If compilation fails during source installation:

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

### Version Mismatch

If you see version mismatch errors:

```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm uninstall -g lsh
npm install -g lsh
```

## Platform-Specific Notes

### macOS

```bash
# Install with Homebrew Node.js (recommended)
brew install node
npm install -g lsh
```

### Linux

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm
sudo npm install -g lsh

# RHEL/CentOS/Fedora
sudo yum install nodejs npm
sudo npm install -g lsh

# Arch Linux
sudo pacman -S nodejs npm
sudo npm install -g lsh
```

### Windows (WSL)

LSH works best on Windows through WSL2:

```bash
# In WSL terminal
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g lsh
```

## Uninstallation

To remove LSH:

```bash
# Uninstall global package
npm uninstall -g lsh

# Or with sudo
sudo npm uninstall -g lsh

# Remove configuration (optional)
rm -rf ~/.lsh*
rm -rf ~/.config/lsh
```

## Additional Resources

- **Documentation**: [README.md](README.md)
- **GitHub**: https://github.com/lefv/lsh
- **Issues**: https://github.com/lefv/lsh/issues
- **Environment Configuration**: [.env.example](.env.example)

## Getting Help

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Review [existing issues](https://github.com/lefv/lsh/issues)
3. Create a [new issue](https://github.com/lefv/lsh/issues/new) with:
   - Your OS and version
   - Node.js and npm versions
   - Full error message
   - Steps to reproduce

## Next Steps

After successful installation:

1. **Read the README**: `lsh --help` or see [README.md](README.md)
2. **Try interactive mode**: `lsh`
3. **Explore features**: `lsh config --show`
4. **Check version info**: `lsh self info`

Welcome to LSH! 🚀
