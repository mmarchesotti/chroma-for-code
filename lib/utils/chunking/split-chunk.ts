import { encoding_for_model, type TiktokenModel } from "tiktoken";
import { uuidv4, ZodUUID } from "zod";

export type Chunk = {
	id: ZodUUID,
	document: string,
	startLine: number,
	endLine: number,
	symbol: string | null,
	filePath: string | null,
	language: string | null,
}

export function split(src: string, startLine: number, model: TiktokenModel): Chunk[] {
	if (!src.trim()) {
		return [];
	}

	const encoder = encoding_for_model(model);
	const MAX_TOKENS = getMaxTokens(model);

	const lines = src.split('\n');
	const NEW_LINE_TOKEN = encoder.encode('\n').length;

	let currentLines: string[] = [];
	let currentTokens = 0;
	let splitStart = startLine;

	const splits: Chunk[] = [];

	const flush = () => {
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

	encoder.free();

	if (currentLines.length > 0) {
		flush();
	}

	return splits;
}

function getMaxTokens(model: TiktokenModel): number {
	// TODO
	return 100;
}
