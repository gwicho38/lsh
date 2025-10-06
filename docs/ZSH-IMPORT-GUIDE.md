# ZSH Import Guide

Complete guide to importing ZSH configurations into LSH with selective import, conflict resolution, and diagnostic logging.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Import Commands](#import-commands)
- [Auto-Import on Startup](#auto-import-on-startup)
- [Selective Import](#selective-import)
- [Conflict Resolution](#conflict-resolution)
- [Diagnostic Logging](#diagnostic-logging)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Overview

LSH can import your existing ZSH configurations including:
- ✅ Aliases
- ✅ Environment variables (exports)
- ✅ Shell functions
- ✅ ZSH options (setopt/unsetopt)
- ⏸️ Oh-My-Zsh plugins (partial support)

**New Enhanced Features:**
1. **Auto-import on startup** - Automatically load ZSH config when LSH starts
2. **Selective import** - Choose what to import (aliases only, exports only, etc.)
3. **Conflict resolution** - Handle naming conflicts (skip, overwrite, or rename)
4. **Diagnostic logging** - Failed imports are logged, not blocking
5. **Pattern matching** - Include/exclude items using wildcards

## Quick Start

### 1. Import Everything from .zshrc

```bash
lsh zsh-import all
```

This imports all aliases, exports, functions, and ZSH options from `~/.zshrc`.

### 2. Set Up Auto-Import

```bash
lsh zsh-import setup-auto-import
```

Now ZSH configs will be imported automatically every time you start LSH!

### 3. Check Import Status

```bash
lsh zsh-import status
```

Shows what was imported and any failures.

## Import Commands

### Import All Configurations

```bash
lsh zsh-import all [options]
```

**Options:**
- `--skip-conflicts` - Skip items that already exist (default)
- `--rename-conflicts` - Rename conflicts with `_zsh` suffix
- `--overwrite-conflicts` - Overwrite existing items
- `--exclude <patterns...>` - Exclude items matching patterns
- `--include <patterns...>` - Only import items matching patterns
- `--no-aliases` - Skip aliases
- `--no-exports` - Skip environment variables
- `--no-functions` - Skip functions
- `--no-options` - Skip ZSH options
- `--diagnostic-log <path>` - Custom log file path

**Example:**
```bash
# Import everything, rename conflicts
lsh zsh-import all --rename-conflicts

# Import everything except test functions
lsh zsh-import all --exclude 'test_*' --exclude '_*'

# Import only git-related items
lsh zsh-import all --include 'git*' --include 'g*'
```

### Import Aliases Only

```bash
lsh zsh-import aliases [options]
```

**Example:**
```bash
# Import all aliases
lsh zsh-import aliases

# Import only 'ls' aliases
lsh zsh-import aliases --include 'ls' --include 'l' --include 'll' --include 'la'

# Import aliases, rename conflicts
lsh zsh-import aliases --rename-conflicts
```

### Import Environment Variables Only

```bash
lsh zsh-import exports [options]
```

**Example:**
```bash
# Import all exports
lsh zsh-import exports

# Import only PATH-related exports
lsh zsh-import exports --include 'PATH' --include '*_PATH'
```

### Import Functions Only

```bash
lsh zsh-import functions [options]
```

**Example:**
```bash
# Import all functions
lsh zsh-import functions

# Import functions, rename conflicts
lsh zsh-import functions --rename-conflicts

# Exclude private functions
lsh zsh-import functions --exclude '_*'
```

## Auto-Import on Startup

### Enable Auto-Import

```bash
lsh zsh-import setup-auto-import
```

This adds a `zsh-source` command to your `~/.lshrc` file.

### Enable Auto-Import with Options

```bash
# Import only aliases on startup
lsh zsh-import setup-auto-import --aliases-only

# Import only exports on startup
lsh zsh-import setup-auto-import --exports-only

# Auto-import with conflict renaming
lsh zsh-import setup-auto-import --rename-conflicts
```

### Disable Auto-Import

```bash
lsh zsh-import setup-auto-import --disable
```

### Manual .lshrc Configuration

Edit `~/.lshrc` directly:

```bash
# Full auto-import
zsh-source

# Aliases only, rename conflicts
zsh-source --no-exports --no-functions --rename-conflicts

# Exclude test items
zsh-source --exclude 'test_*' --exclude '_*'
```

## Selective Import

### By Type

```bash
# Aliases only
lsh zsh-import aliases

# Exports only
lsh zsh-import exports

# Functions only
lsh zsh-import functions
```

### By Pattern (Wildcards)

**Include Patterns:**
```bash
# Import only git-related items
lsh zsh-import all --include 'git*'

# Import only ls aliases
lsh zsh-import aliases --include 'ls' --include 'l' --include 'll'
```

**Exclude Patterns:**
```bash
# Exclude test functions
lsh zsh-import all --exclude 'test_*'

# Exclude private items (starting with _)
lsh zsh-import all --exclude '_*'

# Multiple excludes
lsh zsh-import all --exclude 'test_*' --exclude 'tmp_*' --exclude 'debug_*'
```

**Pattern Syntax:**
- `*` matches any characters
- `?` matches single character
- `git*` matches `gitpush`, `gitstatus`, etc.
- `_*` matches `_myfunc`, `_private`, etc.

## Conflict Resolution

When an item already exists in LSH, you can choose how to handle it:

### Skip Conflicts (Default)

```bash
lsh zsh-import all --skip-conflicts
# or just
lsh zsh-import all
```

**Behavior:** Existing items are kept, conflicting imports are skipped.

### Rename Conflicts

```bash
lsh zsh-import all --rename-conflicts
```

**Behavior:** Conflicting items are renamed with `_zsh` suffix.

**Example:**
- ZSH has `alias ll='ls -la'`
- LSH already has `alias ll='ls -lah'`
- Import creates: `alias ll_zsh='ls -la'`

### Overwrite Conflicts

```bash
lsh zsh-import all --overwrite-conflicts
```

**Behavior:** ZSH items overwrite existing LSH items.

⚠️ **Warning:** This will replace your existing LSH configurations!

## Diagnostic Logging

All import operations are logged to `~/.lsh/zsh-import.log`.

### View Import Status

```bash
lsh zsh-import status
```

Shows:
- Total items processed
- Succeeded count
- Failed count
- Skipped count
- Conflicts count
- Breakdown by type (aliases, exports, functions)

### View Failed Imports

```bash
lsh zsh-import diagnose
```

Shows recent failed imports with reasons.

**Example output:**
```
📋 Recent ZSH Import Diagnostics (last 20 entries):

   2025-10-06T... function  failed    my_complex_func  [line 42] Parse error: ...
   2025-10-06T... alias     skipped   ll               [line 15] Conflict - alias already exists
   2025-10-06T... function  disabled  test_func        [line 89] Parse error: unsupported syntax
```

### Custom Diagnostic Log Path

```bash
lsh zsh-import all --diagnostic-log /tmp/my-import.log
```

### Log Format

Each log entry contains:
- Timestamp
- Type (alias, export, function, setopt, plugin)
- Status (success, failed, skipped, conflict, disabled)
- Item name
- Source line number
- Reason (for failures)
- Action taken (for conflicts)

## Examples

### Example 1: First-Time Import

```bash
# Import everything from .zshrc
lsh zsh-import all

# Check what was imported
lsh zsh-import status

# Check for failures
lsh zsh-import diagnose
```

### Example 2: Safe Import (Rename Conflicts)

```bash
# Import with conflict renaming
lsh zsh-import all --rename-conflicts

# Now you have both:
# - ll (your LSH alias)
# - ll_zsh (from ZSH)
```

### Example 3: Import Only Git Aliases

```bash
# Import only git-related aliases
lsh zsh-import aliases --include 'git*' --include 'g' --include 'ga' --include 'gc' --include 'gp'
```

### Example 4: Import Functions, Exclude Tests

```bash
# Import functions but skip test functions
lsh zsh-import functions --exclude 'test_*' --exclude '_test*'
```

### Example 5: Set Up Auto-Import

```bash
# Enable auto-import on startup
lsh zsh-import setup-auto-import --rename-conflicts

# Verify it's enabled
cat ~/.lshrc | grep zsh-source

# Output:
# zsh-source --rename-conflicts
```

### Example 6: Import with Multiple Excludes

```bash
# Import everything except temporary and debug items
lsh zsh-import all \
  --exclude 'tmp_*' \
  --exclude 'temp_*' \
  --exclude 'debug_*' \
  --exclude '_*' \
  --rename-conflicts
```

## Troubleshooting

### Issue: Import Shows "Parse Error"

**Problem:** Complex ZSH functions may fail to parse.

**Solution:**
```bash
# Check diagnostic log for details
lsh zsh-import diagnose

# Import manually skipping functions
lsh zsh-import all --no-functions

# Then manually add problem functions to ~/.lshrc
```

### Issue: Aliases Not Working

**Problem:** Alias exists but doesn't work as expected.

**Solution:**
```bash
# Check if alias was imported
lsh -c "alias | grep myalias"

# Reimport with overwrite
lsh zsh-import aliases --overwrite-conflicts --include 'myalias'
```

### Issue: Auto-Import Not Running

**Problem:** .lshrc not being sourced.

**Solution:**
```bash
# Check if .lshrc exists
ls -la ~/.lshrc

# Check if auto-import is enabled
cat ~/.lshrc | grep zsh-source

# Manually source it
lsh -c "source ~/.lshrc"
```

### Issue: Too Many Conflicts

**Problem:** Many items already exist in LSH.

**Solution:**
```bash
# Use rename strategy
lsh zsh-import all --rename-conflicts

# Or start fresh with selective import
lsh zsh-import aliases --include 'my*'  # Only your custom aliases
```

### Issue: Function Failed to Import

**Problem:** Diagnostic log shows "Parse error" for functions.

**Reasons:**
- Complex ZSH-specific syntax
- Advanced parameter expansion
- ZSH-specific built-ins

**Solution:**
```bash
# View the problematic function in .zshrc
cat ~/.zshrc | grep -A 20 "problem_function"

# Simplify the function or add manually to .lshrc
# Or create an LSH-compatible version
```

## Advanced Usage

### Combining with .lshrc

Your `~/.lshrc` can combine auto-import with custom configs:

```bash
# ~/.lshrc

# Auto-import ZSH (with safe defaults)
zsh-source --rename-conflicts --exclude '_*' --exclude 'test_*'

# Override specific items
alias ll='ls -lah --color=auto'

# Add LSH-specific aliases
alias lsh-update='lsh self update'

# Define LSH functions
my_lsh_func() {
  echo "This is LSH-specific!"
}
```

### Import from Custom ZSH File

```bash
# Import from custom file (not .zshrc)
export ZSHRC_PATH=~/.zshrc.custom
lsh zsh-import all
```

### Dry Run (Planned Feature)

```bash
# See what would be imported without actually importing
lsh zsh-import all --dry-run  # Coming soon!
```

## Best Practices

1. **Start with selective import** - Import aliases first, then exports, then functions
2. **Use rename conflicts** - Safer than overwrite, keeps both versions
3. **Use patterns to exclude** - Skip test functions and private items (`_*`)
4. **Check diagnostics** - Always review failed imports
5. **Test before auto-import** - Manual import first, then enable auto-import
6. **Keep .lshrc clean** - Use auto-import instead of copying everything

## See Also

- [Interactive Shell Guide](./INTERACTIVE-SHELL.md)
- [LSH Configuration](./CONFIGURATION.md)
- [ZSH Compatibility](./ZSH-COMPATIBILITY.md)
