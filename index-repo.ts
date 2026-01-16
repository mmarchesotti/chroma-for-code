import { ChromaClient } from "chromadb";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
import type { Chunk } from "./split-chunk.js";
import fs from 'node:fs'
import path from 'node:path'
import ignore from 'ignore'

async function indexAllFiles(repo: GitRepo, client: ChromaClient) {
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
		name: repo.name,
		embeddingFunction
	});

	let chunks: Chunk[] = []
}
