import { z } from 'zod';

export const TodoStepSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().describe("Written in first person"),
	status: z.enum(["pending", "executing", "cancelled", "completed"]),
});

export const TodoPlanSchema = z.object({
	id: z.string(),
	steps: z.array(TodoStepSchema).min(1),
});

export type TodoStep = z.infer<typeof TodoStepSchema>;
export type TodoPlan = z.infer<typeof TodoPlanSchema>;
