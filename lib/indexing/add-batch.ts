import type { Collection } from "chromadb";
import type { Chunk } from "../utils/chunking/split-chunk";

export async function addBatch(
	chunks: Chunk[], collection: Collection, batchSize: number
) {
	const batch = chunks.slice(0, batchSize);
	await collection.add({
		ids: batch.map((chunk) => chunk.id),
		documents: batch.map((chunk) => chunk.document),
		metadatas: batch.map((chunk) => ({
			startLine: chunk.startLine,
			endLine: chunk.endLine,
			symbol: chunk.symbol ?? "",
			filePath: chunk.filePath ?? "",
			language: chunk.language ?? "",
		})),
	});;
	return batch.slice(batchSize);
}
