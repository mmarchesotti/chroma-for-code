import { CloudClient } from "chromadb";
import { indexDiffs } from "./index-diffs.js";

async function storeCommit(repo: GitRepo) {
	const client = new CloudClient();

	const commits = await client.getOrCreate({
		name: "commits"
	});

	const head = await repo.HEAD();

	const latest = await commits.get<{ latest: boolean }>(
		where: { latest: true }
	);

	let latestCommitID = latest.ids.length ? latest.ids[0] : undefined;

	if (!latestCommitID) {
		await indexAllFiles(repo, client, head.id);
		await commits.add({
			ids: [head.id],
			documents: [head.comment],
			metadatas: [{ latest: true }]
		})
		latestCommitID = head.id;
	}

	if (head.id !== latestCommitID) {
		await indexDiffs(repo, client, latestCommitID, head.id);
		await commits.update({ ids: [latestCommitID], metadatas: { latest: null } })
		await commits.add({
			ids: [head.id],
			documents: [head.comment],
			metadatas: [{ latest: true }]
		})
		latestCommitID = head.id;
	}
}
