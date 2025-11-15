# Shell Completion for LSH

LSH provides intelligent shell completion for bash and zsh, making it easier to use commands and their options.

## Features

- Command name completion
- Option and flag completion
- File path completion for file arguments
- Environment name suggestions (dev, staging, production, etc.)
- Format suggestions (env, json, yaml, toml, export)
- Context-aware completions based on the command

## Installation

### Bash

#### Temporary (Current Session Only)

```bash
source <(lsh completion bash)
```

#### Permanent Installation

**Option 1: Add to ~/.bashrc**

```bash
echo 'source <(lsh completion bash)' >> ~/.bashrc
source ~/.bashrc
```

**Option 2: System-wide installation (requires sudo)**

```bash
lsh completion bash | sudo tee /etc/bash_completion.d/lsh > /dev/null
```

**Option 3: User-level completion directory**

```bash
mkdir -p ~/.bash_completion.d
lsh completion bash > ~/.bash_completion.d/lsh
echo 'source ~/.bash_completion.d/lsh' >> ~/.bashrc
source ~/.bashrc
```

### Zsh

#### Temporary (Current Session Only)

```bash
source <(lsh completion zsh)
```

#### Permanent Installation

**Option 1: Add to ~/.zshrc**

```bash
echo 'source <(lsh completion zsh)' >> ~/.zshrc
source ~/.zshrc
```

**Option 2: Install to completion directory**

```bash
mkdir -p ~/.zsh/completions
lsh completion zsh > ~/.zsh/completions/_lsh

# Add to ~/.zshrc if not already present
echo 'fpath=(~/.zsh/completions $fpath)' >> ~/.zshrc
echo 'autoload -Uz compinit && compinit' >> ~/.zshrc
source ~/.zshrc
```

**Option 3: Oh-My-Zsh custom completions**

```bash
mkdir -p ~/.oh-my-zsh/custom/plugins/lsh
lsh completion zsh > ~/.oh-my-zsh/custom/plugins/lsh/_lsh

# Add to ~/.zshrc plugins
# plugins=(... lsh)
```

## Usage Examples

### Command Completion

Type `lsh` and press Tab to see all available commands:

```bash
$ lsh <Tab>
help     init     doctor   push     pull     list     ls       env
key      create   sync     status   info     get      set      delete
supabase daemon   cron     self     completion
```

### Option Completion

Type a command and press Tab to see available options:

```bash
$ lsh get <Tab>
-f --file  --all  --export  --format  --exact  -h --help

$ lsh push <Tab>
-f --file  -e --env  --force  -h --help
```

### Environment Name Completion

When using commands that accept environment names, Tab will suggest common environments:

```bash
$ lsh push --env <Tab>
dev  development  staging  production  prod  test
```

### Format Completion

When using commands that accept output formats, Tab will suggest available formats:

```bash
$ lsh get --format <Tab>
env  json  yaml  toml  export

$ lsh list --format <Tab>
env  json  yaml  toml  export
```

### File Path Completion

Commands that accept file paths will complete filenames:

```bash
$ lsh set -f <Tab>
# Shows files in current directory
.env  .env.development  .env.production  setup.sh
```

## Supported Commands

The completion system supports all LSH commands:

### Secrets Management
- `get` - Complete options and suggest keys
- `set` - Complete options and file paths
- `push` / `pull` - Complete environment names and options
- `list` / `ls` - Complete format options
- `sync` - Complete environment names and sync options
- `env` - Complete environment names and format options

### Setup & Maintenance
- `init` - Complete help options
- `doctor` - Complete help options
- `create` - Complete file paths and template options
- `delete` - Complete file paths and confirmation options

### Status & Info
- `status` / `info` - Complete environment names and file paths
- `key` - Complete export option

### Services
- `supabase` - Complete subcommands and options
- `daemon` - Complete subcommands (start, stop, status)
- `cron` - Complete subcommands and options
- `self` - Complete subcommands (update, version, uninstall)

### Completion
- `completion` - Complete shell types (bash, zsh)

## Troubleshooting

### Bash Completion Not Working

**Check if bash-completion is installed:**

```bash
# macOS
brew install bash-completion@2

# Ubuntu/Debian
sudo apt-get install bash-completion

# Fedora/RHEL
sudo dnf install bash-completion
```

**Verify completion is sourced:**

```bash
complete -p lsh
# Should output: complete -F _lsh_completion lsh
```

### Zsh Completion Not Working

**Check if compinit is loaded:**

```bash
# Add to ~/.zshrc if missing
autoload -Uz compinit && compinit
```

**Check fpath includes completion directory:**

```bash
echo $fpath
# Should include your completion directory
```

**Rebuild completion cache:**

```bash
rm -f ~/.zcompdump
autoload -Uz compinit && compinit
```

### Completion Cache Issues

If completions don't update after installing a new version:

**Bash:**

```bash
complete -r lsh
source <(lsh completion bash)
```

**Zsh:**

```bash
rm -f ~/.zcompdump
autoload -Uz compinit && compinit
```

## Technical Details

### Bash Completion

The bash completion uses:
- `_init_completion` for initialization
- `compgen` for generating completion suggestions
- Case statements for context-aware completions
- File path completion with `compgen -f`

### Zsh Completion

The zsh completion uses:
- `_arguments` for structured argument completion
- `_describe` for command descriptions
- `_files` for file path completion
- Type-based completion specifications

## Examples

### Complete Workflow with Completion

```bash
# Type 'lsh' and press Tab to see commands
$ lsh <Tab>

# Type 'lsh pu' and press Tab to complete to 'push'
$ lsh pu<Tab>
$ lsh push

# Press Tab to see push options
$ lsh push <Tab>
-f --file  -e --env  --force  -h --help

# Type '--' and press Tab to see long options
$ lsh push --<Tab>
--file  --env  --force  --help

# Type '--e' and press Tab to complete to '--env'
$ lsh push --e<Tab>
$ lsh push --env

# Press space and Tab to see environment suggestions
$ lsh push --env <Tab>
dev  development  staging  production  prod  test

# Select environment
$ lsh push --env production
```

## See Also

- [Secrets Guide](secrets/SECRETS_GUIDE.md) - Complete secrets management guide
- [Quick Reference](secrets/SECRETS_QUICK_REFERENCE.md) - Command reference
- [README](../../README.md) - Main documentation
