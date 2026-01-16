import { CloudClient } from "chromadb";
import { chunkFile } from "./chunk-file.js";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
import * as dotenv from "dotenv";

dotenv.config();

async function ingest(): Promise<void> {
	const files = await walkRepo("../my-nextjs-chatbot-app");

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
			ids: batch.map((c) => c.id),
			documents: batch.map((c) => c.document),
			metadatas: batch.map((c) => {
				const { id, document, ...metadata } = c;
				return metadata;
			})
		});
	}
}
