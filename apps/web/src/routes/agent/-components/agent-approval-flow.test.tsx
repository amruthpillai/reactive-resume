// @vitest-environment happy-dom

// Backend-free approval flow: a scripted ChatTransport from @shadcn/helpers drives useChat through
// halt (approval-requested) → user decision → composed sendAutomaticallyWhen → continuation.
import type { AgentUIMessage } from "@reactive-resume/ai/tools/agent-tool-contracts";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useChat } from "@ai-sdk/react";
import { createChat } from "@shadcn/helpers/ai-sdk";
import { lastAssistantMessageIsCompleteWithApprovalResponses, lastAssistantMessageIsCompleteWithToolCalls } from "ai";

function buildScriptedChat() {
	return createChat<AgentUIMessage>()
		.user("Tighten my summary")
		.assistant(({ writer }) => {
			writer.text("I would like to apply this edit.", { mode: "instant" });
			writer.tool("apply_resume_patch", {
				toolCallId: "call-1",
				approvalId: "approval-1",
				needsApproval: true,
				input: {
					title: "Tighten summary",
					operations: [{ op: "replace", path: "/sections/summary/content", value: "Impact-driven engineer" }],
				},
				// With needsApproval, output means "stream this after approval"; denial streams
				// tool-output-denied automatically.
				output: {
					actionId: "action-1",
					resumeId: "resume-1",
					title: "Tighten summary",
					operations: [{ op: "replace", path: "/sections/summary/content", value: "Impact-driven engineer" }],
					appliedUpdatedAt: "2026-08-20T00:00:00.000Z",
				},
			});
		})
		.assistant(({ writer, toolCall }) => {
			writer.text(toolCall?.denied ? "Understood, I left the resume unchanged." : "Done — the edit is applied.", {
				mode: "instant",
			});
		});
}

type HarnessProps = {
	chat: ReturnType<typeof buildScriptedChat>;
	decision: { approved: boolean; reason?: string };
};

// Minimal stand-in for AgentChat's wiring: same composed auto-send, same approval response call.
// AgentChat itself is deliberately not refactored to accept a transport prop for tests.
function ApprovalHarness({ chat, decision }: HarnessProps) {
	const { messages, sendMessage, addToolApprovalResponse } = useChat<AgentUIMessage>({
		transport: chat.transport({ delayMs: undefined }),
		sendAutomaticallyWhen: (options) =>
			lastAssistantMessageIsCompleteWithToolCalls(options) ||
			lastAssistantMessageIsCompleteWithApprovalResponses(options),
	});

	const pendingApproval = messages
		.flatMap((message) => message.parts)
		.find((part) => "state" in part && part.state === "approval-requested") as
		| { approval?: { id: string } }
		| undefined;

	return (
		<div>
			<button type="button" onClick={() => sendMessage({ text: "Tighten my summary" })}>
				send
			</button>
			{pendingApproval?.approval ? (
				<button
					type="button"
					onClick={() => void addToolApprovalResponse({ id: pendingApproval.approval?.id ?? "", ...decision })}
				>
					respond
				</button>
			) : null}
			<output>
				{messages
					.flatMap((message) => message.parts)
					.map((part) => ("state" in part && typeof part.state === "string" ? part.state : part.type))
					.join(",")}
			</output>
			<pre>
				{messages.map((message) => message.parts.map((part) => ("text" in part ? part.text : "")).join(" ")).join("\n")}
			</pre>
		</div>
	);
}

describe("agent approval flow (scripted transport)", () => {
	it("halts on approval-requested, then approves and streams the continuation with the tool output", async () => {
		render(<ApprovalHarness chat={buildScriptedChat()} decision={{ approved: true }} />);

		screen.getByRole("button", { name: "send" }).click();
		await waitFor(() => expect(screen.getByRole("status").textContent).toContain("approval-requested"));

		screen.getByRole("button", { name: "respond" }).click();

		// Composed sendAutomaticallyWhen fires the continuation without a manual send.
		await waitFor(() => expect(screen.getByText(/Done — the edit is applied/)).toBeInTheDocument());
		await waitFor(() => expect(screen.getByRole("status").textContent).toContain("output-available"));
	});

	it("denies: the call ends output-denied and the continuation reflects the denial", async () => {
		render(<ApprovalHarness chat={buildScriptedChat()} decision={{ approved: false, reason: "Wrong section" }} />);

		screen.getByRole("button", { name: "send" }).click();
		await waitFor(() => expect(screen.getByRole("status").textContent).toContain("approval-requested"));

		screen.getByRole("button", { name: "respond" }).click();

		await waitFor(() => expect(screen.getByText(/left the resume unchanged/)).toBeInTheDocument());
		await waitFor(() => expect(screen.getByRole("status").textContent).toContain("output-denied"));
	});
});
