import TSLang from 'tree-sitter-typescript';

const tsConfig = {
	language: TSLang.typescript,
	name: 'typescript',
	wantedNodes: new Set<string>([
		'function_declaration',
		'class_declaration',
		'interface_declaration',
	]),
};

type Language = typeof TSLang.typescript;

type ChunkConfig = {
	language: Language,
	name: string,
	wantedNodes: Set<string>,
}

const tsxConfig: ChunkConfig = {
	language: TSLang.tsx,
	name: tsConfig.name,
	wantedNodes: tsConfig.wantedNodes,
};

export const LANG_CONFIG = {
	'.ts': tsConfig,
	'.tsx': tsxConfig,
};
