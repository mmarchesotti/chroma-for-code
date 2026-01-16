import { uuidv4, ZodUUID } from "zod";

export type Chunk = {
	id: ZodUUID,
	document: string,
	startLine: number,
	endLine: number,
}

export function split(src: string, startLine: number, encoder: ): Chunk[] {
	if (!src.trim()) {
		return [];
	}

	// split the input source code into lines
	const lines = src.split('\n');
	const NEW_LINE_TOKEN = encoder.encode('\n').length;

	// initialize the current split
	let currentLines: string[] = [];
	let currentTokens = 0;
	let splitStart = startLine;

	const splits = [];

	const flush = () => {
		splits.push({
			id: uuidv4(),
			document: currentLines.join('\n'),
			startLine: splitStart,
			endLine: splitStart + currentLines.length - 1,
		});
	};

	// for every line
	for (const line of lines) {
		// tokenize the line
		const lineTokens = encoder.encode(line).length + NEW_LINE_TOKEN;
		// if the token size of the current split + current line tokens > maxTokens
		if (currentTokens + lineTokens > MAX_TOKENS && currentLines.length > 0) {
			// flush the current split
			flush();
			// reset the current split
			splitStart += currentLines.length;
			currentLines = [];
			currentTokens = 0;
		}

		// otherwise, add the line to the current split
		currentLines.push(line);
		currentTokens += lineTokens;
	}

	// add any remaining lines to their own split
	if (currentLines.length > 0) {
		flush();
	}

	return splits;
}
