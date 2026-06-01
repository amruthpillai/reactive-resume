// @vitest-environment happy-dom

import type { StyleRule } from "@reactive-resume/schema/resume/data";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { isValidElement } from "react";

const updateResumeData = vi.hoisted(() => vi.fn());
const styleRules = vi.hoisted<StyleRule[]>(() => [
	{
		id: "style-global-heading",
		label: "All sections: Section heading",
		enabled: true,
		target: { scope: "global" },
		slots: { heading: { color: "rgba(220, 38, 38, 1)" } },
	},
]);

type SectionBaseProps = {
	children: React.ReactNode;
};

vi.mock("../shared/section-base", () => ({
	SectionBase: ({ children }: SectionBaseProps) => <div>{children}</div>,
}));

vi.mock("@/features/resume/builder/draft", () => ({
	useCurrentResume: () => ({
		data: {
			metadata: { styleRules },
			sections: {
				experience: { title: "Experience" },
				skills: { title: "Skills" },
			},
			customSections: [{ id: "custom-1", title: "Open Source", type: "projects" }],
		},
	}),
	useUpdateResumeData: () => updateResumeData,
}));

const { CustomStylesSectionBuilder } = await import("./custom-styles");
const { getSectionIcon, getSectionTitle } = await import("@/libs/resume/section");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

beforeEach(() => {
	updateResumeData.mockClear();
});

const renderCustomStyles = () =>
	render(
		<I18nProvider i18n={i18n}>
			<CustomStylesSectionBuilder />
		</I18nProvider>,
	);

const chooseComboboxOption = async (label: string, option: string) => {
	fireEvent.click(screen.getByLabelText(label));
	fireEvent.click(await screen.findByRole("option", { name: option }));
};

describe("CustomStylesSectionBuilder", () => {
	beforeEach(() => {
		styleRules.splice(0, styleRules.length);
		styleRules.push({
			id: "style-global-heading",
			label: "All sections: Section heading",
			enabled: true,
			target: { scope: "global" },
			slots: { heading: { color: "rgba(220, 38, 38, 1)" } },
		});
	});

	it("renders structured style rule controls", async () => {
		renderCustomStyles();

		expect(screen.getByLabelText("Target Scope")).toBeInTheDocument();
		expect(screen.getByLabelText("Style Slot")).toBeInTheDocument();
		expect(screen.getByLabelText("Text Color")).toBeInTheDocument();
		expect(screen.getByLabelText("Text Color").parentElement).toHaveClass("gap-3");
		expect(screen.getByLabelText("Text Color").parentElement?.parentElement?.parentElement).toHaveClass(
			"grid-cols-1",
			"@min-[20rem]:grid-cols-2",
			"@min-[35rem]:grid-cols-4",
		);
		expect(screen.getByLabelText("Text Color").parentElement?.parentElement?.parentElement).not.toHaveClass(
			"grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]",
		);
		expect(screen.getByLabelText("Text Decoration Color")).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Color" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Text" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Spacing" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Border" })).toBeInTheDocument();
		expect(screen.getByLabelText("Font Style")).toBeInTheDocument();
		expect(screen.getByLabelText("Line Height")).toBeInTheDocument();
		expect(screen.getByLabelText("Letter Spacing")).toBeInTheDocument();
		expect(screen.getByLabelText("Text Decoration")).toBeInTheDocument();
		expect(screen.getByLabelText("Decoration Style")).toBeInTheDocument();
		expect(screen.getByLabelText("Text Align")).toBeInTheDocument();
		expect(screen.getByLabelText("Text Transform")).toBeInTheDocument();
		expect(screen.getByLabelText("Opacity")).toBeInTheDocument();
		expect(screen.getByText("Padding")).toBeInTheDocument();
		expect(screen.getByLabelText("Margin Top")).toBeInTheDocument();
		expect(screen.getByLabelText("Margin Right")).toBeInTheDocument();
		expect(screen.getByLabelText("Margin Bottom")).toBeInTheDocument();
		expect(screen.getByLabelText("Margin Left")).toBeInTheDocument();
		expect(screen.getByLabelText("Row Gap")).toBeInTheDocument();
		expect(screen.getByLabelText("Column Gap")).toBeInTheDocument();
		expect(screen.getByLabelText("Border Style")).toBeInTheDocument();
		expect(screen.getByLabelText("Border Width").parentElement?.parentElement).toHaveClass(
			"grid-cols-1",
			"@min-[20rem]:grid-cols-2",
			"@min-[35rem]:grid-cols-4",
		);
		fireEvent.click(screen.getByLabelText("Style Slot"));
		expect(await screen.findByText("Section")).toBeInTheDocument();
		expect(screen.getByText("Rich text")).toBeInTheDocument();
		expect(await screen.findByRole("option", { name: "Section heading" })).toBeInTheDocument();
		expect(screen.getByRole("option", { name: "List" })).toBeInTheDocument();
		expect(screen.getByRole("option", { name: "List item content" })).toBeInTheDocument();
		expect(screen.queryByRole("option", { name: "Bullet or number" })).not.toBeInTheDocument();
	});

	it("labels the empty font weight option as default", () => {
		renderCustomStyles();

		expect(screen.getByLabelText("Font Weight")).toHaveTextContent("Default");
		expect(screen.queryByText("Template default")).not.toBeInTheDocument();
	});

	it("renames the sidebar entry and uses a distinct icon from design", () => {
		const designIcon = getSectionIcon("design");
		const stylesIcon = getSectionIcon("styles");

		expect(getSectionTitle("styles")).toBe("Custom Styles");
		expect(isValidElement(designIcon)).toBe(true);
		expect(isValidElement(stylesIcon)).toBe(true);
		expect(isValidElement(designIcon) && isValidElement(stylesIcon) && designIcon.type !== stylesIcon.type).toBe(true);
	});

	it("upserts one style rule for the selected target and slot", () => {
		styleRules.splice(0, styleRules.length);
		renderCustomStyles();

		fireEvent.change(screen.getByLabelText("Text Color"), { target: { value: "rgba(220, 38, 38, 1)" } });

		expect(updateResumeData).toHaveBeenCalledTimes(1);
		const recipe = updateResumeData.mock.calls[0]?.[0] as (draft: { metadata: { styleRules: unknown[] } }) => void;
		const draft = { metadata: { styleRules: [] } };
		recipe(draft);

		expect(draft.metadata.styleRules).toEqual([
			{
				id: "style-global-heading",
				label: "All sections: Section heading",
				enabled: true,
				target: { scope: "global" },
				slots: { heading: { color: "rgba(220, 38, 38, 1)" } },
			},
		]);
	});

	it("stores padding as per-side values", () => {
		styleRules.splice(0, styleRules.length);
		renderCustomStyles();

		expect(screen.getByText("Padding")).toBeInTheDocument();
		expect(screen.getByText("Padding")).toHaveClass("shrink-0");
		expect(screen.getByText("Padding").parentElement).toHaveClass("flex");
		expect(screen.queryByText("Padding Top")).not.toBeInTheDocument();
		expect(screen.getByLabelText("Padding Top")).toBeInTheDocument();
		expect(screen.getByLabelText("Padding Right")).toBeInTheDocument();
		expect(screen.getByLabelText("Padding Bottom")).toBeInTheDocument();
		expect(screen.getByLabelText("Padding Left")).toBeInTheDocument();
		expect(screen.getByLabelText("Padding Top")).toHaveAttribute("placeholder", "top");
		expect(screen.getByLabelText("Padding Right")).toHaveClass("text-center", "tabular-nums");

		fireEvent.change(screen.getByLabelText("Padding Top"), { target: { value: "12" } });

		expect(updateResumeData).toHaveBeenCalledTimes(1);
		const recipe = updateResumeData.mock.calls[0]?.[0] as (draft: { metadata: { styleRules: unknown[] } }) => void;
		const draft = { metadata: { styleRules: [] } };
		recipe(draft);

		expect(draft.metadata.styleRules).toEqual([
			{
				id: "style-global-heading",
				label: "All sections: Section heading",
				enabled: true,
				target: { scope: "global" },
				slots: { heading: { paddingTop: 12 } },
			},
		]);
	});

	it("stores text decoration intent", async () => {
		styleRules.splice(0, styleRules.length);
		renderCustomStyles();

		await chooseComboboxOption("Text Decoration", "Underline");

		expect(updateResumeData).toHaveBeenCalledTimes(1);
		const recipe = updateResumeData.mock.calls[0]?.[0] as (draft: { metadata: { styleRules: unknown[] } }) => void;
		const draft = { metadata: { styleRules: [] } };
		recipe(draft);

		expect(draft.metadata.styleRules).toEqual([
			{
				id: "style-global-heading",
				label: "All sections: Section heading",
				enabled: true,
				target: { scope: "global" },
				slots: { heading: { textDecoration: "underline" } },
			},
		]);
	});

	it("stores margin and gap intent", () => {
		styleRules.splice(0, styleRules.length);
		renderCustomStyles();

		expect(screen.getByText("Margin")).toBeInTheDocument();
		expect(screen.getByText("Margin")).toHaveClass("shrink-0");
		expect(screen.queryByText("Margin Bottom")).not.toBeInTheDocument();
		expect(screen.getByLabelText("Margin Bottom")).toHaveAttribute("min", "-72");
		expect(screen.getByLabelText("Margin Bottom")).toHaveAttribute("placeholder", "bottom");
		expect(screen.getByText("Gap")).toBeInTheDocument();
		expect(screen.queryByText("Row Gap")).not.toBeInTheDocument();
		expect(screen.getByLabelText("Row Gap")).toHaveAttribute("min", "-72");
		expect(screen.getByLabelText("Row Gap")).toHaveAttribute("placeholder", "row");

		fireEvent.change(screen.getByLabelText("Margin Bottom"), { target: { value: "-10" } });
		fireEvent.change(screen.getByLabelText("Row Gap"), { target: { value: "-6" } });

		expect(updateResumeData).toHaveBeenCalledTimes(2);

		const marginRecipe = updateResumeData.mock.calls[0]?.[0] as (draft: {
			metadata: { styleRules: unknown[] };
		}) => void;
		const marginDraft = { metadata: { styleRules: [] } };
		marginRecipe(marginDraft);

		expect(marginDraft.metadata.styleRules).toEqual([
			{
				id: "style-global-heading",
				label: "All sections: Section heading",
				enabled: true,
				target: { scope: "global" },
				slots: { heading: { marginBottom: -10 } },
			},
		]);

		const gapRecipe = updateResumeData.mock.calls[1]?.[0] as (draft: { metadata: { styleRules: unknown[] } }) => void;
		const gapDraft = { metadata: { styleRules: [] } };
		gapRecipe(gapDraft);

		expect(gapDraft.metadata.styleRules).toEqual([
			{
				id: "style-global-heading",
				label: "All sections: Section heading",
				enabled: true,
				target: { scope: "global" },
				slots: { heading: { rowGap: -6 } },
			},
		]);
	});

	it("stores list slot rules for rich text lists", async () => {
		styleRules.splice(0, styleRules.length);
		renderCustomStyles();

		await chooseComboboxOption("Style Slot", "List");
		fireEvent.change(screen.getByLabelText("Row Gap"), { target: { value: "8" } });

		expect(updateResumeData).toHaveBeenCalledTimes(1);
		const recipe = updateResumeData.mock.calls[0]?.[0] as (draft: { metadata: { styleRules: unknown[] } }) => void;
		const draft = { metadata: { styleRules: [] } };
		recipe(draft);

		expect(draft.metadata.styleRules).toEqual([
			{
				id: "style-global-richList",
				label: "All sections: List",
				enabled: true,
				target: { scope: "global" },
				slots: { richList: { rowGap: 8 } },
			},
		]);
	});

	it("can reset the selected style rule", () => {
		renderCustomStyles();

		fireEvent.click(screen.getByRole("button", { name: "Reset Style" }));

		expect(updateResumeData).toHaveBeenCalledTimes(1);
		const recipe = updateResumeData.mock.calls[0]?.[0] as (draft: {
			metadata: { styleRules: { id: string }[] };
		}) => void;
		const draft = {
			metadata: {
				styleRules: [
					{
						id: "style-global-heading",
						label: "All sections: Section heading",
						enabled: true,
						target: { scope: "global" },
						slots: { heading: { color: "rgba(0, 0, 0, 1)" } },
					},
					{
						id: "style-global-section",
						label: "All sections: Section container",
						enabled: true,
						target: { scope: "global" },
						slots: { section: { padding: 4 } },
					},
				],
			},
		};
		recipe(draft);

		expect(draft.metadata.styleRules.map((rule) => rule.id)).toEqual(["style-global-section"]);
	});

	it("lists applied style rules and toggles individual rules", () => {
		styleRules.push({
			id: "style-global-section",
			label: "All sections: Section container",
			enabled: false,
			target: { scope: "global" },
			slots: { section: { paddingTop: 4 } },
		});
		renderCustomStyles();

		expect(screen.getByText("Applied Rules")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Manage Rules" })).not.toBeInTheDocument();
		expect(screen.queryByText("All sections: Section heading")).not.toBeInTheDocument();
		expect(screen.queryByText("Off")).not.toBeInTheDocument();
		expect(screen.getAllByText("All sections").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Section heading").length).toBeGreaterThan(0);
		expect(screen.queryByRole("switch")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Enable All sections: Section container" })).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Disable All sections: Section heading" }));

		expect(updateResumeData).toHaveBeenCalledTimes(1);
		const recipe = updateResumeData.mock.calls[0]?.[0] as (draft: {
			metadata: { styleRules: { id: string; enabled: boolean }[] };
		}) => void;
		const draft = { metadata: { styleRules: [{ id: "style-global-heading", enabled: true }] } };
		recipe(draft);

		expect(draft.metadata.styleRules[0]?.enabled).toBe(false);
	});

	it("loads a selected applied rule into the editor form", () => {
		styleRules.push({
			id: "style-section-type-experience-richListItemContent",
			label: "Experience: List item content",
			enabled: true,
			target: { scope: "sectionType", sectionType: "experience" },
			slots: { richListItemContent: { lineHeight: 1.4 } },
		});
		renderCustomStyles();

		fireEvent.click(screen.getByRole("button", { name: "Edit Experience: List item content" }));

		expect(screen.getByLabelText("Target Scope")).toHaveTextContent("Section type");
		expect(screen.getByLabelText("Section Type")).toHaveTextContent("Experience");
		expect(screen.getByLabelText("Style Slot")).toHaveTextContent("List item content");
		expect(screen.getByLabelText("Line Height")).toHaveValue(1.4);
	});
});
