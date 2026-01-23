import { ChromaClient } from "chromadb";
import fs from 'node:fs'
import path from 'node:path'
import ignore from 'ignore'
import { addBatch } from "./add-batch";
import type { GitRepo } from "../utils/git";
import type { Chunk } from "../utils/chunking/split-chunk";
import { chunkFile } from "../utils/chunking/chunk-file";
import { GeminiEmbedder } from "../model/gemini-embedding";

export async function indexAllFiles(repo: GitRepo, client: ChromaClient, commitID: string, batchSize: number) {
	const ig = ignore();
	ig.add(".git");

	const gitignore = path.join(repo.path, ".gitignore");
	if (fs.existsSync(gitignore)) {
		const content = await fs.promises.readFile(gitignore, "utf8");
		ig.add(content);
	}

	const embedder = new GeminiEmbedder();
	const collection = await client.getOrCreateCollection({
		name: commitID,
		embeddingFunction: embedder,
	});

	let chunks: Chunk[] = [];

	const walkRepo = async (dir: string) => {
		const entries = await fs.promises
			.readdir(dir, { withFileTypes: true })
			.catch(() => []);

		for (const entry of entries) {
			const absPath = path.join(dir, entry.name);
			const filePath = path.relative(repo.path, absPath);

			if (ig.ignores(filePath)) {
				continue;
			}

			if (entry.isDirectory()) {
				await walkRepo(absPath);
			} else if (entry.isFile()) {
				const fileChunks = chunkFile(filePath);
				chunks.push(...fileChunks);
				if (chunks.length > batchSize) {
					chunks = await addBatch(chunks, collection, batchSize);
				}
			}
		}
	}

	await walkRepo(repo.path);
	while (chunks.length > 0) {
		chunks = await addBatch(chunks, collection, batchSize);
	}
}
