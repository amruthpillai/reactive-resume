import { describe, expect, it } from "vitest";
import type { DraftData, DraftResume } from "@/schema/draft/data";
import { draftFactory } from "@/schema/draft/data";
import { resumeStylesFactory } from "@/schema/resume/styles";
import { resumeViewFactory, resumeViewSchema, unzipResumeView, zipResumeView } from "@/schema/resume/view";

type SectionKey = DraftResume.SectionType;

const sectionTypes = [
	"profiles",
	"experience",
	"education",
	"projects",
	"skills",
	"languages",
	"interests",
	"awards",
	"certifications",
	"publications",
	"volunteer",
	"references",
] as const satisfies SectionKey[];

const iconSectionTypes = new Set<SectionKey>(["profiles", "skills", "interests"]);

/**
 * @remarks
 * Builds a DraftData payload with a single item in each section.
 * Useful for verifying style extraction across the full section surface.
 */
const createDraftWithSectionItems = (): DraftData => {
	const data = draftFactory.draft.empty();

	for (const type of sectionTypes) {
		data.sections[type].items = [
			draftFactory.sections.item.empty(type, `${type}-1`),
		] as DraftData["sections"][typeof type]["items"];
	}

	return data;
};

/**
 * @remarks
 * Builds a custom section with a single item, matching the section type.
 */
const createCustomSectionWithItem = <T extends SectionKey>(type: T, id: string) => {
	const section = draftFactory.customSections.item.empty(id, type);
	section.items = [draftFactory.sections.item.empty(type, `${id}-item`)];
	return section;
};

/**
 * @remarks
 * Mirrors the factory logic for expected item style resolution.
 */
const resolveExpectedItemStyle = (
	styles: ReturnType<typeof resumeStylesFactory.defaults>,
	itemStyle: { hidden: boolean; options?: { showLinkInTitle: boolean }; icon?: string },
) => {
	const base = {
		...styles.baseItem,
		options: styles.baseItem.options ?? styles.itemOptions,
	};

	return {
		...base,
		...itemStyle,
		options: itemStyle.options ?? base.options,
	};
};

/**
 * @remarks
 * Validates smaller merge behaviors before covering full zip/unzip flows.
 */
describe("zipResumeView (small merge behaviors)", () => {
	/**
	 * @remarks
	 * Ensures base item options fall back to itemOptions when missing.
	 */
	it("falls back to itemOptions when base options are missing", () => {
		const data = draftFactory.draft.empty();
		data.sections.profiles.items = [draftFactory.sections.item.empty("profiles", "profile-1")];

		const styles = resumeStylesFactory.defaults();
		styles.itemOptions = { showLinkInTitle: true };
		styles.baseItem.hidden = true;
		styles.baseItem.options = undefined;
		styles.items.profile.hidden = false;
		styles.items.profile.options = undefined;

		const view = zipResumeView({ data, styles });
		const item = view.sections.profiles.items[0];

		expect(item.options).toEqual({ showLinkInTitle: true });
		expect(item.hidden).toBe(false);
	});

	/**
	 * @remarks
	 * Ensures section and item styles are merged into the view payload.
	 */
	it("merges section styles and item styles into view sections", () => {
		const data = draftFactory.draft.empty();
		data.sections.experience.items = [draftFactory.sections.item.empty("experience", "exp-1")];

		const styles = resumeStylesFactory.defaults();
		styles.section.hidden = true;
		styles.section.columns = 2;
		styles.items.experience.hidden = true;

		const view = zipResumeView({ data, styles });

		expect(view.sections.experience.hidden).toBe(true);
		expect(view.sections.experience.columns).toBe(2);
		expect(view.sections.experience.items[0].hidden).toBe(true);
	});

	/**
	 * @remarks
	 * Ensures custom field styles are merged into basics custom fields.
	 */
	it("merges custom field styles into basics custom fields", () => {
		const data = draftFactory.draft.empty();
		data.basics.customFields = [draftFactory.basics.customField.empty("cf-1")];

		const styles = resumeStylesFactory.defaults();
		styles.customField.icon = "github-logo";

		const view = zipResumeView({ data, styles });

		expect(view.basics.customFields[0].icon).toBe("github-logo");
	});

	/**
	 * @remarks
	 * Ensures custom sections are styled using the correct item style mapping.
	 */
	it("styles custom sections by section type", () => {
		const data = draftFactory.draft.empty();
		data.customSections = sectionTypes.map((type) => createCustomSectionWithItem(type, `custom-${type}`));

		const styles = resumeStylesFactory.defaults();
		const view = zipResumeView({ data, styles });

		const expectedStylesBySection: Record<SectionKey, ReturnType<typeof resolveExpectedItemStyle>> = {
			profiles: resolveExpectedItemStyle(styles, styles.items.profile),
			experience: resolveExpectedItemStyle(styles, styles.items.experience),
			education: resolveExpectedItemStyle(styles, styles.items.education),
			projects: resolveExpectedItemStyle(styles, styles.items.project),
			skills: resolveExpectedItemStyle(styles, styles.items.skill),
			languages: resolveExpectedItemStyle(styles, styles.items.language),
			interests: resolveExpectedItemStyle(styles, styles.items.interest),
			awards: resolveExpectedItemStyle(styles, styles.items.award),
			certifications: resolveExpectedItemStyle(styles, styles.items.certification),
			publications: resolveExpectedItemStyle(styles, styles.items.publication),
			volunteer: resolveExpectedItemStyle(styles, styles.items.volunteer),
			references: resolveExpectedItemStyle(styles, styles.items.reference),
		};

		for (const [index, type] of sectionTypes.entries()) {
			const section = view.customSections[index];
			const item = section.items[0] as Record<string, unknown>;
			const expectedStyle = expectedStylesBySection[type];

			expect(section.hidden).toBe(styles.customSection.hidden);
			expect(section.columns).toBe(styles.customSection.columns);
			expect(item.hidden).toBe(expectedStyle.hidden);
			expect(item.options).toEqual(expectedStyle.options);

			if (iconSectionTypes.has(type)) {
				expect(item.icon).toBe(expectedStyle.icon);
			} else {
				expect("icon" in item).toBe(false);
			}
		}
	});
});

/**
 * @remarks
 * Validates unzip behaviors, from field stripping to style extraction.
 */
describe("unzipResumeView (style extraction)", () => {
	/**
	 * @remarks
	 * Ensures view-only fields are removed from data outputs.
	 */
	it("strips style fields from items when unzipping", () => {
		const data = draftFactory.draft.empty();
		data.sections.profiles.items = [draftFactory.sections.item.empty("profiles", "profile-1")];
		data.basics.customFields = [draftFactory.basics.customField.empty("cf-1")];

		const view = zipResumeView({ data, styles: resumeStylesFactory.defaults() });
		const result = unzipResumeView(view);

		const profile = result.data.sections.profiles.items[0] as Record<string, unknown>;
		const customField = result.data.basics.customFields[0] as Record<string, unknown>;

		expect("hidden" in profile).toBe(false);
		expect("options" in profile).toBe(false);
		expect("icon" in profile).toBe(false);
		expect("icon" in customField).toBe(false);
	});

	/**
	 * @remarks
	 * Ensures custom field styles derive from the first custom field when present.
	 */
	it("extracts custom field styles from the first custom field", () => {
		const data = draftFactory.draft.empty();
		data.basics.customFields = [draftFactory.basics.customField.empty("cf-1")];

		const view = zipResumeView({ data, styles: resumeStylesFactory.defaults() });
		view.basics.customFields[0].icon = "github-logo";

		const result = unzipResumeView(view);
		expect(result.styles.customField.icon).toBe("github-logo");
	});

	/**
	 * @remarks
	 * Ensures defaults are used when the view lacks section items.
	 */
	it("falls back to default item styles when sections are empty", () => {
		const view = resumeViewFactory.defaults();
		const defaults = resumeStylesFactory.defaults();
		const result = unzipResumeView(view);

		expect(result.styles.items.profile).toEqual(defaults.items.profile);
		expect(result.styles.customSection).toEqual(defaults.customSection);
	});

	/**
	 * @remarks
	 * Ensures custom section items can seed style extraction when main sections are empty.
	 */
	it("uses custom section items when main section items are missing", () => {
		const data = draftFactory.draft.empty();
		data.customSections = [createCustomSectionWithItem("skills", "custom-skill")];

		const styles = resumeStylesFactory.defaults();
		styles.items.skill.hidden = true;
		styles.items.skill.icon = "star";
		styles.items.skill.options = { showLinkInTitle: true };

		const view = zipResumeView({ data, styles });
		view.sections.skills.items = [];

		const result = unzipResumeView(view);

		expect(result.styles.items.skill.hidden).toBe(true);
		expect(result.styles.items.skill.icon).toBe("star");
		expect(result.styles.items.skill.options).toEqual({ showLinkInTitle: true });
	});

	/**
	 * @remarks
	 * Ensures metadata notes are preserved in data and removed from styles.
	 */
	it("separates metadata notes from style metadata", () => {
		const data = draftFactory.draft.empty();
		data.metadata.notes = "Draft note";

		const styles = resumeStylesFactory.defaults();
		styles.metadata.template = "azurill";

		const view = zipResumeView({ data, styles });
		const result = unzipResumeView(view);

		expect(result.data.metadata).toEqual({ notes: "Draft note" });
		expect(result.styles.metadata.template).toBe("azurill");
		expect("notes" in result.styles.metadata).toBe(false);
	});
});

/**
 * @remarks
 * Higher-level behaviors that exercise full zip/unzip composition.
 */
describe("resumeViewFactory (composition)", () => {
	/**
	 * @remarks
	 * Ensures defaults build a schema-compliant view.
	 */
	it("creates defaults that satisfy the view schema", () => {
		const view = resumeViewFactory.defaults();
		const result = resumeViewSchema.safeParse(view);

		expect(result.success).toBe(true);
	});

	/**
	 * @remarks
	 * Ensures zip->unzip->zip roundtrips when styles are uniform per item type.
	 */
	it("roundtrips uniform styles through zip and unzip", () => {
		const data = createDraftWithSectionItems();
		data.basics.customFields = [draftFactory.basics.customField.empty("cf-1")];
		data.customSections = [createCustomSectionWithItem("projects", "custom-projects")];

		const styles = resumeStylesFactory.defaults();
		styles.picture.hidden = true;
		styles.customField.icon = "github-logo";
		styles.summary.columns = 2;
		styles.section.columns = 2;
		styles.customSection.columns = 2;
		styles.items.profile.icon = "linkedin-logo";
		styles.items.skill.icon = "star";
		styles.metadata.template = "azurill";
		styles.metadata.page.hideIcons = true;

		const view = zipResumeView({ data, styles });
		const roundTrip = zipResumeView(unzipResumeView(view));

		expect(roundTrip).toEqual(view);
	});
});
