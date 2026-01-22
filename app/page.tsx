"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Loader2, Send } from "lucide-react";

// Define our types locally so we don't need external libraries
type AgentStep = { id: string; label: string; status: "pending" | "running" | "done" };
type Message = { role: "user" | "assistant"; content: string };

export default function Page() {
	const [input, setInput] = useState("");
	const [messages, setMessages] = useState<Message[]>([]);
	const [steps, setSteps] = useState<AgentStep[]>([]);
	const [logs, setLogs] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim()) return;

		// 1. Optimistically add user message
		const userMsg = { role: "user" as const, content: input };
		setMessages((prev) => [...prev, userMsg]);
		setInput("");
		setIsLoading(true);
		setSteps([]);
		setLogs([]);

		try {
			// 2. Manual Fetch Request
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: [...messages, userMsg] }),
			});

			if (!response.body) throw new Error("No response body");

			// 3. Read the stream manually
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				// Decode chunks and split by newline (NDJSON)
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || ""; // Keep incomplete line in buffer

				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const update = JSON.parse(line);
						handleUpdate(update);
					} catch (err) {
						console.error("Parse error:", line);
					}
				}
			}
		} catch (error) {
			console.error("Stream failed:", error);
			setLogs(prev => [...prev, "Connection failed."]);
		} finally {
			setIsLoading(false);
		}
	};

	// 4. Update UI based on event type
	const handleUpdate = (update: any) => {
		if (update.type === "plan") {
			setSteps(update.steps.map((s: string) => ({ id: s, label: s, status: "pending" })));
		}
		else if (update.type === "step-start") {
			setSteps(prev => prev.map(s => s.label === update.stepId ? { ...s, status: "running" } : s));
		}
		else if (update.type === "step-finish") {
			setSteps(prev => prev.map(s => s.label === update.stepId ? { ...s, status: "done" } : s));
		}
		else if (update.type === "log") {
			setLogs(prev => [...prev, update.message]);
		}
		else if (update.type === "answer") {
			setMessages(prev => [...prev, { role: "assistant", content: update.content }]);
		}
	};

	return (
		<div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
			{/* LEFT: Chat */}
			<div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{messages.map((m, i) => (
						<div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
							<div className={`max-w-[80%] p-3 rounded-lg ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
								{m.content}
							</div>
						</div>
					))}
					{isLoading && <div className="p-4 text-gray-400 text-sm flex gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Thinking...</div>}
				</div>
				<form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
					<input
						className="flex-1 p-3 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
						value={input}
						onChange={e => setInput(e.target.value)}
						placeholder="Ask about your codebase..."
						disabled={isLoading}
					/>
					<button type="submit" disabled={isLoading} className="p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"><Send className="w-5 h-5" /></button>
				</form>
			</div>

			{/* RIGHT: Agent Internals */}
			<div className="w-[400px] bg-gray-50 p-6 overflow-y-auto border-l">
				<h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Agent Logic</h2>

				{steps.length > 0 && (
					<div className="mb-6 space-y-2">
						<h3 className="font-semibold">Plan</h3>
						{steps.map((step, i) => (
							<div key={i} className="flex items-center gap-2 text-sm">
								{step.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
								{step.status === "running" && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
								{step.status === "pending" && <Circle className="w-4 h-4 text-gray-300" />}
								<span className={step.status === "done" ? "text-gray-500" : ""}>{step.label}</span>
							</div>
						))}
					</div>
				)}

				{logs.length > 0 && (
					<div>
						<h3 className="font-semibold mb-2">Logs</h3>
						<div className="bg-white p-3 rounded border text-xs font-mono text-gray-600 h-64 overflow-y-auto">
							{logs.map((log, i) => <div key={i} className="border-b last:border-0 py-1">{log}</div>)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
