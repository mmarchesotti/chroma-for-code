import type { StepOutcome } from "../../tools/base";
import { LLMProvider, Message } from "../../model/types";

export async function finalizeAnswer(args: {
	userQuery: string,
	outcomes: StepOutcome[],
	provider: LLMProvider
}): Promise<string> {
	const { userQuery, outcomes, provider } = args;

	const context = outcomes.map((o, index) => {
		return `Step ${index + 1} (${o.status}):
        - Goal: ${o.stepId} (Original plan step)
        - Result: ${o.summary}
        `;
	}).join("\n\n");

	const messages: Message[] = [
		{
			role: "system",
			content: `You are an expert software engineering assistant. 
        You have just completed a series of technical tasks to answer a user's question about a codebase.
        
        Your Goal:
        Synthesize the information gathered from the steps below into a clear, direct, and accurate answer.
        - If the user asked for code, provide the code snippets found.
        - If the user asked for an explanation, explain it using the context found.
        - If the process failed or was incomplete, explain what was found and what is still missing.
        
        Tone:
        Professional, technical, and helpful. Do not mention "Step 1" or "Step 2" explicitly unless necessary for clarity. Just answer the question.`
		},
		{
			role: "user",
			content: `USER QUESTION: "${userQuery}"

        ---
        EXECUTION HISTORY:
        ${context}
        ---
        
        Based on the history above, provide the final answer:`
		}
	];

	return await provider.generateResponse(messages);
}
