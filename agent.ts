import { symbolSearchTool } from "./symbol-search-tool.js";
import type { Tool } from "./tool.js";
import { runStep } from "./run-step.js";
import { evaluate } from "./evaluate-plan.js";
import { GitRepo } from "./git-repo.js";
import type { StepOutcome } from "./tool.js";
import { generatePlan } from "./generate-agent-plan.js";
import { finalizeAnswer } from "./finalize-plan.js";
import { syncRepo } from "./sync-repo.js";

export async function agent(userQuery: string, repo: GitRepo) {
	const collection = await syncRepo(repo);

	const tools: Tool[] = [
		symbolSearchTool(collection),
		// regexSearchTool,
		// semanticSearchTool,
		// ftSearchTool,
		// getFileTool,
		// runShellCommandTool
	];

	let steps = (await generatePlan(userQuery)).steps;

	const outcomes: StepOutcome[] = [];

	while (steps.length > 0) {
		const step = steps[0]!;

		const outcome = await runStep({
			step,
			userQuery,
			tools,
		});

		steps.shift();
		outcomes.push(outcome);
		if (outcome.status === "failed" || outcome.status === "timeout") {
			break;
		}

		const decision = await evaluate({
			userQuery: userQuery,
			lastOutcome: outcome,
			remainingSteps: steps,
		});

		if (decision.decision === "finalize") {
			break;
		}

		if (decision.decision === "revise") {
			steps = decision.newSteps;
		}
	}

	const finalAnswer = await finalizeAnswer({
		userQuery: userQuery,
		outcomes,
	});

	return finalAnswer;
}
