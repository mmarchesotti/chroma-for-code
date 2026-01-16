import { ChromaClient } from "chromadb";
import { chunkFile } from "./chunk-file.js";
import type { Chunk } from "./split-chunk.js";
import { addBatch } from "./add-batch.js";

export async function indexDiffs(
	repo: GitRepo, client: ChromaClient, oldCommit: string, newCommit: string
) {
	const diffs = repo.diffs(oldCommit, newCommit);

	const oldCollection = await client.getCollection({
		name: oldCommit,
	});

	const newCollection = await oldCollection.fork({ name: newCommit });

	const allFiles = [...diffs.added, ...diffs.deleted, ...diffs.modified]

	await newCollection.delete({
		where: { filePath: "$in" allFiles }
	})

	let chunks: Chunk[] = [];
	for (const filePath of [...diffs.added, ...diffs.modified]) {
		const fileChunks = chunkFile(
			filePath,
			newCollection.configuration.embeddingFunction.getConfig().model_name
		);
		chunks.push(...fileChunks);
		if (chunks.length > BATCH_SIZE) {
			chunks = await addBatch(chunks, newCollection);
		}
	}

	while (chunks.length > 0) {
		chunks = await addBatch(chunks, newCollection);
	}
}
