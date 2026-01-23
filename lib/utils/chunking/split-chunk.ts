import { encoding_for_model } from "tiktoken";
import { v4 as uuidv4 } from "uuid";

export type Chunk = {
	id: string;
	document: string;
	startLine: number;
	endLine: number;
	symbol: string | null;
	filePath: string | null;
	language: string | null;
};

export function split(src: string, startLine: number): Chunk[] {
	if (!src.trim()) {
		return [];
	}

	const encodingModel = "gpt-4o";
	const encoder = encoding_for_model(encodingModel);

	const MAX_TOKENS = getMaxTokens(encodingModel);

	const lines = src.split('\n');
	const NEW_LINE_TOKEN = encoder.encode('\n').length;

	let currentLines: string[] = [];
	let currentTokens = 0;
	let splitStart = startLine;

	const splits: Chunk[] = [];

	const flush = () => {
		if (currentLines.length === 0) return;
		splits.push({
			id: uuidv4(),
			document: currentLines.join('\n'),
			startLine: splitStart,
			endLine: splitStart + currentLines.length - 1,
			symbol: null,
			filePath: null,
			language: null,
		});
	};

	for (const line of lines) {
		const lineTokens = encoder.encode(line).length + NEW_LINE_TOKEN;


		if (currentTokens + lineTokens > MAX_TOKENS && currentLines.length > 0) {
			flush();
			splitStart += currentLines.length;
			currentLines = [];
			currentTokens = 0;
		}

		currentLines.push(line);
		currentTokens += lineTokens;
	}

	try {
		if (currentLines.length > 0) {
			flush();
		}
	} finally {
		encoder.free();
	}

	return splits;
}

function getMaxTokens(modelId: string): number {
	return 2048;
}
