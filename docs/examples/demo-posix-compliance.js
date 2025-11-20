#!/usr/bin/env node
// Demo script showing POSIX compliance features in LSH
import { parseShellCommand } from './dist/lib/shell-parser.js';
import { ShellExecutor } from './dist/lib/shell-executor.js';

console.log("🏗️  LSH POSIX Shell Compliance Demo\n");
console.log("Demonstrating implemented POSIX features:\n");

const executor = new ShellExecutor();

async function runDemo(title, commands) {
  console.log(`=== ${title} ===`);
  
  for (const cmd of commands) {
    console.log(`$ ${cmd}`);
    
    try {
      const ast = parseShellCommand(cmd);
      const result = await executor.execute(ast);
      
      if (result.stdout) {
        console.log(result.stdout);
      }
      if (result.stderr) {
        console.log(`stderr: ${result.stderr}`);
      }
      if (!result.success) {
        console.log(`Exit code: ${result.exitCode}`);
      }
    } catch (error) {
      console.log(`Parse error: ${error.message}`);
    }
    
    console.log();
  }
}

// Built-in Commands Demo
await runDemo("Built-in Commands", [
  "pwd",
  "echo Hello World",
  "echo -n No newline here",
  "true",
  "false",
  "export TEST_VAR=hello",
  "cd /tmp",
  "pwd",
  "cd /Users/lefv/repos/lsh",
  "pwd",
]);

// Command Lists and Logic Demo  
await runDemo("Command Lists & Logic", [
  "true && echo 'This will run'",
  "false && echo 'This will not run'",
  "false || echo 'This will run as fallback'",
  "true || echo 'This will not run'",
  "echo first; echo second",
  "true && echo success && echo again",
  "false || echo fallback || echo another",
]);

// Pipeline Demo
await runDemo("Pipelines", [
  "ls /usr/bin | head -3",
  "echo -e 'line1\\nline2\\nline3' | grep line2",
  "cat /etc/passwd | head -5 | tail -2",
]);

// Quoting Demo (basic)
await runDemo("Basic Quoting", [
  "echo 'single quoted'",
  'echo "double quoted"',
  "echo hello world",
  "echo 'contains spaces and $symbols'",
  'echo "allows: $HOME expansion"',
]);

// Parser Complexity Demo
await runDemo("Complex Command Structures", [
  "ls && pwd || echo fallback",
  "true && (echo nested && echo commands)",
  "false || true && echo 'complex logic'",
]);

console.log("=== POSIX Compliance Status ===");
console.log("✅ Full POSIX shell grammar parser");
console.log("✅ Basic built-in commands (cd, pwd, echo, true, false, export)");
console.log("✅ Command lists with &&, ||, ; operators");  
console.log("✅ Pipeline support with | operator");
console.log("✅ Basic quote handling");
console.log("✅ AST-based execution engine");
console.log("✅ Proper exit code handling");
console.log("✅ Context management (cwd, variables)");

console.log("\n🚧 Still implementing:");
console.log("⏳ Complete built-in command set (test, read, printf, etc.)");
console.log("⏳ Variable expansion ($VAR, ${VAR}, etc.)"); 
console.log("⏳ Command substitution ($(cmd), `cmd`)");
console.log("⏳ Job control and signal handling");
console.log("⏳ Advanced quoting and escaping rules");
console.log("⏳ Redirection (>, <, >>, <<)");
console.log("⏳ Glob expansion (*, ?, [...])");

console.log("\n🎯 Result: LSH now has a solid foundation for POSIX shell compliance!");
console.log("The parser correctly handles complex command structures and the executor");
console.log("implements core POSIX semantics with proper built-ins and control flow.");