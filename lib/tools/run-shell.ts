import { exec } from "child_process";
import { promisify } from "util";
import { z } from 'zod';
import type { Tool } from "./base";

const execAsync = promisify(exec);

const ALLOWED_COMMANDS = [
	"npm test",
	"npm run lint",
	"ls",
	"git status",
	"git diff",
	"node -v"
];

export const runShellCommandTool = (): Tool => {
	return {
		name: "run_shell_command",
		description:
			"Execute a safe shell command. Allowed commands: 'npm test', 'npm run lint', 'ls', 'git status', 'git diff'.",
		parameters: {
			type: "object",
			required: ["command"],
			properties: {
				command: { type: "string", description: "The shell command to execute." },
			}
		},
		parse: (input) => RunShellArgsSchema.parse(input),
		execute: async (args: { command: string }) => {
			const { command } = args;

			const isAllowed = ALLOWED_COMMANDS.some(prefix => command.trim().startsWith(prefix));

			if (!isAllowed) {
				return `Error: Command "${command}" is not allowed for security reasons. Allowed commands are: ${ALLOWED_COMMANDS.join(", ")}`;
			}

			try {
				const { stdout, stderr } = await execAsync(command, {
					maxBuffer: 1024 * 1024 * 5
				});

				const output = stdout.trim();
				const errorOutput = stderr.trim();

				let result = "";
				if (output) result += `STDOUT:\n${output}\n`;
				if (errorOutput) result += `STDERR:\n${errorOutput}\n`;
				if (!result) result = "(Command completed with no output)";

				return result;
			} catch (error: any) {
				const stdout = error.stdout?.trim();
				const stderr = error.stderr?.trim();

				return `Command Failed (Exit Code ${error.code}):\n` +
					(stdout ? `STDOUT:\n${stdout}\n` : "") +
					(stderr ? `STDERR:\n${stderr}\n` : "") +
					(!stdout && !stderr ? error.message : "");
			}
		}
	};
};

const RunShellArgsSchema = z.object({
	command: z.string()
});
