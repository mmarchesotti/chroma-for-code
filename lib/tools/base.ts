import { z } from 'zod'
import { TodoStepSchema } from '../agent/agent-tasks';

export type Tool = {
	name: string;
	description: string;
	parameters: Record<string, unknown>;
	parse: (input: unknown) => any;
	execute: (args: any) => Promise<any>;
};

// used to generate summary
export const StepOutcomeSchema = z.object({
	status: z.enum(["succeeded", "blocked", "failed", "timeout"]),
	stepId: z.string(),
	summary: z
		.string()
		.describe(
			`What is the result, and what steps did you take to reach it. Be detailed and include information that can be useful for further steps later.`,
		),
});

export const PlanDecisionSchema = z.object({
	decision: z.enum(["continue", "finalize", "revise"]),
	reason: z.string(),
	newSteps: z.array(TodoStepSchema).default([]),
});

export type StepOutcome = z.infer<typeof StepOutcomeSchema>;
export type PlanDecision = z.infer<typeof PlanDecisionSchema>;
