import { ZodType } from "zod";

export interface Message {
	role: 'system' | 'user' | 'assistant' | 'developer';
	content: string;
}

export interface LLMTool {
	name: string;
	description: string;
	parameters: ZodType<any>;
}

export interface ToolCall {
	id: string;
	name: string;
	args: any;
}

export interface LLMProvider {
	generateResponse<T = string>(messages: Message[], schema?: ZodType<T>): Promise<T>;

	generateToolCalls(messages: Message[], tools: LLMTool[]): Promise<{
		content: string | null;
		toolCalls: ToolCall[];
	}>;

	countTokens(text: string): Promise<number>;
}
