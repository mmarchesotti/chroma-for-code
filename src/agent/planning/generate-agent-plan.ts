import { zodResponseFormat } from "openai/helpers/zod.js";
import { TodoPlanSchema } from "./agent-tasks.js";
import OpenAI from "openai";
import z from "zod";

type TodoPlan = z.infer<typeof TodoPlanSchema>;

export async function generatePlan(
	prompt: string,
	maxSteps: number = 3,
): Promise<TodoPlan> {
	const openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
	});

	const completion = await openai.chat.completions.parse({
		model: "gpt-4o-2024-08-06",
		temperature: 0.2,
		messages: [
			{
				role: "system",
				content: `You are a senior software engineer. The user will give you a task or ask a question about the codebase they are working with. Break the task into concrete, verifiable steps. The maximum number of steps is ${maxSteps}. The status of the first item should be "executing". Return only JSON that matches the schema. `,
			},
			{ role: "user", content: prompt },
		],
		response_format: zodResponseFormat(TodoPlanSchema, "todo_plan"),
	});

	return completion.choices[0]?.message.parsed as TodoPlan;
}
