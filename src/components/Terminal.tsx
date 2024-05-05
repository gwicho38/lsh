import { Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import { stdout } from "process";
import React, { useEffect, useState } from "react";
import { Script, createContext } from "vm";

export const Terminal = () => {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState([]);
  const { exit } = useApp();

  // Execute JavaScript code in a new VM context
  const executeScript = input => {
    try {
      const script = new Script(input);
      const context = createContext({});
      const result = script.runInContext(context);
      return `Result: ${result}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  };

  // Handle input submission
  const handleSubmit = () => {
    const newLines = [...lines, "> " + input, executeScript(input)];
    setLines(newLines);
    setInput(""); // Clear input after execution
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

  useInput((input, key) => {
    if (key.return) {
      handleSubmit();
    } else if (key.ctrl && input === "c") {
      exit();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="row" width={size.columns - 10} height={size.rows - 10}>
        <Box width="50%" borderStyle="round" borderColor="green" paddingX={1}>
          <Text color="lightgreen">Input:</Text>
          <Box flexDirection="column" flexGrow={1} marginTop={1}>
            <Text color="green">{">"}</Text>
            <TextInput value={input} onChange={setInput} />
          </Box>
        </Box>
        <Box width="50%" borderStyle="round" borderColor="cyan" paddingX={1}>
          <Text color="yellow">Output:</Text>
          <Box flexDirection="column" flexGrow={1} marginTop={1}>
            {lines.map((line, index) => (
              <Text key={index}>{line}</Text>
            ))}
          </Box>
        </Box>
      </Box>
      <Text color="grey">Press Ctrl+C to exit.</Text>
    </Box>
  );
};

