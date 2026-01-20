import { syncRepo } from "../indexing/sync-repo.js";
import type { StepOutcome, Tool } from "../tools/base.js";
import { ftSearchTool } from "../tools/ft-search.js";
import { getFileTool } from "../tools/get-file.js";
import { regexSearchTool } from "../tools/regex-search.js";
import { runShellCommandTool } from "../tools/run-shell.js";
import { semanticSearchTool } from "../tools/semantic-search.js";
import { symbolSearchTool } from "../tools/symbol-search.js";
import type { GitRepo } from "../utils/git.js";
import { evaluate } from "./planning/evaluate-plan.js";
import { finalizeAnswer } from "./planning/finalize-plan.js";
import { generatePlan } from "./planning/generate-agent-plan.js";
import { runStep } from "./run-step.js";

export async function agent(userQuery: string, repo: GitRepo) {
	const collection = await syncRepo(repo);

	const tools: Tool[] = [
		symbolSearchTool(collection),
		regexSearchTool(collection),
		semanticSearchTool(collection),
		ftSearchTool(collection),
		getFileTool(collection),
		runShellCommandTool(),
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
