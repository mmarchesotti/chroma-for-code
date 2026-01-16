import type { Chunk } from "./split-chunk.js";
import type { Collection } from "chromadb";

const BATCH_SIZE = 100;

export async function addBatch(
	chunks: Chunk[], collection: Collection, batchSize: number = BATCH_SIZE
) {
	const batch = chunks.slice(0, batchSize);
	await collection.add({
		ids: batch.map((chunk) => chunk.id.toString()),
		documents: batch.map((chunk) => chunk.document),
		metadatas: batch.map((chunk) => {
			const { id, document, ...metadata } = chunk;
			return metadata;
		}),
	});
	return batch.slice(batchSize);
}
