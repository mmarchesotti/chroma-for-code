import { agent } from "@/lib/agent/agent";
import { GitRepo } from "@/lib/utils/git";
import path from "path";

export const maxDuration = 60;

export async function POST(req: Request) {
	const { messages } = await req.json();
	const lastMessage = messages[messages.length - 1].content;

	const encoder = new TextEncoder();

	const repo = new GitRepo(process.cwd());

	const stream = new ReadableStream({
		async start(controller) {
			const sendUpdate = (data: any) => {
				controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
			};

			try {
				// 2. Call agent with ALL required arguments
				const finalAnswer = await agent(
					lastMessage,
					repo,
					(update) => {
						sendUpdate(update);
					}
				);

				sendUpdate({ type: "answer", content: finalAnswer });

			} catch (error: any) {
				console.error(error);
				sendUpdate({ type: "log", message: `Error: ${error.message}` });
			} finally {
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: { "Content-Type": "application/x-ndjson" },
	});
}
