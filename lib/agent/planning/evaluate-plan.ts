import { PlanDecisionSchema, type PlanDecision, type StepOutcome } from "../../tools/base";
import type { TodoStep } from "../agent-tasks";
import type { LLMProvider, Message } from "../../model/types";

export async function evaluate(args: {
	userQuery: string;
	lastOutcome: StepOutcome;
	remainingSteps: TodoStep[];
	provider: LLMProvider;
}): Promise<PlanDecision> {
	const { userQuery, lastOutcome, remainingSteps, provider } = args;

	const messages: Message[] = [
		{
			role: "system",
			content:
				"You are the planner for a coding agent. Return ONLY valid JSON matching the schema with no additional text."
		},
		{
			role: "user",
			content:
				`Overall task: ${userQuery}\n` +
				`Remaining steps: ${JSON.stringify(remainingSteps, null, 2)}\n` +
				`Last outcome: ${JSON.stringify(lastOutcome, null, 2)}\n` +
				"Rules:\n" +
				" - If we already have enough info for a useful answer, choose 'finalize'.\n" +
				" - If we still need the next step(s) as-is, choose 'continue'.\n" +
				` - If a different order or new steps would help, choose 'revise' and output new_steps.` +

				`\n\nReturn JSON with this structure:
				{
					"decision": "continue" | "finalize" | "revise",
					"reason": "Short explanation of why",
					"new_steps"?: [...]
				}`
		},
	];


	return await provider.generateResponse(messages, PlanDecisionSchema);
}
