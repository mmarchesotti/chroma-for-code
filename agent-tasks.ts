import { z } from 'zod';

export const TodoStepsSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().describe("Written in first person"),
	status: z.enum(["pending", "executing", "cancelled", "completed"]),
});

export const TodoPlanSchema = z.object({
	id: z.string(),
	steps: z.array(TodoStepsSchema).min(1),
});
