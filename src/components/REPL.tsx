import chalk from 'chalk';
import hljs from 'highlightjs';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useState } from 'react';
import vm from 'vm';

// REPL Component
export const REPL = () => {
  const { exit } = useApp();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);

  useInput((input, key) => {
    if (key.escape) {
      exit();
    }
  });

  const handleInput = (value) => {
    setInput(value);
  };

  const executeCommand = () => {
    try {
      const script = new vm.Script(input);
      const context = vm.createContext(global);
      const result = script.runInContext(context);
      const output = result === undefined || result === null ? 'undefined' : result.toString();
      const highlightedOutput = chalk.green(highlight(output));
      setHistory([...history, `> ${chalk.yellow(highlight(input))}`, `= ${highlightedOutput}`]);
    } catch (err) {
      setHistory([...history, `> ${chalk.yellow(highlight(input))}`, `! Error: ${chalk.red(err.message)}`]);
    } finally {
      setInput('');
    }
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box flexGrow={1} flexDirection="column" borderColor="cyan" borderStyle="round">
        <Box marginBottom={1} flexDirection="column">
          {history.map((entry, index) => (
            <Text key={index}>{entry}</Text>
          ))}
        </Box>
        <TextInput
          value={input}
          onChange={handleInput}
          onSubmit={executeCommand}
          placeholder="Type JavaScript code and press Enter..."
        />
      </Box>
    </Box>
  );
};

const highlight = (code: string) => {
  return hljs.highlight(code, { language: 'javascript' }).value;
};