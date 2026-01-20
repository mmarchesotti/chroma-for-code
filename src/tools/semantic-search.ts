import type { Collection } from "chromadb";
import { z } from 'zod';
import type { Tool } from "./base.js";

export const semanticSearchTool = (collection: Collection): Tool => {
	return {
		name: "code_semantic_search",
		description:
			"Search for code by meaning or concept. Use this when you don't know the exact class/function name but know what the code does (e.g., 'database connection logic', 'user validation').",
		parameters: {
			type: "object",
			required: ["query"],
			properties: {
				query: { type: "string", description: "Natural language query describing the code functionality." },
				includePaths: { type: "array", items: { type: "string" }, default: [] },
				limit: { type: "integer", default: 5, description: "Number of results to return." }
			}
		},
		parse: (input) => SemanticSearchArgsSchema.parse(input),
		execute: async (query: string, includePaths?: string[], limit: number = 5) => {
			const queryFilter: Record<string, any> = {
				queryTexts: [query],
				nResults: limit,
				include: ["metadatas", "documents", "distances"] as any
			};
			if (includePaths && includePaths.length > 0) {
				queryFilter.where = { filePath: { "$in": includePaths } }
			}

			const results = await collection.query(queryFilter);

			const docs = results.documents?.[0];
			const metas = results.metadatas?.[0];

			if (!docs || docs.length === 0) {
				return `No semantically relevant code found for query: "${query}"`;
			}

			const content = docs.map((doc, index) => {
				const meta = metas?.[index] as { filePath: string; startLine: number } | undefined;
				const filePath = meta?.filePath ?? "unknown file";
				const line = meta?.startLine ?? 0;

				return `// file ${filePath} (Line ${line})\n${doc}`;
			}).join("\n\n");

			return content;
		}
	};
};

const SemanticSearchArgsSchema = z.object({
	query: z
		.string()
		.describe("Natural language query describing the code functionality."),
	includePaths: z
		.array(z.string())
		.optional()
		.describe("Optional list of file paths to limit the search scope."),
	limit: z
		.number()
		.int()
		.optional()
		.default(5)
		.describe("Number of results to return.")
});
