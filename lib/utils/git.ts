import { simpleGit } from 'simple-git';
import type { SimpleGit } from 'simple-git'
import path from 'path';

export class GitRepo {
	public path: string;
	public name: string;
	private git: SimpleGit;

	constructor(repoPath: string) {
		this.path = repoPath;
		this.name = path.basename(repoPath);
		this.git = simpleGit(repoPath);
	}

	async HEAD(): Promise<Commit> {
		return {
			id: await this.git.revparse(['HEAD']),
			comment: await this.getHeadMessage(),
		};
	}

	async getHeadMessage(): Promise<string> {
		const log = await this.git.log(['-1']);
		return log.latest?.message ?? "";
	}

	async diffs(fromCommit: string, toCommit: string): Promise<Diff> {
		const diffOutput = await this.git.diff([
			'--name-status',
			fromCommit,
			toCommit
		]);

		const changes: Diff = {
			added: [],
			modified: [],
			deleted: [],
		};

		diffOutput.split('\n').forEach(line => {
			if (!line.trim()) return;

			const parts = line.split(/\t/);
			const status = parts[0];
			const filename = parts[1];

			switch (status!.charAt(0).toUpperCase()) {
				case 'A':
					changes.added.push(filename!);
					break;
				case 'M':
					changes.modified.push(filename!);
					break;
				case 'D':
					changes.deleted.push(filename!);
					break;
				case 'R':
					const [, oldPath, newPath] = parts;

					changes.deleted.push(oldPath!);
					changes.added.push(newPath!);
					break;
			}
		});

		return changes;
	}
}

type Commit = {
	id: string,
	comment: string,
}

type Diff = {
	added: string[],
	deleted: string[],
	modified: string[],
}
