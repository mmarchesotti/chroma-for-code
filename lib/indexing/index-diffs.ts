import { ChromaClient } from "chromadb";
import { addBatch } from "./add-batch";
import type { GitRepo } from "../utils/git";
import type { Chunk } from "../utils/chunking/split-chunk";
import { chunkFile } from "../utils/chunking/chunk-file";

export async function indexDiffs(
	repo: GitRepo, client: ChromaClient, oldCommit: string, newCommit: string, batchSize: number
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
