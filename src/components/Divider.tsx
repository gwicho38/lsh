// Divider
import { Text } from 'ink';
import React from 'react';
import stringWidth from 'string-width';

export const Divider = ({
	title,
	width,
	padding,
	titlePadding,
	titleColor,
	dividerChar
}:
{
  title: string | null,
	width: number,
	padding: number,
	titlePadding: number,
	titleColor: string,
	dividerChar: string
}
) => {
  const getSideDividerWidth = (width: any, titleWidth: any) => (width - titleWidth) / 2
  const getNumberOfCharsPerWidth = (char: any, width: any) => width / stringWidth(char)
  const PAD = ' '
	const titleString = title ? `${PAD.repeat(titlePadding) + title + PAD.repeat(titlePadding)}` : ''
	const titleWidth = stringWidth(titleString)
	const dividerWidth = getSideDividerWidth(width, titleWidth)
	const numberOfCharsPerSide = getNumberOfCharsPerWidth(dividerChar, dividerWidth)
	const dividerSideString = dividerChar.repeat(numberOfCharsPerSide)
	const paddingString = PAD.repeat(padding)

	return (
		<>
			{paddingString}
			<Text color="grey">{dividerSideString}</Text>
			<Text color={titleColor}>{titleString}</Text>
			<Text color="grey">{dividerSideString}</Text>
			{paddingString}
		</>
	)
}

Divider.defaultProps = {
	title: "LSH REPL",
	width: 60,
	padding: 0,
	titlePadding: 1,
	titleColor: 'white',
	dividerChar: '~'
}
