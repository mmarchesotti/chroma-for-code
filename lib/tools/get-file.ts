import type { Collection } from "chromadb";
import { z } from 'zod';
import type { Tool } from "./base";

export const getFileTool = (collection: Collection): Tool => {
	return {
		name: "code_get_file",
		description:
			"Retrieve the full content of a specific file. Use this when you need to read a whole file to understand the broader context or implementation details.",
		parameters: {
			type: "object",
			required: ["filePath"],
			properties: {
				filePath: { type: "string", description: "The full relative path of the file to retrieve (e.g., 'src/utils/auth.ts')." }
			}
		},
		parse: (input) => GetFileArgsSchema.parse(input),
		execute: async (args = { filePath: string }) => {
			const { filePath } = args;

			const records = await collection.get({
				where: { filePath: filePath },
				include: ["metadatas", "documents"] as any
			});

			if (!records.ids.length || !records.documents) {
				return `File not found: ${filePath}`;
			}

			const chunks = records.ids.map((id, index) => {
				const meta = records.metadatas?.[index] as { startLine: number; filePath: string } | undefined;
				const doc = records.documents?.[index];
				return {
					id,
					startLine: meta?.startLine ?? 0,
					content: doc ?? ""
				};
			});

			chunks.sort((a, b) => a.startLine - b.startLine);

			let fileContent = `// File: ${filePath}\n`;
			fileContent += chunks.map(c => c.content).join("\n");

			return fileContent;
		}
	};
};

const GetFileArgsSchema = z.object({
	filePath: z
		.string()
		.describe("The full relative path of the file to retrieve (e.g., 'src/utils/auth.ts').")
});
