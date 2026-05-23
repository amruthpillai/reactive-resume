// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { TemplateManagementCard } from "./template-card";

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

function renderWithI18n(ui: React.ReactElement) {
	return render(<I18nProvider i18n={i18n}>{ui}</I18nProvider>);
}

const baseTemplate = {
	id: "azurill",
	name: "Azurill",
	description: "A nice template",
	author: "RxResume",
	tags: ["Two-column", "Creative"],
	sidebarPosition: "left" as const,
	userId: null,
	createdAt: new Date(),
	updatedAt: new Date(),
};

vi.mock("@/libs/orpc/client", () => ({
	orpc: { templates: { deleteTemplate: { mutationOptions: () => ({ mutationFn: async () => ({}) }) } } },
	client: {},
}));

vi.mock("@/components/animation/comet-card", () => ({
	CometCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("TemplateManagementCard", () => {
	it("renders template name", () => {
		renderWithI18n(
			<TemplateManagementCard
				template={baseTemplate}
				isActive={false}
				resumeId={undefined}
				onActivate={vi.fn()}
				onExport={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		expect(screen.getByText("Azurill")).toBeTruthy();
	});

	it("does not render delete button for built-in template (userId null)", () => {
		renderWithI18n(
			<TemplateManagementCard
				template={baseTemplate}
				isActive={false}
				resumeId={undefined}
				onActivate={vi.fn()}
				onExport={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		expect(screen.queryByLabelText(/delete/i)).toBeNull();
	});

	it("renders delete button for user-imported template (userId set)", () => {
		renderWithI18n(
			<TemplateManagementCard
				template={{ ...baseTemplate, userId: "user-123" }}
				isActive={false}
				resumeId={undefined}
				onActivate={vi.fn()}
				onExport={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		expect(screen.getByLabelText(/delete/i)).toBeTruthy();
	});

	it("shows active ring when isActive=true", () => {
		const { container } = renderWithI18n(
			<TemplateManagementCard
				template={baseTemplate}
				isActive={true}
				resumeId="resume-1"
				onActivate={vi.fn()}
				onExport={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		expect(container.querySelector(".ring-2")).toBeTruthy();
	});
});
