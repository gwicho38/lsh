import { useInput, useStdout } from 'ink';
import React, { useState } from 'react';
import { Divider } from './Divider.js';

type _Props = {
	name: string | undefined;
};


export function UserInput({ ..._props }) {
	const [_feature, _setFeature] = useState('');
	const [_readData, _setReadData] = useState([]);
	const [_writeData, _setWriteData] = useState([]);
	const [_userInput, _setUserInput] = useState('');
	const [_name, _setName] = useState('');
	const _handleSubmit = (_query: string) => {
		// Do something with query
		console.log(_query);
		_setUserInput('');

	};
	const {stdout: _stdout, write: _write} = useStdout();

	const _handleChange = (_query: string) => {
	};

	useInput((input, _key) => {
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