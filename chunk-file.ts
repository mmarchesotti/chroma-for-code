import fs from 'node:fs';
import path from 'node:path';
import Parser from 'tree-sitter'
import { LANG_CONFIG } from './chunk.js';
import type { SyntaxNode } from 'tree-sitter';
import { type TiktokenModel } from 'tiktoken';
import { split } from './split-chunk.js';

export function chunkFile(filePath: string, model: TiktokenModel): SyntaxNode[] {
	// Determine the file's extension
	const fileExtension = path.extname(filePath);

	// Grab the corresponding tree-sitter language config, or return if not
	// supported (we can also default to a naive fallback)
	const langConfig = LANG_CONFIG[fileExtension as keyof typeof LANG_CONFIG];
	if (!langConfig) {
		return []; // or fallback to naive line-based chunking
	}

	// Read the file's contents
	const fileContent = fs.readFileSync(filePath, 'utf-8');

	// Parse the file using tree-sitter
	const parser = new Parser();
	parser.setLanguage(langConfig.language);
	const tree = parser.parse(fileContent);

	const chunks: SyntaxNode[] = [];

	// Explore the parsed AST and collect chunks (from wantedNodes)
	const wantedNodes = collectTreeNodes(
		tree.rootNode,
		langConfig.wantedNodes,
	);
	wantedNodes.sort((a, b) => a.startIndex - b.startIndex);

	let cursor = 0;
	let line = tree.rootNode.startPosition.row;

	for (const node of wantedNodes) {
		// check if there is a gap
		if (cursor < node.startIndex) {
			const gap = fileContent.slice(cursor, node.startIndex);
			// add gap as a chunk
			chunks.push(...split(gap, line));
		}

		const nodeContent = fileContent.slice(node.startIndex, node.endIndex);
		const nodeLine = node.startPosition.row;
		const nodeSplits = split(nodeContent, nodeLine);
		// add metadata
		chunks.push(...nodeSplits.map((n) => {
			return {
				...n,
				symbol: node.childForFieldName("name")?.text // symbol node (class)
			}
		}));

		cursor = node.endIndex;
		line = node.endPosition.row;
	}

	// add more metadata
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
