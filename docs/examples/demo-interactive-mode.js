#!/usr/bin/env node

/**
 * Demo script showcasing LSH interactive mode
 */

import { ShellExecutor } from './src/lib/shell-executor.js';
import { parseShellCommand } from './src/lib/shell-parser.js';

async function demoInteractiveMode() {
  console.log('🐚 LSH Interactive Mode Demo\n');
  
  // Demo 1: Simulated Interactive Session
  console.log('📱 Demo 1: Simulated Interactive Session');
  console.log('=======================================');
  
  const executor = new ShellExecutor();
  
  const interactiveCommands = [
    'echo "Welcome to LSH Interactive Shell!"',
    'pwd',
    'echo "Current user: $USER"',
    'echo "Home directory: $HOME"',
    'export MY_VAR="Hello from LSH!"',
    'echo $MY_VAR',
    'typeset -A colors',
    'colors[red]=FF0000',
    'colors[green]=00FF00',
    'echo "Red: ${colors[red]}"',
    'echo "Keys: ${(k)colors}"',
    'setopt EXTENDED_GLOB',
    'echo "Math: $((3.14 * 2))"',
    'echo "Square root: $((sqrt(16)))"',
    'alias ll="ls -la"',
    'echo "Alias set: ll"',
    'history',
    'echo "Demo completed!"'
  ];
  
  for (const cmd of interactiveCommands) {
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
  
  // Demo 2: Configuration Loading
  console.log('\n⚙️  Demo 2: Configuration Loading');
  console.log('================================');
  
  const configCommands = [
    '# LSH Configuration Demo',
    'setopt AUTO_CD',
    'setopt SHARE_HISTORY',
    'export PROMPT="%n@%m:%~$ "',
    'alias ..="cd .."',
    'alias ...="cd ../.."',
    'greet() { echo "Hello from function!"; }',
    'echo "Configuration loaded"'
  ];
  
  console.log('Loading configuration:');
  for (const cmd of configCommands) {
    if (cmd.startsWith('#')) {
      console.log(cmd);
      continue;
    }
    
    console.log(`$ ${cmd}`);
    try {
      const ast = parseShellCommand(cmd);
      const result = await executor.execute(ast);
      if (result.stdout) {
        console.log(result.stdout);
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }
  
  // Demo 3: Interactive Shell Features
  console.log('\n🎯 Demo 3: Interactive Shell Features');
  console.log('====================================');
  
  console.log('Available features:');
  console.log('✅ Command History - Up/Down arrows for navigation');
  console.log('✅ Tab Completion - Context-aware completions');
  console.log('✅ Signal Handling - Ctrl+C, Ctrl+D support');
  console.log('✅ Configuration - ~/.lshrc file support');
  console.log('✅ Prompt Customization - ZSH-style prompts');
  console.log('✅ Aliases - Command aliasing');
  console.log('✅ Functions - User-defined functions');
  console.log('✅ Variables - Environment and local variables');
  console.log('✅ Arrays - Associative arrays');
  console.log('✅ Globbing - Extended pattern matching');
  console.log('✅ Math - Floating point arithmetic');
  
  // Demo 4: Usage Examples
  console.log('\n🚀 Demo 4: Usage Examples');
  console.log('========================');
  
  console.log('Starting LSH Interactive Shell:');
  console.log('  $ lsh                    # Start interactive mode');
  console.log('  $ lsh -c "echo hello"    # Execute single command');
  console.log('  $ lsh script.sh          # Execute script file');
  console.log('');
  console.log('Configuration Management:');
  console.log('  $ lsh config --init      # Initialize ~/.lshrc');
  console.log('  $ lsh config --show      # Show configuration');
  console.log('  $ lsh config --validate  # Validate configuration');
  console.log('');
  console.log('Interactive Features:');
  console.log('  Tab      - Command completion');
  console.log('  Up/Down  - Command history');
  console.log('  Ctrl+C   - Interrupt command');
  console.log('  Ctrl+D   - Exit shell');
  console.log('  help     - Show help');
  console.log('  exit     - Exit shell');
  
  // Demo 5: Sample .lshrc
  console.log('\n📄 Demo 5: Sample .lshrc Configuration');
  console.log('=====================================');
  
  const sampleRc = `# LSH Configuration File
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
`;
  
  console.log('Sample ~/.lshrc:');
  console.log(sampleRc);
  
  console.log('\n🎉 Interactive Mode Demo Completed!');
  console.log('\n📊 LSH Interactive Features Summary:');
  console.log('✅ Full Interactive Shell - Like zsh/bash');
  console.log('✅ Configuration Support - ~/.lshrc file');
  console.log('✅ Command History - Persistent history');
  console.log('✅ Tab Completion - Context-aware completions');
  console.log('✅ Signal Handling - Proper Ctrl+C/Ctrl+D');
  console.log('✅ Prompt Customization - ZSH-style prompts');
  console.log('✅ Aliases & Functions - User customization');
  console.log('✅ All ZSH Features - Arrays, globbing, math');
  console.log('✅ Script Execution - Run shell scripts');
  console.log('✅ CLI Interface - Command-line options');
  
  console.log('\n🚀 LSH now supports full interactive mode like zsh!');
  console.log('   Just type "lsh" to start the interactive shell.');
}

// Run the demo
demoInteractiveMode().catch(console.error);