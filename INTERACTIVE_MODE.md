# LSH Interactive Mode and Configuration

LSH provides a full interactive shell experience similar to ZSH, with comprehensive configuration support via `.lshrc` files.

## 🎯 Overview

LSH supports:
- ✅ **Interactive Shell Mode** - Full shell experience like `zsh` or `bash`
- ✅ **Configuration Files** - `~/.lshrc` for customization
- ✅ **Command History** - Persistent history with navigation
- ✅ **Tab Completion** - Context-aware completions
- ✅ **Signal Handling** - Proper Ctrl+C/Ctrl+D support
- ✅ **Prompt Customization** - ZSH-style prompts
- ✅ **Aliases & Functions** - User-defined shortcuts

## 🚀 Starting Interactive Mode

### Basic Usage
```bash
# Start interactive shell (default)
lsh

# Start with custom configuration
lsh --rc ~/.my-lshrc

# Start with verbose output
lsh --verbose

# Start with debug mode
lsh --debug
```

### Command Line Options
```bash
# Interactive mode (default)
lsh -i
lsh --interactive

# Execute single command
lsh -c "echo hello && pwd"

# Execute script file
lsh -s my-script.sh
lsh my-script.sh

# Use custom rc file
lsh --rc ~/.custom-lshrc

# Verbose output
lsh --verbose

# Debug mode
lsh --debug
```

## ⚙️ Configuration Management

### Initialize Configuration
```bash
# Create default ~/.lshrc
lsh config --init

# Show current configuration
lsh config --show

# Validate configuration
lsh config --validate
```

### Configuration File Location
- **Default**: `~/.lshrc`
- **Custom**: `lsh --rc /path/to/config`
- **System-wide**: `/etc/lshrc` (future)

## 📄 .lshrc Configuration File

### Basic Configuration
```bash
# LSH Configuration File
# This file is executed when LSH starts in interactive mode

# Enable ZSH features
setopt EXTENDED_GLOB
setopt AUTO_CD
setopt SHARE_HISTORY
setopt HIST_IGNORE_DUPS

# Set prompt
export PROMPT='%n@%m:%~$ '
export RPROMPT='%T'

# Set history options
export HISTSIZE=10000
export HISTFILE=~/.lsh_history

# Aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'

# Functions
greet() {
    echo "Hello from LSH!"
}

# Welcome message
echo "LSH interactive shell loaded. Type 'help' for commands."
```

### Advanced Configuration
```bash
# ZSH Options
setopt EXTENDED_GLOB          # Extended globbing patterns
setopt AUTO_CD               # Auto-change directory
setopt SHARE_HISTORY         # Share history between sessions
setopt HIST_IGNORE_DUPS      # Ignore duplicate commands
setopt HIST_IGNORE_SPACE     # Ignore commands starting with space
setopt CORRECT               # Command correction
setopt AUTO_MENU             # Auto-menu completion
setopt MENU_COMPLETE         # Menu completion

# Environment Variables
export EDITOR='vim'
export PAGER='less'
export HISTSIZE=10000
export HISTFILE=~/.lsh_history
export SAVEHIST=10000

# Prompt Customization
export PROMPT='%n@%m:%~$ '
export RPROMPT='%T'

# Aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'
alias grep='grep --color=auto'
alias fgrep='fgrep --color=auto'
alias egrep='egrep --color=auto'

# Functions
# Quick directory navigation
mkcd() {
    mkdir -p "$1" && cd "$1"
}

# Extract archives
extract() {
    if [ -f "$1" ]; then
        case "$1" in
            *.tar.bz2)   tar xjf "$1"     ;;
            *.tar.gz)    tar xzf "$1"     ;;
            *.bz2)       bunzip2 "$1"    ;;
            *.rar)       unrar e "$1"    ;;
            *.gz)        gunzip "$1"      ;;
            *.tar)       tar xf "$1"      ;;
            *.tbz2)      tar xjf "$1"    ;;
            *.tgz)       tar xzf "$1"    ;;
            *.zip)       unzip "$1"      ;;
            *.Z)         uncompress "$1" ;;
            *.7z)        7z x "$1"       ;;
            *)           echo "'$1' cannot be extracted via extract()" ;;
        esac
    else
        echo "'$1' is not a valid file"
    fi
}

# Git shortcuts
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git pull'

# Welcome message
echo "🚀 LSH interactive shell loaded with advanced configuration!"
```

## 🎮 Interactive Features

### Command History
```bash
# Navigate history
Up Arrow    # Previous command
Down Arrow  # Next command

# History commands
history     # Show command history
history -c  # Clear history
fc          # Edit last command
r           # Repeat last command
```

### Tab Completion
```bash
# File completion
ls <TAB>           # Complete files/directories
cd <TAB>           # Complete directories only

# Command completion
<TAB>              # Complete commands from PATH

# Variable completion
echo $<TAB>        # Complete environment variables

# Custom completion
# (automatically provided for built-in commands)
```

### Signal Handling
```bash
Ctrl+C     # Interrupt current command
Ctrl+D     # Exit shell (EOF)
Ctrl+Z     # Suspend process (future)
```

### Special Commands
```bash
help       # Show help information
exit       # Exit shell
quit       # Exit shell
clear      # Clear screen
```

## 🎨 Prompt Customization

### Prompt Sequences
```bash
# Basic sequences
%n    # Username
%m    # Hostname
%~    # Current directory (with ~)
%d    # Full path
%c    # Basename of current directory
%h    # Number of jobs
%?    # Exit code of last command
%#    # Prompt character (# for root, $ for user)
%T    # 24-hour time
%t    # 12-hour time
%D    # Date
```

### Prompt Examples
```bash
# Simple prompt
export PROMPT='$ '

# Detailed prompt
export PROMPT='%n@%m:%~$ '

# Prompt with time
export PROMPT='[%T] %n@%m:%~$ '

# Right prompt
export RPROMPT='%T'

# Conditional prompt
export PROMPT='%(?..%?) %n@%m:%~$ '
```

### Prompt Themes
```bash
# Available themes
prompt default    # Simple default prompt
prompt minimal    # Minimal prompt
prompt detailed   # Detailed prompt with time
prompt git        # Git-aware prompt
prompt powerline  # Powerline-style prompt
prompt ohmyzsh    # Oh My Zsh-style prompt
prompt fish       # Fish shell-style prompt
prompt bash       # Bash-style prompt
```

## 🔧 Aliases and Functions

### Aliases
```bash
# Set aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'
alias grep='grep --color=auto'

# List aliases
alias

# Remove aliases
unalias ll
unalias grep
```

### Functions
```bash
# Define functions
greet() {
    local name="$1"
    echo "Hello, $name!"
}

# Use functions
greet "World"
greet "LSH User"

# Functions with return values
get_user() {
    echo "$USER"
}

current_user=$(get_user)
echo "Current user: $current_user"
```

## 📊 Configuration Examples

### Development Environment
```bash
# Development aliases
alias dev='cd ~/development'
alias proj='cd ~/projects'
alias logs='tail -f /var/log/application.log'

# Git shortcuts
alias gs='git status'
alias ga='git add'
alias gc='git commit -m'
alias gp='git push'
alias gl='git pull'
alias gb='git branch'
alias gco='git checkout'

# Development functions
mkproject() {
    mkdir -p "$1" && cd "$1" && git init
}

deploy() {
    git push origin main && echo "Deployed to production"
}
```

### System Administration
```bash
# System aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'

# System functions
backup() {
    tar -czf "backup-$(date +%Y%m%d).tar.gz" "$1"
}

cleanup() {
    find /tmp -type f -mtime +7 -delete
    echo "Cleaned up old temporary files"
}

# System monitoring
alias ps='ps aux'
alias top='htop'
alias df='df -h'
alias du='du -h'
```

### Personal Productivity
```bash
# Productivity aliases
alias w='wget'
alias c='curl'
alias j='jobs'
alias h='history'

# Quick navigation
alias home='cd ~'
alias docs='cd ~/Documents'
alias downloads='cd ~/Downloads'

# Productivity functions
weather() {
    curl -s "wttr.in/$1"
}

todo() {
    echo "$(date): $1" >> ~/.todo
}

show_todos() {
    cat ~/.todo
}
```

## 🚀 Usage Examples

### Starting Interactive Shell
```bash
# Basic start
lsh

# With custom config
lsh --rc ~/.work-lshrc

# With debug output
lsh --debug
```

### Configuration Management
```bash
# Initialize configuration
lsh config --init

# Show configuration
lsh config --show

# Validate configuration
lsh config --validate
```

### Mixed Usage
```bash
# Execute command then start interactive
lsh -c "echo 'Setting up environment'" && lsh

# Execute script then start interactive
lsh my-setup.sh && lsh
```

## 📈 Performance

- **Startup Time**: < 100ms for interactive mode
- **Configuration Loading**: < 50ms for ~/.lshrc
- **Command Execution**: Optimized for interactive use
- **Memory Usage**: Efficient context management
- **History**: Fast in-memory operations with efficient file I/O

## 🔧 Troubleshooting

### Common Issues

#### Configuration Not Loading
```bash
# Check if .lshrc exists
ls -la ~/.lshrc

# Validate configuration
lsh config --validate

# Show configuration
lsh config --show
```

#### History Not Working
```bash
# Check history file permissions
ls -la ~/.lsh_history

# Check history size
echo $HISTSIZE

# Clear and reset history
history -c
```

#### Completion Not Working
```bash
# Check if completion is enabled
setopt AUTO_MENU

# Test basic completion
ls <TAB>
```

### Debug Mode
```bash
# Start with debug output
lsh --debug

# Enable verbose output
lsh --verbose
```

## 🏆 Conclusion

LSH provides a **comprehensive interactive shell experience** with:

- ✅ **Full Interactive Mode** - Like `zsh` or `bash`
- ✅ **Configuration Support** - `~/.lshrc` files
- ✅ **Command History** - Persistent with navigation
- ✅ **Tab Completion** - Context-aware completions
- ✅ **Signal Handling** - Proper Ctrl+C/Ctrl+D
- ✅ **Prompt Customization** - ZSH-style prompts
- ✅ **Aliases & Functions** - User customization
- ✅ **All ZSH Features** - Arrays, globbing, math
- ✅ **Script Execution** - Run shell scripts
- ✅ **CLI Interface** - Command-line options

**Just type `lsh` to start the interactive shell!** 🚀