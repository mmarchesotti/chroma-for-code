import fs from 'node:fs';
import path from 'node:path';
import Parser from 'tree-sitter'
import { LANG_CONFIG } from './chunk.js';
import type { SyntaxNode } from 'tree-sitter';
import { type TiktokenModel } from 'tiktoken';
import { split, type Chunk } from './split-chunk.js';

export function chunkFile(filePath: string, model: TiktokenModel): Chunk[] {
	const fileExtension = path.extname(filePath);

	const langConfig = LANG_CONFIG[fileExtension as keyof typeof LANG_CONFIG];
	if (!langConfig) {
		return []; // or fallback to naive line-based chunking
	}

	const fileContent = fs.readFileSync(filePath, 'utf-8');

	const parser = new Parser();
	parser.setLanguage(langConfig.language);
	const tree = parser.parse(fileContent);

	const chunks: Chunk[] = [];

	const wantedNodes = collectTreeNodes(
		tree.rootNode,
		langConfig.wantedNodes,
	);
	wantedNodes.sort((a, b) => a.startIndex - b.startIndex);

	let cursor = 0;
	let line = tree.rootNode.startPosition.row;

	for (const node of wantedNodes) {
		if (cursor < node.startIndex) {
			const gap = fileContent.slice(cursor, node.startIndex);
			chunks.push(...split(gap, line, model));
		}

		const nodeContent = fileContent.slice(node.startIndex, node.endIndex);
		const nodeLine = node.startPosition.row;
		const nodeSplits = split(nodeContent, nodeLine, model);
		chunks.push(...nodeSplits.map((n) => {
			return {
				...n,
				symbol: node.childForFieldName("name")!.text // symbol node (class)
			}
		}));

		cursor = node.endIndex;
		line = node.endPosition.row;
	}

	return chunks.map((chunk, _) => {
		return {
			...chunk,
			filePath,
			language: langConfig.name,
		};
	});
}

function collectTreeNodes(
	node: SyntaxNode,
	wantedNodes: Set<string>,
): SyntaxNode[] {
	const treeNodes: SyntaxNode[] = [];
	if (wantedNodes.has(node.type)) {
		treeNodes.push(node);
	} else {
		for (const child of node.children) {
			treeNodes.push(...collectTreeNodes(child, wantedNodes));
		}
	}
	return treeNodes;
}
