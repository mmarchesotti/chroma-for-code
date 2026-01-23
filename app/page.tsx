"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Loader2, Send, Settings } from "lucide-react";

type AgentStep = { id: string; label: string; status: "pending" | "running" | "done" };
type Message = { role: "user" | "assistant" | "developer"; content: string };

const AVAILABLE_MODELS = [
	{ id: "gemini-3-flash-preview", name: "Gemini 3 Flash" },
	{ id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
	{ id: "gpt-4-turbo", name: "GPT-4 Turbo" },
];

export default function Page() {
	const [input, setInput] = useState("");
	const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
	const [messages, setMessages] = useState<Message[]>([]);
	const [steps, setSteps] = useState<AgentStep[]>([]);
	const [logs, setLogs] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim()) return;

		const userMsg = { role: "user" as const, content: input };
		setMessages((prev) => [...prev, userMsg]);
		setInput("");
		setIsLoading(true);
		setSteps([]);
		setLogs([]);

		try {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [...messages, userMsg],

					model: selectedModel,
				}),
			});

			if (!response.body) throw new Error("No response body");

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

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

			<div className="w-[400px] bg-gray-50 p-6 overflow-y-auto border-l flex flex-col gap-6">

				<div>
					<div className="flex items-center gap-2 mb-3">
						<Settings className="w-4 h-4 text-gray-500" />
						<h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Configuration</h2>
					</div>
					<div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
						<label className="block text-xs font-semibold text-gray-600 mb-2">Model Provider</label>
						<select
							value={selectedModel}
							onChange={(e) => setSelectedModel(e.target.value)}
							className="w-full p-2 text-sm border rounded bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
							disabled={isLoading}
						>
							{AVAILABLE_MODELS.map(model => (
								<option key={model.id} value={model.id}>
									{model.name}
								</option>
							))}
						</select>
					</div>
				</div>

				<div>
					<h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Agent Logic</h2>

					{steps.length > 0 && (
						<div className="mb-6 space-y-2">
							<h3 className="font-semibold text-sm">Plan</h3>
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
							<h3 className="font-semibold mb-2 text-sm">Logs</h3>
							<div className="bg-white p-3 rounded border text-xs font-mono text-gray-600 h-64 overflow-y-auto">
								{logs.map((log, i) => <div key={i} className="border-b last:border-0 py-1 break-all">{log}</div>)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
