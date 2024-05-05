import { useInput, useStdout } from 'ink';
import React, { useState } from 'react';
import { Divider } from './Divider.js';

type Props = {
	name: string | undefined;
};


export function UserInput({ ...props }) {
	const [feature, setFeature] = useState('');
	const [readData, setReadData] = useState([]);
	const [writeData, setWriteData] = useState([]);
	const [userInput, setUserInput] = useState('');
	const [name, setName] = useState('');
	const handleSubmit = query => {
		// Do something with query
		console.log(query);
		setUserInput('');

	};
	const {stdout, write} = useStdout();

	const handleChange = query => {
	};

	useInput((input, key) => {
		console.log(input);
		// console.log(key);
		if (input === 'q') {
			// Exit program
		};
	});

	const input = (
		<>
			<Divider />

			{/* <UncontrolledTextInput
				focus={true}
				onSubmit={handleSubmit}
				initialValue={userInput}
				value={userInput}
				onChange={handleChange}
				placeholder={''}
				// mask={'*'}
				highlightPastedText={true}
				showCursor={true}>
					{stdout.value}
			</UncontrolledTextInput> */}
			<Divider />
		</>
	);
	return input;
}