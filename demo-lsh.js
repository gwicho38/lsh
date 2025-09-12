#!/usr/bin/env node
// Demo script showing LSH xonsh-like functionality 
import { shell_exec } from './dist/lib/shell.lib.js';
import { Script, createContext } from 'vm';

console.log("🚀 LSH Demo - Xonsh-like Shell with JavaScript\n");

// Simulate the input detection logic from our REPL
function detectInputType(input) {
    const trimmed = input.trim();
    const shellCommands = ["ls", "cd", "pwd", "mkdir", "rm", "cp", "mv", "cat", "grep", "find", "ps", "kill", "chmod", "chown", "git", "npm", "node", "python", "curl", "wget"];
    const firstWord = trimmed.split(' ')[0];
    
    const jsPatterns = [
        /^(const|let|var|function|class|\{|\[|if|for|while|try|async|await)/,
        /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*[=]/,
        /\.(map|filter|reduce|forEach)/,
        /^Math\.|^JSON\.|^console\./,
        /^[0-9]+(\.[0-9]+)?(\s*[+\-*/])/
    ];
    
    if (trimmed.startsWith("js:")) return "js";
    if (trimmed.startsWith("sh:") || trimmed.startsWith("$")) return "shell";
    if (jsPatterns.some(pattern => pattern.test(trimmed))) return "js";
    if (shellCommands.includes(firstWord)) return "shell";
    return "shell";
}

async function executeCommand(input, workingDir = process.cwd()) {
    const type = detectInputType(input);
    console.log(`[${workingDir.split('/').pop()}] ${type === 'js' ? 'js>' : '$'} ${input}`);
    
    if (type === "js") {
        try {
            let code = input.startsWith("js:") ? input.substring(3).trim() : input;
            const context = createContext({
                console, process, Buffer, shell_exec, sh: shell_exec,
                __dirname: workingDir,
                global, setTimeout, setInterval, clearTimeout, clearInterval
            });
            const script = new Script(code);
            const result = script.runInContext(context);
            console.log(`→ ${result !== undefined ? result : '(undefined)'}\n`);
        } catch (error) {
            console.log(`→ JS Error: ${error.message}\n`);
        }
    } else {
        try {
            let command = input.startsWith("sh:") ? input.substring(3).trim() : input;
            if (command.startsWith("$")) command = command.substring(1).trim();
            
            const result = await shell_exec(command);
            if (result.error) {
                console.log(`→ Shell Error: ${result.error}\n`);
            } else {
                let output = result.stdout;
                if (result.stderr) output += `\nstderr: ${result.stderr}`;
                console.log(`→ ${output || '(no output)'}\n`);
            }
        } catch (error) {
            console.log(`→ Shell Error: ${error.message}\n`);
        }
    }
}

// Demo commands
const demoCommands = [
    "ls -la | head -5",        // Shell command
    "2 + 2",                   // JavaScript expression
    "Math.random() * 100",     // JavaScript with Math
    "pwd",                     // Shell command
    "console.log('Hello from JS!')", // JavaScript console
    "js: ['a', 'b', 'c'].map(x => x.toUpperCase())", // Force JS mode
    "sh: echo 'Hello from shell'", // Force shell mode
    "const files = await sh('ls'); files.stdout.split('\\n').length" // Mixed JS + shell
];

console.log("Running demo commands:\n");

for (const command of demoCommands) {
    await executeCommand(command);
    // Small delay for readability
    await new Promise(resolve => setTimeout(resolve, 500));
}

console.log("✅ Demo completed! This shows how lsh combines shell and JavaScript like xonsh does with Python.");
console.log("To use interactively, run: npm start repl (requires a proper terminal)");