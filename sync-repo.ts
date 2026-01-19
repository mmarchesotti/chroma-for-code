import { CloudClient } from "chromadb";
import { indexDiffs } from "./index-diffs.js";
import { GitRepo } from "./git-repo.js";
import { indexAllFiles } from "./index-repo.js";
import type { TiktokenModel } from "tiktoken";

const BATCH_SIZE = 100;

export async function syncRepo(repo: GitRepo) {
	const client = new CloudClient();

	const commits = await client.getOrCreateCollection({
		name: "commits"
	});

	const head = await repo.HEAD();

	const latest = await commits.get<{ latest: boolean }>({
		where: { latest: true }
	});

	let latestCommitID = latest.ids.length ? latest.ids[0] : null;

	const modelName: TiktokenModel = "text-embedding-3-small";

	if (!latestCommitID) {
		await indexAllFiles(repo, client, head.id, modelName, BATCH_SIZE);
		await commits.add({
			ids: [head.id],
			documents: [head.comment],
			metadatas: [{ latest: true }]
		})
		latestCommitID = head.id;
	}

	if (head.id !== latestCommitID) {
		await indexDiffs(repo, client, latestCommitID, head.id, modelName, BATCH_SIZE);
		await commits.update({ ids: [latestCommitID], metadatas: [{ latest: null }] })
		await commits.add({
			ids: [head.id],
			documents: [head.comment],
			metadatas: [{ latest: true }]
		})
		latestCommitID = head.id;
	}

	return client.getCollection({ name: latestCommitID });
}
