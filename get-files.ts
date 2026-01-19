import { promises as fs } from 'fs';
import * as path from 'path';

export async function getAllFiles(dir: string): Promise<string[]> {
	let results: string[] = [];

	const entries = await fs.readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.name === '.git' || entry.name === 'node_modules') continue;

		if (entry.isDirectory()) {
			const subFiles = await getAllFiles(fullPath);
			results = results.concat(subFiles);
		} else {
			results.push(fullPath);
		}
	}

	return results;
}
