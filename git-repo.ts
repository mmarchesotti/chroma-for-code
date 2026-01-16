import { simpleGit } from 'simple-git';
import type { SimpleGit } from 'simple-git'
import path from 'path';

export class GitRepo {
	public path: string;
	public name: string;
	private git: SimpleGit;

	constructor(repoPath: string) {
		this.path = repoPath;
		this.name = path.basename(repoPath); // Automatically gets folder name as repo name
		this.git = simpleGit(repoPath);
	}

	async HEAD(): Promise<Commit> {
		return {
			id: await this.git.revparse(['HEAD']),
			comment: await this.getHeadMessage(),
		};
	}

	async diffs(fromCommit: string, toCommit: string): Promise<string> {
		return this.git.diff([fromCommit, toCommit]);
	}

	async getHeadMessage(): Promise<string> {
		const log = await this.git.log(['-1']);
		return log.latest?.message ?? "";
	}
}

type Commit = {
	id: string,
	comment: string,
}
