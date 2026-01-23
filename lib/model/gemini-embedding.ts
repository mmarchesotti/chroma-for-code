import { GoogleGenerativeAI } from "@google/generative-ai";

export interface IEmbeddingFunction {
	generate(texts: string[]): Promise<number[][]>;
}

export class GeminiEmbedder implements IEmbeddingFunction {
	private genAI: GoogleGenerativeAI;
	private model: any;

	constructor() {
		this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

		this.model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
	}

	async generate(texts: string[]): Promise<number[][]> {

		const result = await this.model.batchEmbedContents({
			requests: texts.map((t) => ({
				content: { role: "user", parts: [{ text: t }] },
				taskType: "RETRIEVAL_DOCUMENT",
			})),
		});

		return result.embeddings.map((e: any) => e.values);
	}
}
