# ZSH Import - Quick Reference

## Quick Start

```bash
# Import everything from .zshrc
lsh zsh-import all

# Enable auto-import on startup
lsh zsh-import setup-auto-import

# Check status
lsh zsh-import status
```

## Import Commands

| Command | Description |
|---------|-------------|
| `lsh zsh-import all` | Import everything (aliases, exports, functions, options) |
| `lsh zsh-import aliases` | Import only aliases |
| `lsh zsh-import exports` | Import only environment variables |
| `lsh zsh-import functions` | Import only functions |
| `lsh zsh-import status` | Show import statistics |
| `lsh zsh-import diagnose` | Show failed imports |
| `lsh zsh-import setup-auto-import` | Configure auto-import on startup |

## Common Options

| Option | Description |
|--------|-------------|
| `--skip-conflicts` | Skip conflicting items (default) |
| `--rename-conflicts` | Rename conflicts with `_zsh` suffix |
| `--overwrite-conflicts` | Overwrite existing items |
| `--exclude <pattern>` | Exclude items matching pattern |
| `--include <pattern>` | Only include items matching pattern |
| `--no-aliases` | Skip aliases |
| `--no-exports` | Skip exports |
| `--no-functions` | Skip functions |

## Examples

### Import with Conflict Renaming
```bash
lsh zsh-import all --rename-conflicts
```

### Import Only Git Aliases
```bash
lsh zsh-import aliases --include 'git*' --include 'g*'
```

### Exclude Test Functions
```bash
lsh zsh-import functions --exclude 'test_*' --exclude '_*'
```

### Auto-Import Aliases Only
```bash
lsh zsh-import setup-auto-import --aliases-only --rename-conflicts
```

## Pattern Matching

- `*` = any characters
  Example: `git*` matches `gitpush`, `gitstatus`

- `?` = single character
  Example: `g?` matches `ga`, `gc`

- Multiple patterns:
  `--exclude 'test_*' --exclude '_*' --exclude 'tmp_*'`

## Conflict Resolution

| Strategy | Flag | Behavior |
|----------|------|----------|
| **Skip** | `--skip-conflicts` | Keep existing, skip import (default) |
| **Rename** | `--rename-conflicts` | Import as `name_zsh` |
| **Overwrite** | `--overwrite-conflicts` | Replace existing with ZSH version |

## Auto-Import Setup

### Enable
```bash
# Full auto-import
lsh zsh-import setup-auto-import

# Aliases only
lsh zsh-import setup-auto-import --aliases-only

# With conflict renaming
lsh zsh-import setup-auto-import --rename-conflicts
```

### Disable
```bash
lsh zsh-import setup-auto-import --disable
```

### Manual .lshrc
```bash
# Add to ~/.lshrc
zsh-source --rename-conflicts --exclude '_*'
```

## Diagnostic Logging

All imports logged to: `~/.lsh/zsh-import.log`

```bash
# View statistics
lsh zsh-import status

# View failures
lsh zsh-import diagnose

# View last 50 entries
lsh zsh-import diagnose -n 50

# View log file directly
tail -f ~/.lsh/zsh-import.log
```

## Log Entry Format

```
[TIMESTAMP] [TYPE] [STATUS] [NAME] [SOURCE] [REASON]

Example:
2025-10-06T... alias   success  ll        [line 15]
2025-10-06T... function failed   myfunc    [line 42] Parse error: ...
2025-10-06T... export  skipped  PATH      [line 8]  Conflict - already exists
```

## Status Types

- ✅ `success` - Imported successfully
- ❌ `failed` - Import failed (syntax error, etc.)
- ⏭️ `skipped` - Skipped (excluded or conflict)
- ⚠️ `conflict` - Naming conflict detected
- 🚫 `disabled` - Disabled due to error

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Parse errors | Check diagnostic log: `lsh zsh-import diagnose` |
| Alias not working | Reimport with overwrite: `lsh zsh-import aliases --overwrite-conflicts` |
| Auto-import not running | Check `~/.lshrc`: `cat ~/.lshrc \| grep zsh` |
| Too many conflicts | Use rename: `lsh zsh-import all --rename-conflicts` |

## What Gets Imported

✅ **Aliases**
```bash
alias ll='ls -la'
```

✅ **Exports**
```bash
export PATH="$HOME/bin:$PATH"
export EDITOR=vim
```

✅ **Functions**
```bash
myfunc() {
  echo "Hello"
}
```

✅ **ZSH Options**
```bash
setopt AUTO_CD
unsetopt BEEP
```

⏸️ **Plugins** (partial)
```bash
plugins=(git npm)
```

## Best Practices

1. ✅ Start with `lsh zsh-import status` to see current state
2. ✅ Use `--rename-conflicts` for safety
3. ✅ Exclude test/temp items: `--exclude 'test_*' --exclude '_*'`
4. ✅ Check diagnostics after import
5. ✅ Test manually before enabling auto-import
6. ✅ Keep `.lshrc` minimal, use auto-import

## See Full Guide

[Complete ZSH Import Guide](./ZSH-IMPORT-GUIDE.md)
