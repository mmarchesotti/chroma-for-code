import type { Collection } from "chromadb";
import { z } from 'zod';
import type { Tool } from "./base";

export const regexSearchTool = (collection: Collection): Tool => {
	return {
		name: "code_regex_search",
		description:
			"Search for code snippets using a regular expression. Useful for finding string patterns, TODOs, comments, or specific usage patterns not captured by symbol search.",
		parameters: {
			type: "object",
			required: ["pattern"],
			properties: {
				pattern: { type: "string", description: "The regular expression pattern to search for." },
				includePaths: { type: "array", items: { type: "string" }, default: [] }
			}
		},
		parse: (input) => RegexSearchArgsSchema.parse(input),
		execute: async (pattern: string, includePaths?: string[]) => {
			const getFilter: Record<string, any> = {
				include: ["metadatas", "documents"] as any
			};
			if (includePaths && includePaths.length > 0) {
				getFilter.where = { filePath: { "$in": includePaths } }
			}

			const records = await collection.get(getFilter);

			if (!records.ids.length) {
				return `No files found to search within.`;
			}

			const regex = new RegExp(pattern);
			const matches: Array<{ filePath: string; startLine: number; content: string }> = [];

			records.ids.forEach((_, index) => {
				const doc = records.documents?.[index];
				const meta = records.metadatas?.[index] as { filePath: string; startLine: number } | undefined;

				if (doc && meta && regex.test(doc)) {
					matches.push({
						filePath: meta.filePath,
						startLine: meta.startLine,
						content: doc
					});
				}
			});

			if (matches.length === 0) {
				return `No matches found for regex pattern: "${pattern}"`;
			}

			const content = matches
				.sort((a, b) => {
					if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath);
					return a.startLine - b.startLine;
				})
				.map(m => `// file ${m.filePath} (Line ${m.startLine})\n${m.content}`)
				.join("\n\n");

			return content;
		}
	}
}

const RegexSearchArgsSchema = z.object({
	pattern: z
		.string()
		.describe("The regular expression pattern to search for."),
	includePaths: z
		.array(z.string())
		.optional()
		.describe("Optional list of file paths to limit the search scope.")
});
