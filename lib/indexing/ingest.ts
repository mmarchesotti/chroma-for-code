import { CloudClient } from "chromadb";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
import * as dotenv from "dotenv";
import { getAllFiles } from "../utils/fs";
import { chunkFile } from "../utils/chunking/chunk-file";

dotenv.config();

export async function ingest(): Promise<void> {
	const files = await getAllFiles("../my-nextjs-chatbot-app");

	const modelName = "text-embedding-3-large"

	const client = new CloudClient();
	const collection = await client.getOrCreateCollection({
		name: "demo",
		embeddingFunction: new OpenAIEmbeddingFunction({
			modelName
		})
	});

	const chunks = [];
	for (const file of files) {
		chunks.push(...chunkFile(file, modelName));
	}

	for (let i = 0; i < chunks.length; i += 100) {
		const batch = chunks.slice(i, i + 100);
		await collection.add({
			ids: batch.map((c) => c.id.toString()),
			documents: batch.map((c) => c.document),
			metadatas: batch.map((c) => {
				const { id, document, ...metadata } = c;
				return metadata;
			})
		});
	}
}
