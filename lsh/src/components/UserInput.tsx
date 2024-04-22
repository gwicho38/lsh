import { useInput, useStdout } from 'ink';
import React, { useState } from 'react';
import { Divider } from '../components/Divider.js';
import { Command } from 'commander';

type Props = {
	program: Command
};

export function UserInput({ Props, ...props }) {
	const [feature, setFeature] = useState('');
	const [readData, setReadData] = useState([]);
	const [writeData, setWriteData] = useState([]);
	const [userInput, setUserInput] = useState('');
	const [name, setName] = useState('');
	const handleSubmit = query => {
		// Do something with query
		console.log('handleSubmit');
		setUserInput('');

	};
	const {stdout, write} = useStdout();

	const handleChange = query => {
		console.log('handleChange');
	};

	useInput((input, key) => {
		console.log(props);
		if (key?.return) {
			console.log(userInput);
			setUserInput('');
		} else {
			setUserInput(userInput + input);
		}

	});

	const input = (
		<>
			{/* <Divider />
			<Divider /> */}
		</>
	);
	return input;
}