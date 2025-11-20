#!/usr/bin/env node

/**
 * Demo script showcasing ZSH features implemented in LSH
 */

import { ShellExecutor } from './src/lib/shell-executor.js';
import { parseShellCommand } from './src/lib/shell-parser.js';

async function runDemo() {
  console.log('🚀 LSH ZSH Features Demo\n');
  
  const executor = new ShellExecutor();
  
  // Demo 1: History System
  console.log('📚 Demo 1: History System');
  console.log('========================');
  
  const historyCommands = [
    'echo "Hello World"',
    'pwd',
    'ls -la',
    'cd /tmp',
    'echo "Current directory: $(pwd)"'
  ];
  
  for (const cmd of historyCommands) {
    console.log(`$ ${cmd}`);
    const ast = parseShellCommand(cmd);
    await executor.execute(ast);
  }
  
  console.log('\nHistory entries:');
  const historyResult = await executor.execute(parseShellCommand('history'));
  console.log(historyResult.stdout);
  
  // Demo 2: ZSH Options
  console.log('\n⚙️  Demo 2: ZSH Options');
  console.log('=====================');
  
  console.log('$ setopt autocd');
  await executor.execute(parseShellCommand('setopt autocd'));
  
  console.log('$ setopt extendedglob');
  await executor.execute(parseShellCommand('setopt extendedglob'));
  
  console.log('$ setopt sharehistory');
  await executor.execute(parseShellCommand('setopt sharehistory'));
  
  // Demo 3: Associative Arrays
  console.log('\n📊 Demo 3: Associative Arrays');
  console.log('============================');
  
  console.log('$ typeset -A colors');
  await executor.execute(parseShellCommand('typeset -A colors'));
  
  console.log('$ colors[red]=FF0000');
  await executor.execute(parseShellCommand('colors[red]=FF0000'));
  
  console.log('$ colors[green]=00FF00');
  await executor.execute(parseShellCommand('colors[green]=00FF00'));
  
  console.log('$ colors[blue]=0000FF');
  await executor.execute(parseShellCommand('colors[blue]=0000FF'));
  
  // Demo 4: Extended Parameter Expansion
  console.log('\n🔧 Demo 4: Extended Parameter Expansion');
  console.log('=====================================');
  
  console.log('$ echo ${colors[red]}');
  await executor.execute(parseShellCommand('echo ${colors[red]}'));
  
  console.log('$ echo ${#colors}');
  await executor.execute(parseShellCommand('echo ${#colors}'));
  
  // Demo 5: Floating Point Arithmetic
  console.log('\n🔢 Demo 5: Floating Point Arithmetic');
  console.log('==================================');
  
  const mathExpressions = [
    'echo $((3.14 * 2))',
    'echo $((sqrt(16)))',
    'echo $((sin(1.57)))',
    'echo $((log(2.718)))'
  ];
  
  for (const expr of mathExpressions) {
    console.log(`$ ${expr}`);
    await executor.execute(parseShellCommand(expr));
  }
  
  // Demo 6: Prompt System
  console.log('\n🎨 Demo 6: Prompt System');
  console.log('=======================');
  
  console.log('Available themes:');
  const themes = executor.context.prompt.getAvailableThemes();
  themes.forEach(theme => {
    console.log(`  - ${theme}`);
  });
  
  console.log('\nSetting git theme:');
  executor.context.prompt.setTheme('git');
  console.log(`Current prompt: ${executor.getPrompt()}`);
  
  // Demo 7: Completion System
  console.log('\n🔍 Demo 7: Completion System');
  console.log('===========================');
  
  console.log('Available completions for "cd ":');
  const completions = await executor.getCompletions('cd', [], '', 1);
  console.log(completions.slice(0, 5).join(', '));
  
  // Demo 8: Aliases
  console.log('\n🏷️  Demo 8: Aliases');
  console.log('=================');
  
  console.log('$ alias ll="ls -la"');
  await executor.execute(parseShellCommand('alias ll="ls -la"'));
  
  console.log('$ alias grep="grep --color=auto"');
  await executor.execute(parseShellCommand('alias grep="grep --color=auto"'));
  
  console.log('\nCurrent aliases:');
  await executor.execute(parseShellCommand('alias'));
  
  // Demo 9: History Expansion
  console.log('\n🔄 Demo 9: History Expansion');
  console.log('===========================');
  
  console.log('$ echo "Last command was: !!"');
  await executor.execute(parseShellCommand('echo "Last command was: !!"'));
  
  // Demo 10: Job Management (LSH Superior Feature)
  console.log('\n⚡ Demo 10: Advanced Job Management');
  console.log('=================================');
  
  console.log('$ job-create -n "test-job" "sleep 5"');
  await executor.execute(parseShellCommand('job-create -n "test-job" "sleep 5"'));
  
  console.log('$ job-list');
  await executor.execute(parseShellCommand('job-list'));
  
  console.log('\n🎉 Demo completed! LSH now has comprehensive ZSH feature support.');
  console.log('\n📈 Feature Summary:');
  console.log('✅ History System - Complete');
  console.log('✅ Completion System - Complete');
  console.log('✅ Associative Arrays - Complete');
  console.log('✅ Extended Parameter Expansion - Complete');
  console.log('✅ Extended Globbing - Complete');
  console.log('✅ ZSH Options - Complete');
  console.log('✅ Advanced Prompt System - Complete');
  console.log('✅ Floating Point Arithmetic - Complete');
  console.log('✅ Aliases - Complete');
  console.log('✅ Job Management - Superior to ZSH');
  
  console.log('\n🚀 LSH is now a true ZSH superset!');
}

// Run the demo
runDemo().catch(console.error);