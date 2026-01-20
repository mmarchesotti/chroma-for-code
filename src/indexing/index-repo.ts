import { ChromaClient } from "chromadb";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
import fs from 'node:fs'
import path from 'node:path'
import ignore from 'ignore'
import { addBatch } from "./add-batch.js";
import type { TiktokenModel } from "tiktoken";
import type { GitRepo } from "../utils/git.js";
import type { Chunk } from "../utils/chunking/split-chunk.js";
import { chunkFile } from "../utils/chunking/chunk-file.js";

export async function indexAllFiles(repo: GitRepo, client: ChromaClient, commitID: string, modelName: TiktokenModel, batchSize: number) {
	const ig = ignore();
	ig.add(".git");

	const gitignore = path.join(repo.path, ".gitignore");
	if (fs.existsSync(gitignore)) {
		const content = await fs.promises.readFile(gitignore, "utf8");
		ig.add(content);
	}

	const embeddingFunction = new OpenAIEmbeddingFunction({
		modelName: modelName
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
				const fileChunks = chunkFile(filePath, modelName);
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
