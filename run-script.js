#!/usr/bin/env node

/**
 * LSH Script Runner CLI
 * Execute shell scripts with LSH
 */

import ScriptRunner from './src/lib/script-runner.js';
import { parseShellCommand } from './src/lib/shell-parser.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node run-script.js <script-file> [args...]');
    console.log('       node run-script.js -c "command"');
    console.log('       node run-script.js --help');
    process.exit(1);
  }
  
  if (args[0] === '--help' || args[0] === '-h') {
    console.log('LSH Script Runner');
    console.log('=================');
    console.log('');
    console.log('Usage:');
    console.log('  node run-script.js <script-file> [args...]  Execute shell script');
    console.log('  node run-script.js -c "command"             Execute command string');
    console.log('  node run-script.js --validate <script>       Validate script syntax');
    console.log('  node run-script.js --info <script>           Show script information');
    console.log('  node run-script.js --create <script>        Create example script');
    console.log('');
    console.log('Examples:');
    console.log('  node run-script.js test-script.sh');
    console.log('  node run-script.js test-script.sh arg1 arg2');
    console.log('  node run-script.js -c "echo hello && pwd"');
    console.log('  node run-script.js --validate test-script.sh');
    console.log('  node run-script.js --info test-script.sh');
    console.log('  node run-script.js --create my-script.sh');
    process.exit(0);
  }
  
  const runner = new ScriptRunner();
  
  if (args[0] === '--validate') {
    if (args.length < 2) {
      console.error('Error: Script file required for validation');
      process.exit(1);
    }
    
    const scriptPath = args[1];
    const validation = runner.validateScript(scriptPath);
    
    if (validation.valid) {
      console.log(`✅ Script ${scriptPath} has valid syntax`);
      process.exit(0);
    } else {
      console.error(`❌ Script ${scriptPath} has syntax errors:`);
      validation.errors.forEach(error => console.error(`  ${error}`));
      process.exit(1);
    }
  }
  
  if (args[0] === '--info') {
    if (args.length < 2) {
      console.error('Error: Script file required for info');
      process.exit(1);
    }
    
    const scriptPath = args[1];
    const info = runner.getScriptInfo(scriptPath);
    
    if (!info.exists) {
      console.error(`❌ Script ${scriptPath} does not exist`);
      process.exit(1);
    }
    
    console.log(`📄 Script Information: ${scriptPath}`);
    console.log(`   Size: ${info.size} bytes`);
    console.log(`   Executable: ${info.executable ? 'Yes' : 'No'}`);
    if (info.shebang) {
      console.log(`   Shebang: ${info.shebang}`);
      console.log(`   Interpreter: ${info.interpreter}`);
    } else {
      console.log(`   Shebang: None`);
    }
    process.exit(0);
  }
  
  if (args[0] === '--create') {
    if (args.length < 2) {
      console.error('Error: Script file name required');
      process.exit(1);
    }
    
    const scriptPath = args[1];
    const exampleContent = `#!/bin/sh
# Example shell script created by LSH

echo "Hello from LSH!"
echo "Script: $0"
echo "Arguments: $@"
echo "User: $USER"
echo "Current directory: $(pwd)"

# Test variables
MY_VAR="Hello World"
echo "Custom variable: $MY_VAR"

# Test arithmetic
NUM1=10
NUM2=5
echo "Arithmetic: $NUM1 + $NUM2 = $((NUM1 + NUM2))"

# Test conditionals
if [ "$USER" = "root" ]; then
    echo "Running as root"
else
    echo "Running as regular user: $USER"
fi

# Test loops
echo "Counting from 1 to 3:"
for i in 1 2 3; do
    echo "  Count: $i"
done

# Test functions
greet() {
    local name="$1"
    echo "Hello, $name!"
}

greet "Shell Script"
greet "LSH User"

echo "Script completed successfully!"
`;
    
    const created = runner.createScript(scriptPath, exampleContent);
    
    if (created) {
      console.log(`✅ Created example script: ${scriptPath}`);
      console.log(`   Run with: node run-script.js ${scriptPath}`);
    } else {
      console.error(`❌ Failed to create script: ${scriptPath}`);
      process.exit(1);
    }
    process.exit(0);
  }
  
  if (args[0] === '-c') {
    if (args.length < 2) {
      console.error('Error: Command required for -c option');
      process.exit(1);
    }
    
    const command = args.slice(1).join(' ');
    console.log(`$ ${command}`);
    
    const result = await runner.executeCommands(command);
    
    if (result.output) {
      console.log(result.output);
    }
    if (result.errors) {
      console.error(result.errors);
    }
    
    process.exit(result.exitCode);
  }
  
  // Execute script file
  const scriptPath = args[0];
  const scriptArgs = args.slice(1);
  
  if (!fs.existsSync(scriptPath)) {
    console.error(`❌ Script file not found: ${scriptPath}`);
    process.exit(1);
  }
  
  console.log(`🐚 Executing script: ${scriptPath}`);
  if (scriptArgs.length > 0) {
    console.log(`📝 Arguments: ${scriptArgs.join(' ')}`);
  }
  console.log('');
  
  const result = await runner.executeScript(scriptPath, {
    args: scriptArgs,
    verbose: true,
  });
  
  if (result.output) {
    console.log(result.output);
  }
  if (result.errors) {
    console.error(result.errors);
  }
  
  if (result.success) {
    console.log(`\n✅ Script completed successfully (exit code: ${result.exitCode})`);
  } else {
    console.log(`\n❌ Script failed (exit code: ${result.exitCode})`);
  }
  
  process.exit(result.exitCode);
}

// Run the CLI
main().catch(console.error);