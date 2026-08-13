import type { Page } from "@playwright/test";
import { describe, expect, it, vi } from "vitest";
import { activePreviewPageSelector } from "./preview";
import { switchTemplate } from "./semantic-css";

vi.mock("@playwright/test", () => {
	const expect = Object.assign(() => ({ toBeVisible: async () => {} }), {
		poll: (read: () => Promise<unknown>) => ({
			toBe: async () => {
				await read();
				await read();
			},
		}),
	});
	return { expect };
});

vi.mock("./resume", () => ({
	createSampleResumeFromDashboard: vi.fn(),
	openSidebarSection: vi.fn(),
}));

describe("switchTemplate", () => {
	it("waits for the requested active preview when the template is already selected", async () => {
		let selectedPreview = "";
		const locator = {
			filter: () => locator,
			first: () => locator,
		};
		const section = {
			getByRole: () => ({ isVisible: async () => true }),
		};
		const page = {
			evaluate: async () => "same-bitmap",
			getByRole: (role: string) => (role === "region" ? section : locator),
			locator: (selector: string) => {
				selectedPreview = selector;
				return locator;
			},
		} as unknown as Page;

		await switchTemplate(page, "Glalie");

		expect(selectedPreview).toBe(activePreviewPageSelector("glalie"));
	});
});
