import { syncRepo } from "../indexing/sync-repo";
import type { StepOutcome, Tool } from "../tools/base";
import { ftSearchTool } from "../tools/ft-search";
import { getFileTool } from "../tools/get-file";
import { regexSearchTool } from "../tools/regex-search";
import { runShellCommandTool } from "../tools/run-shell";
import { semanticSearchTool } from "../tools/semantic-search";
import { symbolSearchTool } from "../tools/symbol-search";
import type { GitRepo } from "../utils/git";
import { evaluate } from "./planning/evaluate-plan";
import { finalizeAnswer } from "./planning/finalize-plan";
import { generatePlan } from "./planning/generate-agent-plan";
import { runStep } from "./run-step";
import { LLMProvider } from "../model/types";

export type AgentUpdate =
	| { type: "plan"; steps: string[] }
	| { type: "step-start"; stepId: string }
	| { type: "log"; message: string }
	| { type: "step-finish"; stepId: string; result: string };

export const agent = async (
	userQuery: string,
	repo: GitRepo,
	onUpdate: (update: AgentUpdate) => void,
	provider: LLMProvider
) => {
	onUpdate({ type: "log", message: "Syncing repository to database..." });
	const collection = await syncRepo(repo);

	const tools: Tool[] = [
		symbolSearchTool(collection),
		regexSearchTool(collection),
		semanticSearchTool(collection),
		ftSearchTool(collection),
		getFileTool(collection),
		runShellCommandTool(),
	];

	onUpdate({ type: "log", message: "Analyzing query and generating plan..." });

	let plan = await generatePlan(userQuery, provider);

	onUpdate({
		type: "plan",
		steps: plan.steps.map(s => s.description)
	});

	let steps = plan.steps;
	const outcomes: StepOutcome[] = [];

	while (steps.length > 0) {
		const step = steps[0]!;

		onUpdate({ type: "step-start", stepId: step.description });
		onUpdate({ type: "log", message: `Executing: ${step.description}` });

		const outcome = await runStep({
			step,
			userQuery,
			tools,
			provider,
		});

		onUpdate({
			type: "step-finish",
			stepId: step.description,
			result: outcome.summary
		});

		steps.shift();
		outcomes.push(outcome);

		if (outcome.status === "failed" || outcome.status === "timeout") {
			onUpdate({ type: "log", message: `Step failed: ${outcome.summary}` });
		}
		onUpdate({ type: "log", message: "Evaluating progress..." });

		const decision = await evaluate({
			userQuery,
			lastOutcome: outcome,
			remainingSteps: steps,
			provider,
		});

		if (decision.decision === "finalize") {
			onUpdate({ type: "log", message: "Goal achieved. Finalizing answer..." });
			break;
		}

		if (decision.decision === "revise") {
			onUpdate({ type: "log", message: "Plan revised based on new findings." });
			steps = decision.newSteps!;

			onUpdate({
				type: "plan",
				steps: [
					...outcomes.map(o => o.stepId),
					...steps.map(s => s.description)
				]
			});
		}
	}

	const finalAnswer = await finalizeAnswer({
		userQuery,
		outcomes,
		provider,
	});

	return finalAnswer;
};
