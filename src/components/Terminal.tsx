import { Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import { stdout } from "process";
import React, { useEffect, useState } from "react";
import { Script, createContext } from "vm";
import { shell_exec } from "../lib/shell.lib.js";
import { parseShellCommand } from "../lib/shell-parser.js";
import { ShellExecutor } from "../lib/shell-executor.js";

export const Terminal = () => {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState([]);
  const [mode, setMode] = useState("auto"); // auto, js, shell
  const [workingDir, setWorkingDir] = useState(process.cwd());
  const [shellExecutor] = useState(() => new ShellExecutor());
  const { exit } = useApp();

  // Check if raw mode is supported synchronously
  const isRawModeSupported = process.stdin.isTTY && process.stdin.setRawMode !== undefined;

  // Detect if input is a shell command or JavaScript
  const detectInputType = (input: string): "shell" | "js" => {
    const trimmed = input.trim();
    
    // Check for common shell commands
    const shellCommands = ["ls", "cd", "pwd", "mkdir", "rm", "cp", "mv", "cat", "grep", "find", "ps", "kill", "chmod", "chown", "git", "npm", "node", "python", "curl", "wget"];
    const firstWord = trimmed.split(' ')[0];
    
    // Check for JavaScript patterns
    const jsPatterns = [
      /^(const|let|var|function|class|\{|\[|if|for|while|try|async|await)/,
      /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*[=]/,
      /\.(map|filter|reduce|forEach)/,
      /^Math\.|^JSON\.|^console\./,
      /^[0-9]+(\.[0-9]+)?(\s*[+\-*/])/
    ];
    
    // Force modes
    if (trimmed.startsWith("js:")) return "js";
    if (trimmed.startsWith("sh:") || trimmed.startsWith("$")) return "shell";
    
    // JavaScript detection
    if (jsPatterns.some(pattern => pattern.test(trimmed))) return "js";
    
    // Shell command detection
    if (shellCommands.includes(firstWord)) return "shell";
    
    // Default to shell for most other cases
    return "shell";
  };

  // Execute JavaScript code in a VM context with enhanced features
  const executeScript = async (input: string) => {
    try {
      let code = input;
      if (code.startsWith("js:")) code = code.substring(3).trim();
      
      // Create context with useful globals
      const context = createContext({
        console,
        process,
        __dirname: workingDir,
        __filename: '',
        global,
        Buffer,
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        shell_exec, // Make shell_exec available in JS context
        sh: shell_exec, // Short alias
      });
      
      const script = new Script(code);
      const result = script.runInContext(context);
      return `${result !== undefined ? result : '(undefined)'}`;
    } catch (error) {
      return `JS Error: ${error.message}`;
    }
  };

  // Execute shell command using POSIX parser and executor
  const executeShell = async (input: string) => {
    try {
      let command = input.trim();
      if (command.startsWith("sh:")) command = command.substring(3).trim();
      if (command.startsWith("$")) command = command.substring(1).trim();
      
      // Parse the command using POSIX grammar
      const ast = parseShellCommand(command);
      
      // Execute the parsed command
      const result = await shellExecutor.execute(ast);
      
      // Update working directory from executor context
      const context = shellExecutor.getContext();
      if (context.cwd !== workingDir) {
        setWorkingDir(context.cwd);
      }
      
      if (!result.success && result.stderr) {
        return `Shell Error: ${result.stderr}`;
      }
      
      let output = "";
      if (result.stdout) output += result.stdout;
      if (result.stderr) output += (output ? "\n" : "") + `stderr: ${result.stderr}`;
      
      return output || "(no output)";
    } catch (error) {
      // Fallback to old shell execution for unparseable commands
      try {
        let command = input.trim();
        if (command.startsWith("sh:")) command = command.substring(3).trim();
        if (command.startsWith("$")) command = command.substring(1).trim();
        
        const result = await shell_exec(command);
        
        if (result.error) {
          return `Shell Error: ${result.error}`;
        }
        
        let output = "";
        if (result.stdout) output += result.stdout;
        if (result.stderr) output += (output ? "\n" : "") + `stderr: ${result.stderr}`;
        
        return output || "(no output)";
      } catch (fallbackError) {
        return `Shell Error: ${error.message}`;
      }
    }
  };

  // Handle input submission
  const handleSubmit = async () => {
    if (!input.trim()) return;
    
    const inputType = detectInputType(input);
    const prompt = `[${workingDir.split('/').pop() || '/'}] ${inputType === 'js' ? 'js>' : '$'} ${input}`;
    
    setLines(prev => [...prev, prompt]);
    
    try {
      let result;
      if (inputType === "js") {
        result = await executeScript(input);
      } else {
        result = await executeShell(input);
      }
      // Add result with proper formatting and spacing
      setLines(prev => [...prev, result, ""]);
    } catch (error) {
      // Add error and a blank line for spacing
      setLines(prev => [...prev, `Error: ${error.message}`, ""]);
    }
    
    setInput("");
  };

  // Handle resizing of the terminal
  const [size, setSize] = useState({
    columns: stdout.columns,
    rows: stdout.rows,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        columns: stdout.columns,
        rows: stdout.rows,
      });
    };

    stdout.on("resize", handleResize);
    return () => {
      stdout.off("resize", handleResize);
    };
  }, []);

  // Only use input if raw mode is supported
  const [isInteractive, setIsInteractive] = useState(false);
  
  useEffect(() => {
    // Check if raw mode is supported
    setIsInteractive(process.stdin.isTTY && process.stdin.setRawMode !== undefined);
  }, []);

  useInput((input, key) => {
    if (!isRawModeSupported) return;
    
    if (key.return) {
      handleSubmit();
    } else if (key.ctrl && input === "c") {
      exit();
    }
  });

  // Initialize with welcome message
  useEffect(() => {
    setLines([
      "🚀 LSH Interactive Shell",
      "Mix shell commands and JavaScript seamlessly!",
      "Examples:",
      "  ls -la          (shell command)",
      "  2 + 2           (JavaScript expression)",  
      "  js: console.log('Hello')  (force JS mode)",
      "  sh: echo 'Hi'   (force shell mode)",
      "  await sh('ls')  (call shell from JS)",
      "---"
    ]);
  }, []);

  const currentDir = workingDir.split('/').pop() || '/';
  const nextInputType = detectInputType(input);
  const promptSymbol = nextInputType === 'js' ? 'js>' : '$';

  if (!isRawModeSupported) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>⚠️  Interactive mode not supported</Text>
        <Text color="yellow">Raw mode is not supported in this environment.</Text>
        <Text color="gray">To use the interactive REPL, run this command in a proper terminal:</Text>
        <Text color="cyan">  npm start repl</Text>
        <Text color="gray">or</Text>
        <Text color="cyan">  node dist/app.js repl</Text>
        <Text color="gray">For testing, use the shell lib functions directly in your Node.js code.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} width={size.columns} height={size.rows}>
      <Box flexDirection="column" width="100%">
        <Text color="cyan" bold>LSH - Interactive Shell with JavaScript</Text>
        <Text color="gray">Current directory: {workingDir}</Text>
        <Text color="gray">Mode: Auto-detect ({nextInputType === 'js' ? 'JavaScript' : 'Shell'})</Text>

        <Box borderStyle="round" borderColor="blue" paddingX={1} marginY={1} height={size.rows - 8} flexDirection="column" width="100%">
          <Box flexDirection="column" flexGrow={1} overflowY="hidden" width="100%">
            {lines.slice(Math.max(0, lines.length - (size.rows - 15))).map((line, index) => (
              <Text key={index} wrap="wrap" width={size.columns - 6}>{line}</Text>
            ))}
          </Box>

          <Box flexDirection="row" marginTop={1} width="100%">
            <Text color="green">[{currentDir}] {promptSymbol} </Text>
            <Box flexGrow={1} width={size.columns - currentDir.length - 8}>
              <TextInput
                value={input}
                onChange={setInput}
                placeholder="Enter shell command or JavaScript..."
              />
            </Box>
          </Box>
        </Box>
      </Box>
      <Text color="grey">Press Ctrl+C to exit. Use js: or sh: to force execution mode.</Text>
    </Box>
  );
};

