import autocomplete from 'autocomplete';
import { Box, Text, render, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useEffect, useState } from 'react';
import { shell } from 'shelljs';
import vm from 'vm';

// Setup the autocomplete engine
const globals = Object.getOwnPropertyNames(global).sort();
const autoCompleteEngine = autocomplete.connectAutocomplete();

autoCompleteEngine.initialize(() => {
  return globals.map(item => ({ name: item }));
});

function executeUserCommand(input) {
  const parts = input.split(' '); // Naive splitting, consider using a robust parser
  const command = parts[0];
  const args = parts.slice(1).join(' ');

  if (command === 'echo' || command === 'ls') { // Only allow certain commands
    const sanitizedArgs = sanitize(args); // Ensure arguments are safe to use
    shell.exec(`${command} ${sanitizedArgs}`);
  } else {
    // Handle with internal logic
    console.log('Command not recognized or not allowed.');
  }
}

function sanitize(input) {
  // Implement sanitization logic
  return input.replace(/[^a-zA-Z0-9 \-]/g, '');
}

export const UserInput = () => {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input: any, key: { return: any; tab: any; }) => {
    if (key.return) {
      // Execute the command when Enter is pressed
			executeUserCommand(query);
      executeQuery(query);
      setQuery('');
      setSuggestions([]);
      setSelectedIndex(0);
    } else if (key.tab) {
      // Handle Tab key for cycling through suggestions
      if (suggestions.length > 0) {
        const newIndex = (selectedIndex + 1) % suggestions.length;
        setSelectedIndex(newIndex);
        setQuery(suggestions[newIndex].name);
      }
    }
  });

  useEffect(() => {
    // Fetch new suggestions whenever the query changes
    if (query.length > 1) {
      const matches = autoCompleteEngine.search(query);
      setSuggestions(matches);
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const executeQuery = (code: string) => {
    try {
      const script = new vm.Script(code);
      const context = vm.createContext(global);
      const result = script.runInContext(context);
      setHistory(prevHistory => [...prevHistory, `> ${code}`, `= ${result}`]);
    } catch (error) {
      setHistory(prevHistory => [...prevHistory, `> ${code}`, `! Error: ${error.message}`]);
    }
  };

  return (
    <Box flexDirection="row">
      <Box flexDirection="column" width="50%">
        <Text color="green">Enter command:</Text>
        <TextInput 
          value={query}
          onChange={setQuery}
          onSubmit={() => setQuery('')}
        />
        <Box flexDirection="column" marginTop={1}>
          {suggestions.length > 0 && (
            <Box>
              <Text>Autocomplete:</Text>
              {suggestions.map((s, index) => (
                <Text key={index} inverse={index === selectedIndex}>{s.name}</Text>
              ))}
            </Box>
          )}
        </Box>
      </Box>
      <Box flexDirection="column" width="50%" marginLeft={1}>
        <Text>History:</Text>
        {history.map((item, index) => (
          <Text key={index}>{item}</Text>
        ))}
      </Box>
    </Box>
  );
};

render(<UserInput />);

