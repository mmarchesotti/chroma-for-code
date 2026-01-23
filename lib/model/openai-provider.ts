import { OpenAI } from 'openai';
import { zodFunction, zodResponseFormat } from 'openai/helpers/zod';
import { LLMProvider, LLMTool, Message, ToolCall } from './types';
import { ZodType } from 'zod';
import { encoding_for_model, TiktokenModel } from 'tiktoken';

export class OpenAIProvider implements LLMProvider {
	private client: OpenAI;
	private model: TiktokenModel;

	constructor(model: string = 'gpt-4o-2024-08-06') {
		this.client = new OpenAI();
		this.model = model as TiktokenModel;
	}

	async generateResponse<T>(messages: Message[], schema?: ZodType<T>): Promise<T> {
		const completion = await this.client.chat.completions.create({
			model: this.model,
			messages: messages as any,
			response_format: schema
				? zodResponseFormat(schema, "result")
				: undefined,
		});

		const content = completion.choices[0].message.content || "";

		if (schema) {
			return JSON.parse(content);
		}

		return content as T;
	}

	async countTokens(text: string): Promise<number> {
		const enc = encoding_for_model(this.model);
		const count = enc.encode(text).length;
		enc.free();
		return count;
	}

	async generateToolCalls(messages: Message[], tools: LLMTool[]): Promise<{ content: string | null; toolCalls: ToolCall[] }> {

		const formattedTools = tools.map(t => zodFunction({
			name: t.name,
			description: t.description,
			parameters: t.parameters
		}));

		const completion = await this.client.chat.completions.create({
			model: this.model,
			messages: messages as any,
			tools: formattedTools,
			tool_choice: "auto",
			parallel_tool_calls: false,
		});

		const choice = completion.choices[0].message;

		const toolCalls = choice.tool_calls
			?.filter(tc => tc.type === 'function')
			.map(tc => ({
				id: tc.id,
				name: tc.function.name,
				args: JSON.parse(tc.function.arguments)
			})) || [];

		return {
			content: choice.content,
			toolCalls
		};
	}
}
