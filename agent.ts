import { symbolSearchTool } from "./symbol-search-tool.js";
import type { Tool } from "./tool.js";
import { runStep } from "./run-step.js";
import { evaluate } from "./evaluate-plan.js";
import { GitRepo } from "./git-repo.js";
import type { StepOutcome } from "./tool.js";

export async function agent(userQuery: string, repo: GitRepo) {
	const collection = await index(repo);

	const tools: Tool[] = [
		symbolSearchTool(collection),
		// regexSearchTool,
		// semanticSearchTool,
		// ftSearchTool,
		// getFileTool,
		// runShellCommandTool
	];

	let plan = await generateTodoList(userQuery);

	const outcomes: StepOutcome[] = [];

	while (plan.length > 0) {
		const step = plan[0];

		const outcome = await runStep({
			step,
			userQuery,
			tools,
		});

		plan.shift();
		outcomes.push(outcome);
		if (outcome.status === "failed" || outcome.status === "timeout") {
			break;
		}

		const decision = await evaluate({
			planTask: userQuery,
			lastOutcome: outcome,
			remainingSteps: plan,
		});

		if (decision.decision === "finalize") {
			break;
		}

		if (decision.decision === "revise") {
			plan = decision.newSteps;
		}
	}

	const finalAnswer = await finalizeAnswer({
		planTask: userQuery,
		outcomes,
	});

	return finalAnswer;
}
