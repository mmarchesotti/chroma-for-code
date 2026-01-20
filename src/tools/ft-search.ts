import type { Collection } from "chromadb";
import { z } from 'zod';
import type { Tool } from "./base.js";

export const ftSearchTool = (collection: Collection): Tool => {
	return {
		name: "code_full_text_search",
		description:
			"Search for code snippets containing an exact string or keyword. Faster than regex search. Use this for finding unique identifiers, specific error messages, or exact variable names.",
		parameters: {
			type: "object",
			required: ["query"],
			properties: {
				query: { type: "string", description: "The exact string to search for." },
				includePaths: { type: "array", items: { type: "string" }, default: [] }
			}
		},
		parse: (input) => FullTextSearchArgsSchema.parse(input),
		execute: async (query: string, includePaths?: string[]) => {
			const whereDocumentFilter = { "$contains": query };
			const getFilter: Record<string, any> = {
				whereDocument: whereDocumentFilter,
				include: ["metadatas", "documents"] as any
			};
			if (includePaths && includePaths.length > 0) {
				getFilter.where = { filePath: { "$in": includePaths } }
			}

			const records = await collection.get(getFilter);

			if (!records.ids.length) {
				return `No matches found for string: "${query}"`;
			}

			// 4. Format Output
			const content = records.ids.map((_, index) => {
				const meta = records.metadatas?.[index] as { filePath: string; startLine: number } | undefined;
				const doc = records.documents?.[index];

				const filePath = meta?.filePath ?? "unknown file";
				const line = meta?.startLine ?? 0;

				return `// file ${filePath} (Line ${line})\n${doc}`;
			}).join("\n\n");

			return content;
		}
	};
};

const FullTextSearchArgsSchema = z.object({
	query: z
		.string()
		.describe("The exact string to search for."),
	includePaths: z
		.array(z.string())
		.optional()
		.describe("Optional list of file paths to limit the search scope.")
});
