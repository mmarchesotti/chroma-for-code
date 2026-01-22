import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	devIndicators: {
		position: "top-left",
	},
	serverExternalPackages: [
		"chromadb",
		"@chroma-core/openai",
		"pino",
		"tree-sitter",
		"tree-sitter-typescript",
		"tree-sitter-javascript",
		"tiktoken",
	],
};

export default nextConfig;
