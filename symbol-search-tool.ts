import type { Collection } from "chromadb";
import type { Tool } from "./tool.js";
import { z } from 'zod'

export const symbolSearchTool = (collection: Collection): Tool => {
	return {
		name: "code_symbol_search",
		description:
			"Find symbol declarations/definitions by name. Use for functions, classes, interfaces, enums, or modules.",
		parameters: {
			type: "object",
			required: ["query"],
			properties: {
				query: { type: "string", description: "Symbol name to search." },
				includePaths: { type: "array", items: { type: "string" }, default: [] }
			}
		},
		parse: (input) => SymbolSearchArgsSchema.parse(input),
		execute: async (query: string, includePaths?: string[]) => {
			const whereFilter: Record<string, any> = { symbol: query };
			if (includePaths && includePaths.length > 0) {
				whereFilter.filePath = { "$in": includePaths }
			}
			const records = await collection.get<{ startLine: number; filePath: string }>({
				where: whereFilter
			})

			if (!records.ids.length) {
				return `${query} not found`
			}

			let content = `// file ${records.metadatas[0]?.filePath}\n`
			content += records.rows().sort((a, b) => a.metadata!.startLine - b.metadata!.startLine).join("\n");

			return content;
		}
	}
}

const SymbolSearchArgsSchema = z.object({
	query: z
		.string()
		.describe("Symbol name to search."),
	includePaths: z
		.array(z.string())
		.optional()
		.describe("Optional list of file paths to limit the search scope.")
});
