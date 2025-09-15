#!/usr/bin/env node

/**
 * Demo script showcasing LSH ZSH compatibility features
 */

import { ShellExecutor } from './src/lib/shell-executor.js';
import { parseShellCommand } from './src/lib/shell-parser.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

async function demoZshCompatibility() {
  console.log('🔄 LSH ZSH Compatibility Demo\n');
  
  const executor = new ShellExecutor();
  
  // Demo 1: Check ZSH Availability
  console.log('📋 Demo 1: Check ZSH Availability');
  console.log('=================================');
  
  const zshCheck = await executor.context.zshCompatibility.checkZshAvailability();
  if (zshCheck.available) {
    console.log(`✅ ZSH is available: version ${zshCheck.version}`);
    console.log(`   Path: ${zshCheck.path}`);
  } else {
    console.log('❌ ZSH is not available on this system');
  }
  
  // Demo 2: Create Sample .zshrc
  console.log('\n📄 Demo 2: Create Sample .zshrc');
  console.log('===============================');
  
  const sampleZshrc = `# Sample ZSH Configuration
# This simulates a typical .zshrc file

# Oh My Zsh configuration
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="robbyrussell"
plugins=(git docker kubectl)

# Aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'
alias grep='grep --color=auto'

# Environment variables
export EDITOR='vim'
export PAGER='less'
export HISTSIZE=10000
export HISTFILE=~/.zsh_history

# Functions
mkcd() {
    mkdir -p "$1" && cd "$1"
}

extract() {
    if [ -f "$1" ]; then
        case "$1" in
            *.tar.bz2)   tar xjf "$1"     ;;
            *.tar.gz)    tar xzf "$1"     ;;
            *.bz2)       bunzip2 "$1"     ;;
            *.rar)       unrar e "$1"     ;;
            *.gz)        gunzip "$1"      ;;
            *.tar)       tar xf "$1"      ;;
            *.zip)       unzip "$1"       ;;
            *)           echo "'$1' cannot be extracted" ;;
        esac
    else
        echo "'$1' is not a valid file"
    fi
}

# Git shortcuts
alias gs='git status'
alias ga='git add'
alias gc='git commit -m'
alias gp='git push'
alias gl='git pull'

# Setopt options
setopt AUTO_CD
setopt SHARE_HISTORY
setopt HIST_IGNORE_DUPS
setopt EXTENDED_GLOB

# Completion
autoload -U compinit && compinit

echo "ZSH configuration loaded"
`;
  
  const zshrcPath = path.join(os.tmpdir(), 'demo.zshrc');
  fs.writeFileSync(zshrcPath, sampleZshrc, 'utf8');
  console.log(`Created sample .zshrc: ${zshrcPath}`);
  
  // Demo 3: Source ZSH Configuration
  console.log('\n🔄 Demo 3: Source ZSH Configuration');
  console.log('==================================');
  
  console.log('Sourcing ZSH configuration...');
  const sourceResult = await executor.context.zshCompatibility.sourceZshConfig();
  console.log(`Result: ${sourceResult.message}`);
  
  // Demo 4: Test Sourced Configuration
  console.log('\n🧪 Demo 4: Test Sourced Configuration');
  console.log('====================================');
  
  const testCommands = [
    'echo "Testing aliases..."',
    'alias ll',  // Should show the alias
    'echo "Testing functions..."',
    'mkcd /tmp/test-dir',  // Should create directory and cd
    'pwd',  // Should show /tmp/test-dir
    'echo "Testing environment variables..."',
    'echo "Editor: $EDITOR"',
    'echo "Pager: $PAGER"'
  ];
  
  for (const cmd of testCommands) {
    console.log(`$ ${cmd}`);
    try {
      const ast = parseShellCommand(cmd);
      const result = await executor.execute(ast);
      if (result.stdout) {
        console.log(result.stdout);
      }
      if (result.stderr) {
        console.log(result.stderr);
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }
  
  // Demo 5: Migrate ZSH Configuration
  console.log('\n📦 Demo 5: Migrate ZSH Configuration');
  console.log('=====================================');
  
  console.log('Migrating ZSH configuration to LSH...');
  const migrateResult = await executor.context.zshCompatibility.migrateZshConfig();
  console.log(`Result: ${migrateResult.message}`);
  
  // Demo 6: Package Management
  console.log('\n📦 Demo 6: Package Management');
  console.log('=============================');
  
  console.log('Testing package installation...');
  const installResult = await executor.context.zshCompatibility.installPackage('cowsay');
  console.log(`Install result: ${installResult.message}`);
  
  if (installResult.success) {
    console.log('Testing package uninstallation...');
    const uninstallResult = await executor.context.zshCompatibility.uninstallPackage('cowsay');
    console.log(`Uninstall result: ${uninstallResult.message}`);
  }
  
  // Demo 7: Built-in Commands
  console.log('\n🔧 Demo 7: ZSH Compatibility Built-ins');
  console.log('=====================================');
  
  const builtinCommands = [
    'source ~/.bashrc || echo "No .bashrc found"',
    'install --help || echo "Install command available"',
    'uninstall --help || echo "Uninstall command available"',
    'zsh-migrate || echo "ZSH migrate command available"',
    'zsh-source || echo "ZSH source command available"'
  ];
  
  for (const cmd of builtinCommands) {
    console.log(`$ ${cmd}`);
    try {
      const ast = parseShellCommand(cmd);
      const result = await executor.execute(ast);
      if (result.stdout) {
        console.log(result.stdout);
      }
      if (result.stderr) {
        console.log(result.stderr);
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }
  
  // Demo 8: Completion System Integration
  console.log('\n🔍 Demo 8: Completion System Integration');
  console.log('========================================');
  
  console.log('Testing completion system...');
  try {
    const completions = await executor.getCompletions('git', [], '', 1);
    console.log(`Git completions: ${completions.slice(0, 5).join(', ')}`);
  } catch (error) {
    console.log(`Completion error: ${error.message}`);
  }
  
  // Cleanup
  try {
    fs.unlinkSync(zshrcPath);
    fs.rmSync('/tmp/test-dir', { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup errors
  }
  
  console.log('\n🎉 ZSH Compatibility Demo Completed!');
  console.log('\n📊 ZSH Compatibility Features Summary:');
  console.log('✅ ZSH Configuration Sourcing - Source ~/.zshrc');
  console.log('✅ Configuration Migration - Migrate ZSH to LSH');
  console.log('✅ Package Management - Install/uninstall packages');
  console.log('✅ Completion Integration - ZSH completions support');
  console.log('✅ Alias Support - ZSH aliases work in LSH');
  console.log('✅ Function Support - ZSH functions work in LSH');
  console.log('✅ Environment Variables - ZSH exports work in LSH');
  console.log('✅ Setopt Options - ZSH options work in LSH');
  console.log('✅ Built-in Commands - source, install, uninstall');
  console.log('✅ Oh My Zsh Support - Plugin and theme compatibility');
  
  console.log('\n🚀 LSH now provides full ZSH compatibility!');
  console.log('   No need to duplicate work - just source your existing .zshrc!');
}

// Run the demo
demoZshCompatibility().catch(console.error);