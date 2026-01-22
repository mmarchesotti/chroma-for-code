import type { Collection } from "chromadb";
import type { Chunk } from "../utils/chunking/split-chunk";

export async function addBatch(
	chunks: Chunk[], collection: Collection, batchSize: number
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
