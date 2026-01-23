import { CloudClient } from "chromadb";
import { indexDiffs } from "./index-diffs";
import { indexAllFiles } from "./index-repo";
import type { GitRepo } from "../utils/git";
import { GeminiEmbedder } from "../model/gemini-embedding";

const BATCH_SIZE = 100;

export async function syncRepo(repo: GitRepo) {
	const client = new CloudClient();
	const embedder = new GeminiEmbedder();

	const commits = await client.getOrCreateCollection({
		name: "commits",
		embeddingFunction: embedder,
	});

	const head = await repo.HEAD();

	const latest = await commits.get<{ latest: boolean }>({
		where: { latest: true }
	});

	let latestCommitID = latest.ids.length ? latest.ids[0] : null;


	if (!latestCommitID) {
		await indexAllFiles(repo, client, head.id, BATCH_SIZE);
		await commits.add({
			ids: [head.id],
			documents: [head.comment],
			metadatas: [{ latest: true }]
		})
		latestCommitID = head.id;
	}

	if (head.id !== latestCommitID) {
		await indexDiffs(repo, client, latestCommitID, head.id, BATCH_SIZE);
		await commits.update({ ids: [latestCommitID], metadatas: [{ latest: null }] })
		await commits.add({
			ids: [head.id],
			documents: [head.comment],
			metadatas: [{ latest: true }]
		})
		latestCommitID = head.id;
	}

	return client.getCollection({
		name: latestCommitID,
		embeddingFunction: embedder,
	});
}
