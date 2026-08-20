// @vitest-environment happy-dom

import type { UIMessage } from "ai";
import type { PatchApprovalResponse } from "./patch-approval-card";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { PatchApprovalCard } from "./patch-approval-card";

function approvalPart(overrides: Record<string, unknown> = {}) {
	return {
		type: "tool-apply_resume_patch",
		toolCallId: "call-1",
		state: "approval-requested",
		input: {
			title: "Tighten summary",
			summary: "Rewrites the opening line",
			operations: [{ op: "replace", path: "/sections/summary/content", value: "Impact-driven engineer" }],
		},
		approval: { id: "approval-1", signature: "sig" },
		...overrides,
	} as unknown as UIMessage["parts"][number];
}

const renderCard = (part: UIMessage["parts"][number], onRespond: (response: PatchApprovalResponse) => void) =>
	render(
		<I18nProvider i18n={i18n}>
			<PatchApprovalCard part={part} onRespond={onRespond} />
		</I18nProvider>,
	);

describe("PatchApprovalCard", () => {
	beforeAll(() => {
		i18n.loadAndActivate({ locale: "en", messages: {} });
	});

	it("renders the request with operation rows and calls back on approve", () => {
		const onRespond = vi.fn();
		renderCard(approvalPart(), onRespond);

		expect(screen.getByText("Tighten summary")).toBeInTheDocument();
		expect(screen.getByText("/sections/summary/content")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Approve" }));

		expect(onRespond).toHaveBeenCalledWith({ id: "approval-1", approved: true });
	});

	it("calls back on deny with the optional reason", () => {
		const onRespond = vi.fn();
		renderCard(approvalPart(), onRespond);

		fireEvent.change(screen.getByRole("textbox", { name: "Optional note for the agent" }), {
			target: { value: "Wrong section" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Deny" }));

		expect(onRespond).toHaveBeenCalledWith({ id: "approval-1", approved: false, reason: "Wrong section" });
	});

	it("renders no response controls when disabled (read-only thread)", () => {
		const onRespond = vi.fn();
		render(
			<I18nProvider i18n={i18n}>
				<PatchApprovalCard part={approvalPart()} disabled onRespond={onRespond} />
			</I18nProvider>,
		);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		expect(screen.getByText("This edit request can no longer be answered.")).toBeInTheDocument();
	});

	it("hides the buttons once the approval has been responded to", () => {
		const onRespond = vi.fn();
		renderCard(
			approvalPart({ state: "approval-responded", approval: { id: "approval-1", approved: true } }),
			onRespond,
		);

		expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
		expect(screen.getByText("Approved — waiting for the agent…")).toBeInTheDocument();
	});

	it("renders the declined terminal state", () => {
		const onRespond = vi.fn();
		renderCard(
			approvalPart({ state: "output-denied", approval: { id: "approval-1", approved: false, reason: "No" } }),
			onRespond,
		);

		expect(screen.getByText(/Edit declined/)).toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
