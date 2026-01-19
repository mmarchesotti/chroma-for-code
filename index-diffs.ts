import { ChromaClient } from "chromadb";
import { chunkFile } from "./chunk-file.js";
import type { Chunk } from "./split-chunk.js";
import { addBatch } from "./add-batch.js";
import { GitRepo } from "./git-repo.js";
import type { TiktokenModel } from "tiktoken";

export async function indexDiffs(
	repo: GitRepo, client: ChromaClient, oldCommit: string, newCommit: string, modelName: TiktokenModel, batchSize: number
) {
	const diffs = await repo.diffs(oldCommit, newCommit);

	const oldCollection = await client.getCollection({
		name: oldCommit,
	});

	const newCollection = await oldCollection.fork({ name: newCommit });

	const allFiles = [...diffs.added, ...diffs.deleted, ...diffs.modified]

	await newCollection.delete({
		where: { filePath: { "$in": allFiles } }
	})

	let chunks: Chunk[] = [];
	for (const filePath of [...diffs.added, ...diffs.modified]) {
		const fileChunks = chunkFile(
			filePath,
			modelName,
		);
		chunks.push(...fileChunks);
		if (chunks.length > batchSize) {
			chunks = await addBatch(chunks, newCollection, batchSize);
		}
	}

	while (chunks.length > 0) {
		chunks = await addBatch(chunks, newCollection, batchSize);
	}
}
