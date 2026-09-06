// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

const source = await import("./pages?raw").then((module) => module.default);

const mocks = vi.hoisted(() => ({
	resume: undefined as unknown as { data: ResumeData; isLocked: boolean },
	updateResumeData: vi.fn(),
}));

vi.mock("@/features/resume/builder/draft", () => ({
	useCurrentResume: () => mocks.resume,
	useUpdateResumeData: () => mocks.updateResumeData,
}));

const { LayoutPages } = await import("./pages");

beforeAll(() => i18n.loadAndActivate({ locale: "en", messages: {} }));

beforeEach(() => {
	vi.clearAllMocks();
	const data = structuredClone(defaultResumeData);
	data.metadata.layout.pages = [{ fullWidth: false, main: ["summary"], sidebar: ["profiles"] }];
	mocks.resume = { data, isLocked: false };
});

const renderLayoutPages = () =>
	render(
		<I18nProvider i18n={i18n}>
			<LayoutPages />
		</I18nProvider>,
	);

describe("layout page header", () => {
	it("uses container queries to prevent narrow sidebar control collisions", () => {
		expect(source).toContain("@container bg-secondary/50");
		expect(source).toContain("grid-cols-[minmax(0,1fr)_auto]");
		expect(source).toContain("@max-[22rem]:grid-cols-1");
		expect(source).toContain("flex min-w-0 flex-wrap");
	});
});

describe("authored page guidance", () => {
	it("explains why one authored page can produce multiple non-editable PDF overflow pages without changing layout data", () => {
		const physicalRenderEvidence = { pageCount: 3 };
		const pagesBeforeRender = structuredClone(mocks.resume.data.metadata.layout.pages);

		expect(mocks.resume.data.metadata.layout.pages).toHaveLength(1);
		expect(physicalRenderEvidence.pageCount).toBeGreaterThan(mocks.resume.data.metadata.layout.pages.length);

		renderLayoutPages();

		const guidance = screen.getByRole("note", { name: "Authored pages and PDF overflow" });
		expect(guidance).toHaveTextContent(
			"Pages listed here are authored pages saved with your resume. A long authored page may continue onto extra PDF pages automatically; those overflow pages are not saved or editable separately.",
		);
		expect(guidance).toHaveTextContent("Move to");
		expect(guidance).toHaveTextContent("New Page");
		expect(guidance).toHaveTextContent("Full Width");
		expect(mocks.updateResumeData).not.toHaveBeenCalled();
		expect(mocks.resume.data.metadata.layout.pages).toEqual(pagesBeforeRender);
	});

	it("keeps guidance available in locked resumes and out of keyboard tab order", async () => {
		mocks.resume.isLocked = true;
		const user = userEvent.setup();

		renderLayoutPages();

		expect(screen.getByRole("note", { name: "Authored pages and PDF overflow" })).toBeVisible();
		await user.tab();
		expect(screen.getByRole("switch", { name: "Full Width" })).toHaveFocus();
		expect(mocks.updateResumeData).not.toHaveBeenCalled();
	});
});
