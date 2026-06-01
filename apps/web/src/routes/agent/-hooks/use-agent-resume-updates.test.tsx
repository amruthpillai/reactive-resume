// @vitest-environment happy-dom

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentResumeUpdateSubscription } from "./use-agent-resume-updates";

const subscriptionMock = vi.hoisted(() => vi.fn());

const queryClientMock = vi.hoisted(() => ({
	invalidateQueries: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
	useQueryClient: () => queryClientMock,
}));

vi.mock("@/features/resume/builder/draft", () => ({
	useResumeUpdateSubscription: subscriptionMock,
}));

vi.mock("@/libs/orpc/client", () => ({
	orpc: {
		agent: {
			threads: {
				get: {
					queryKey: ({ input }: { input: { id: string } }) => ["agent", "threads", "get", input.id],
				},
				list: {
					queryKey: () => ["agent", "threads", "list"],
				},
			},
		},
	},
}));

describe("useAgentResumeUpdateSubscription", () => {
	beforeEach(() => {
		subscriptionMock.mockReset();
		queryClientMock.invalidateQueries.mockClear();
	});

	it("invalidates the active thread and thread list when the working resume changes", async () => {
		renderHook(() =>
			useAgentResumeUpdateSubscription({
				resumeId: "resume-1",
				threadId: "thread-1",
			}),
		);

		const options = subscriptionMock.mock.calls[0]?.[0] as
			| { resumeId?: string; onUpdate: () => Promise<void> }
			| undefined;
		expect(options?.resumeId).toBe("resume-1");

		await options?.onUpdate();

		expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
			queryKey: ["agent", "threads", "list"],
		});
		expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
			queryKey: ["agent", "threads", "get", "thread-1"],
		});
	});
});
