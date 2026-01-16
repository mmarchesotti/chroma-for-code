import { ChromaClient } from "chromadb";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
import type { Chunk } from "./split-chunk.js";
import fs from 'node:fs'
import path from 'node:path'
import ignore from 'ignore'
import { GitRepo } from "./git-repo.js";
import { chunkFile } from "./chunk-file.js";
import { addBatch } from "./add-batch.js";

export async function indexAllFiles(repo: GitRepo, client: ChromaClient, commitID: string) {
	const ig = ignore();
	ig.add(".git");

	const gitignore = path.join(repo.path, ".gitignore");
	if (fs.existsSync(gitignore)) {
		const content = await fs.promises.readFile(gitignore, "utf8");
		ig.add(content);
	}

	const embeddingFunction = new OpenAIEmbeddingFunction({
		modelName: "text-embedding-3-large"
	});

	const collection = await client.createCollection({
		name: commitID,
		embeddingFunction
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
				const fileChunks = chunkFile(filePath, embeddingFunction.getConfig().model_name);
				chunks.push(...fileChunks);
				if (chunks.length > batchSize) {
					chunks = await addBatch(chunks, collection);
				}
			}
		}
	}

	await walkRepo(repo.path);
	while (chunks.length > 0) {
		chunks = await addBatch(chunks, collection);
	}
}
