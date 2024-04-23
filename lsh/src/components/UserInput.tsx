import { Box, Text, render, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useState } from 'react';
import vm from 'vm';

// Header Component
const Header = ({ version }) => (
  <Box justifyContent="space-between" height={1}>
    <Text color="green">MyShell</Text>
    <Text color="yellow">v{version}</Text>
  </Box>
);

// Footer Component
const Footer = () => (
  <Box justifyContent="space-between" height={1}>
    <Text color="green">-----</Text>
    <Text color="yellow">-----</Text>
  </Box>
);

// REPL Component
const REPL = () => {
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
			const resultString = result === undefined || result === null ? 'undefined' : result.toString();
      setHistory([...history, `> ${input}`, `= ${resultString}`]);
			        // Check if the result is undefined or null before calling toString()

    } catch (err) {
      setHistory([...history, `> ${input}`, `! Error: ${err.message}`]);
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

// App Component
export const UserInput = () => {
  const version = "1.0.0";

  return (
    <Box flexDirection="column" height={process.stdout.rows}>
      <Header version={version} />
      <REPL />
      <Footer />
    </Box>
  );
};

render(<UserInput />);

