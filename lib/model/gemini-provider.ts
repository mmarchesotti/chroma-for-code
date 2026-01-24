import { GoogleGenerativeAI } from '@google/generative-ai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { LLMProvider, LLMTool, Message, ToolCall } from './types';
import { ZodType } from 'zod';

export class GeminiProvider implements LLMProvider {
	private genAI: GoogleGenerativeAI;
	private modelName: string;

	constructor(modelName: string = 'gemini-1.5-pro') {
		if (!process.env.GOOGLE_API_KEY) {
			throw new Error("Missing GOOGLE_API_KEY environment variable");
		}
		this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
		this.modelName = modelName;
	}

	async generateResponse<T>(messages: Message[], schema?: ZodType<T>): Promise<T> {
		const systemMessage = messages.find(
			(m) => m.role === 'system' || m.role === 'developer'
		);

		const chatHistory = messages.filter(
			(m) => m.role !== 'system' && m.role !== 'developer'
		);

		const model = this.genAI.getGenerativeModel({
			model: this.modelName,
			systemInstruction: systemMessage ? systemMessage.content : undefined
		});

		const generationConfig: any = {};
		if (schema) {
			generationConfig.responseMimeType = "application/json";
			const jsonSchema = zodToJsonSchema(schema as any, "result");

			generationConfig.responseSchema = jsonSchema.definitions?.result || jsonSchema;
		}

		const history = chatHistory.slice(0, -1).map((m) => ({
			role: m.role === 'user' ? 'user' : 'model',
			parts: [{ text: m.content }],
		}));

		const chat = model.startChat({
			history,
			generationConfig
		});

		const lastMessage = chatHistory[chatHistory.length - 1];
		if (!lastMessage) {
			throw new Error("No user message found to send to Gemini.");
		}

		const result = await chat.sendMessage(lastMessage.content);
		const text = result.response.text();

		if (schema) {
			try {
				const json = JSON.parse(text);
				return schema.parse(json);
			} catch (error) {
				console.error("Gemini JSON Parse Error:", text);
				throw new Error("Failed to parse Gemini JSON response");
			}
		}

		return text as T;
	}

	async countTokens(text: string): Promise<number> {
		const model = this.genAI.getGenerativeModel({ model: this.modelName });
		const { totalTokens } = await model.countTokens(text);
		return totalTokens;
	}

	private getCleanHistory(messages: Message[]) {
		const systemMessage = messages.find(m => m.role === 'system' || m.role === 'developer');
		const chatHistory = messages.filter(m => m.role !== 'system' && m.role !== 'developer');
		return { systemMessage, chatHistory };
	}

	async generateToolCalls(messages: Message[], tools: LLMTool[]): Promise<{ content: string | null; toolCalls: ToolCall[] }> {
		const { systemMessage, chatHistory } = this.getCleanHistory(messages);


		const geminiTools = tools.map(t => ({
			name: t.name,
			description: t.description,
			parameters: t.parameters,
		}));

		const model = this.genAI.getGenerativeModel({
			model: this.modelName,
			systemInstruction: systemMessage?.content,
			tools: [{ functionDeclarations: geminiTools as any }]
		});

		const chat = model.startChat({
			history: chatHistory.slice(0, -1).map(m => ({
				role: m.role === 'user' ? 'user' : 'model',
				parts: [{ text: m.content }]
			}))
		});

		const lastMessage = chatHistory[chatHistory.length - 1];
		const result = await chat.sendMessage(lastMessage.content);

		const response = result.response;
		const functionCalls = response.functionCalls();

		const toolCalls: ToolCall[] = functionCalls?.map(fc => ({
			id: crypto.randomUUID(),
			name: fc.name,
			args: fc.args
		})) || [];

		return {
			content: response.text(),
			toolCalls
		};
	}
}
