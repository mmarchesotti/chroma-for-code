import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { TodoPlanSchema, TodoStepSchema } from "../agent-tasks";
import { LLMProvider, Message } from "../../model/types";

// 1. Define what we want the LLM to give us (Just the list)
const PlanArraySchema = z.array(TodoStepSchema);

type TodoPlan = z.infer<typeof TodoPlanSchema>;

export async function generatePlan(
	prompt: string,
	provider: LLMProvider,
	maxSteps: number = 5,
): Promise<TodoPlan> {

	const messages: Message[] = [
		{
			role: "system",
			content: `You are a senior software engineer.
      
      GOAL: Break the user's task into concrete, verifiable steps.
      
      RULES:
      1. The maximum number of steps is ${maxSteps}.
      2. The status of the first step MUST be "executing".
      3. The status of all other steps MUST be "pending".
      
      OUTPUT FORMAT:
      Return a JSON ARRAY of objects.
      
      EXAMPLE:
      [
        {
          "id": "step-1",
          "title": "Analyze codebase",
          "description": "Run symbol search...",
          "status": "executing"
        }
      ]`,
		},
		{ role: "user", content: prompt },
	];


	const stepsArray = await provider.generateResponse(messages, PlanArraySchema);


	return {
		id: uuidv4(),
		steps: stepsArray
	};
}
