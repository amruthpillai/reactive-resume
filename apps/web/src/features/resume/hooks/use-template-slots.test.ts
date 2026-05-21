// @vitest-environment happy-dom
import type { ResumeSlot } from "@reactive-resume/schema/template-metadata";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useTemplateSlots } from "./use-template-slots";

const EXPERIENCE_SLOT: ResumeSlot = {
	id: "logoUrl",
	itemType: "experienceItem",
	type: "url",
	label: "Company Logo URL",
	required: false,
};

const SKILL_SLOT: ResumeSlot = {
	id: "iconSvg",
	itemType: "skillItem",
	type: "text",
	label: "Icon SVG",
	required: false,
};

vi.mock("@/libs/orpc/client", () => ({
	orpc: {
		templates: {
			exportTemplate: {
				queryOptions: ({ input }: { input: { id: string } }) => ({
					queryKey: ["templates", "export", input.id],
					queryFn: async () => ({
						id: input.id,
						name: "Test",
						inputs: [EXPERIENCE_SLOT, SKILL_SLOT],
					}),
				}),
			},
		},
	},
}));

vi.mock("@/features/resume/builder/draft", () => ({
	useResumeData: () => ({
		metadata: { template: "test-template-id" },
	}),
}));

function makeWrapper() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return ({ children }: { children: React.ReactNode }) =>
		React.createElement(QueryClientProvider, { client }, children);
}

describe("useTemplateSlots", () => {
	it("returns slots matching the given itemType after data loads", async () => {
		const { result } = renderHook(() => useTemplateSlots("experienceItem"), { wrapper: makeWrapper() });

		await waitFor(() => {
			expect(result.current).toHaveLength(1);
		});

		expect(result.current[0]).toMatchObject({ id: "logoUrl", itemType: "experienceItem" });
	});

	it("returns empty array initially before data loads", () => {
		const { result } = renderHook(() => useTemplateSlots("experienceItem"), { wrapper: makeWrapper() });
		expect(result.current).toEqual([]);
	});

	it("filters out slots for other itemTypes", async () => {
		const { result } = renderHook(() => useTemplateSlots("skillItem"), { wrapper: makeWrapper() });

		await waitFor(() => {
			expect(result.current).toHaveLength(1);
		});

		expect(result.current[0]).toMatchObject({ id: "iconSvg", itemType: "skillItem" });
	});
});
