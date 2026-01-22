import { OpenAI } from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod';
import type { TodoStep } from './agent-tasks';
import type { ChatCompletionTool } from 'openai/resources';
import { StepOutcomeSchema, type StepOutcome, type Tool } from '../tools/base';

export async function runStep(opts: {
	step: TodoStep;
	userQuery: string;
	tools: Tool[];
	maxTurns?: number;
}): Promise<StepOutcome> {
	const { step, userQuery, tools, maxTurns = 10 } = opts;

	const openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
	});

	const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
		{
			role: "system",
			content:
				"You are executing ONE plan step. Use a tool when needed. " +
				"When you have enough information to summarize the result, stop calling tools.",
		},
		{
			role: "developer",
			content:
				`Step (${step.id}): ${step.title}\n` +
				`Goal: ${step.description}\n` +
				"Rules:\n" +
				" - Prefer concise outputs.\n" +
				" - If you cannot proceed due to missing context, stop calling tools."
		},
		{
			role: "user",
			content:
				`User question: ${userQuery}\n` + `You are solving step ${step.id}.`,
		},
	];

	const openaiTools = toOpenAITools(tools);

	let turns = 0;
	while (turns < maxTurns) {
		const resp = await openai.chat.completions.create({
			model: "gpt-4o-2024-08-06",
			messages,
			tools: openaiTools,
			parallel_tool_calls: false,
		});
		turns += 1;

		const assistant = resp.choices[0]?.message;
		const call = assistant?.tool_calls?.[0];

		if (!call || call.type != 'function') break;

		const tool = tools.find((t) => t.name === call.function.name)!;
		if (!tool) {
			return {
				status: "failed",
				stepId: step.id,
				summary: `Model hallucinated a tool: ${call.function.name}`,
			};
		}
		const args = tool.parse(call.function.arguments);
		const result = await tool.execute(args);

		messages.push({
			role: "tool",
			tool_call_id: call.id,
			content: JSON.stringify(result),
		});
	}

	if (turns >= maxTurns) {
		return {
			status: "timeout",
			stepId: step.id,
			summary: `Hit maxTurns=${maxTurns} without finalizing.`,
		};
	}

	const finalize = await openai.chat.completions.parse({
		model: "gpt-4o-2024-08-06",
		messages: [
			...messages,
			{
				role: "developer",
				content:
					"Now finalize this step. Return ONLY JSON matching the schema (no prose).",
			},
		],
		response_format: zodResponseFormat(StepOutcomeSchema, "step_outcome"),
	});

	return finalize.choices[0]?.message.parsed!;
}

function toOpenAITools(tools: Tool[]): ChatCompletionTool[] {
	const openaiTools = tools.map(tool => {
		return {
			type: "function" as const,
			function: {
				name: tool.name,
				description: tool.description,
				parameters: tool.parameters,
			}
		}
	});
	return openaiTools;
}
