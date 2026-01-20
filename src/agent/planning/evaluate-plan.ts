import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.js";
import { PlanDecisionSchema, type PlanDecision, type StepOutcome } from "../../tools/base.js";
import type { TodoStep } from "../agent-tasks.js";

export async function evaluate(args: {
	userQuery: string;
	lastOutcome: StepOutcome;
	remainingSteps: TodoStep[];
}): Promise<PlanDecision> {
	const { userQuery, lastOutcome, remainingSteps } = args;

	const openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
	});

	const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
		{
			role: "system",
			content:
				"You are the planner for a coding agent. Return ONLY JSON matching the schema"
		},
		{
			role: "developer",
			content:
				`Overall task: ${userQuery}\n` +
				`Remaining steps: ${JSON.stringify(remainingSteps, null, 2)}\n` +
				`Last outcome: ${JSON.stringify(lastOutcome, null, 2)}\n` +
				"Rules:\n" +
				" - If we already have enough info for a useful answer, choose 'finalize'.\n" +
				" - If we still need the next step(s) as-is, choose 'continue'.\n" +
				` - If a different order or new steps would help, choose 'revise' and output new_steps.`,
		},
	];

	const resp = await openai.chat.completions.parse({
		model: "gpt-4o-2024-08-06",
		messages,
		response_format: zodResponseFormat(PlanDecisionSchema, "plan_decision"),
	});

	return resp.choices[0]?.message.parsed!;
}
