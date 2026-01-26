import { StepOutcomeSchema, type StepOutcome, type Tool } from '../tools/base';
import type { TodoStep } from './agent-tasks';
// Ensure this imports your generic interfaces
import { LLMProvider, Message } from '../model/types';

export async function runStep(opts: {
	step: TodoStep;
	userQuery: string;
	tools: Tool[];
	maxTurns?: number;
	provider: LLMProvider;
}): Promise<StepOutcome> {
	const { step, userQuery, tools, maxTurns = 10, provider } = opts;

	const messages: Message[] = [
		{
			role: "system",
			content:
				"You are executing ONE plan step. Use a tool when needed. " +
				"When you have enough information to summarize the result, stop calling tools.",
		},
		{

			role: "developer" as any,
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

	let turns = 0;
	while (turns < maxTurns) {
		const llmTools = tools.map(t => ({
			name: t.name,
			description: t.description,
			parameters: t.parameters as any
		}));

		const response = await provider.generateToolCalls(messages, llmTools);
		turns += 1;

		if (response.content) {
			messages.push({
				role: "assistant",
				content: response.content
			});
		}

		const call = response.toolCalls[0];
		if (!call) {
			break;
		}

		const tool = tools.find((t) => t.name === call.name);
		if (!tool) {
			messages.push({
				role: "user",
				content: `System Error: Hallucinated tool '${call.name}'`
			});
			continue;
		}

		console.log(`[Step ${step.id}] Executing ${tool.name}`);

		const result = await tool.execute(call.args);

		messages.push({
			role: "user",
			content: `Tool '${tool.name}' output: ${JSON.stringify(result)}`
		});
	}

	if (turns >= maxTurns) {
		return {
			status: "timeout",
			stepId: step.id,
			summary: `Hit maxTurns=${maxTurns} without finalizing.`,
		};
	}

	messages.push({
		role: "user",
		content: `We are done with tools. Now finalize this step.
    
    REQUIRED OUTPUT FORMAT:
    You must return a strict JSON object matching the schema.
    DO NOT return "action" or "action_input".
    
    The JSON must have these fields:
    - status: "succeeded" or "failed"
    - summary: A concise text summary of what was achieved.
    - stepId: "${step.id}"
    `
	});

	return await provider.generateResponse(messages, StepOutcomeSchema);
}
