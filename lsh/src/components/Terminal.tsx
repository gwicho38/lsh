import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import { stdin, stdout } from "process";

export const Terminal = () => {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState([]);
  const [stdOutChanged, hasChanges] = useState(false);
  const { exit } = useApp();

  // Handle input submission
  const handleSubmit = () => {
    const newLines = [...lines, "> " + input];
    setLines(newLines);
    setInput(""); // Clear input after submission
  };

  const [size, setSize] = useState({
    columns: process.stdout.columns,
    rows: process.stdout.rows,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        columns: process.stdout.columns,
        rows: process.stdout.rows,
      });
    };

    process.stdout.on("resize", handleResize);

    return () => {
      process.stdout.off("resize", handleResize);
    };
  }, []);

  // Exit on Ctrl+C
  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
    }
  });

  // Use `useInput` to listen for the 'return' key to submit the input
  useInput((input, key) => {
    if (key.return) {
      handleSubmit();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box
        flexDirection="row"
        width={size.columns - 10}
        height={size.rows - 10}
      >
        <Box width="50%" borderStyle="round" borderColor="green" paddingX={1}>
          <Text color="lightgreen">Input:</Text>
          <Box flexDirection="column" flexGrow={1} marginTop={1}>
            <Text color="green">{">"} </Text>
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
