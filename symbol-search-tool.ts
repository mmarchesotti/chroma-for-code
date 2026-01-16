import type { Collection } from "chromadb";
import type { Tool } from "./tool.js";

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
			const records = await collection.get<{ startLine: number; filePath: string }>({
				where: {
					symbol: query,
					filePath: includePaths ? { "$in": includePaths } : undefined
				}
			})

			if (!records.ids.length) {
				return `${query} not found`
			}

			let content = `// file ${records.metadatas[0].filePath}\n`
			content += records.rows().sort((a, b) => a.startLine - b.startLine).join("\n");

			return content;
		}
	}
}
