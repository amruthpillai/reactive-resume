import { describe, expect, it } from "vitest";
import { type DraftData, draftFactory } from "@/schema/draft/data";
import { resumeDataSchema } from "@/schema/resume/data.ts";
import { sampleResumeData } from "@/schema/resume/sample";
import { resumeStylesFactory } from "@/schema/resume/styles";
import { resumeViewFactory, resumeViewSchema, unzipResumeView, zipResumeView } from "@/schema/resume/view";

type SectionKey = keyof DraftData["sections"];

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
 * Seeds the required minimal string fields for ResumeData validation.
 * @param type - The section type to seed.
 * @param item - The draft item to mutate.
 * @returns The same item with required fields populated.
 */
const requiredFieldSetters: {
	[K in SectionKey]: (item: DraftData["sections"][K]["items"][number]) => void;
} = {
	profiles: (item) => {
		item.network = "profiles-value";
	},
	experience: (item) => {
		item.company = "experience-value";
	},
	education: (item) => {
		item.school = "education-value";
	},
	projects: (item) => {
		item.name = "projects-value";
	},
	skills: (item) => {
		item.name = "skills-value";
	},
	languages: (item) => {
		item.language = "languages-value";
	},
	interests: (item) => {
		item.name = "interests-value";
	},
	awards: (item) => {
		item.title = "awards-value";
	},
	certifications: (item) => {
		item.title = "certifications-value";
	},
	publications: (item) => {
		item.title = "publications-value";
	},
	volunteer: (item) => {
		item.organization = "volunteer-value";
	},
	references: (item) => {
		item.name = "references-value";
	},
};

/**
 * @remarks
 * Applies required field defaults to satisfy ResumeData validation.
 */
const seedRequiredFields = <T extends SectionKey>(
	type: T,
	item: DraftData["sections"][T]["items"][number],
): DraftData["sections"][T]["items"][number] => {
	requiredFieldSetters[type](item);
	return item;
};

/**
 * @remarks
 * Assigns a single item into a section while preserving type constraints.
 */
const setSectionItem = <T extends SectionKey>(
	data: DraftData,
	type: T,
	item: DraftData["sections"][T]["items"][number],
) => {
	data.sections[type].items = [item] as DraftData["sections"][T]["items"];
};

/**
 * @remarks
 * Builds a DraftData payload with at least one valid item in every section and custom section.
 * This ensures parity tests exercise every item and section type while satisfying ResumeData requirements.
 */
const createFullDraft = (): DraftData => {
	const data = draftFactory.draft.empty();

	data.basics.customFields = [draftFactory.basics.customField.empty("custom-field-1")];

	for (const type of sectionTypes) {
		const item = seedRequiredFields(
			type,
			draftFactory.sections.item.empty(type, `${type}-1`) as DraftData["sections"][typeof type]["items"][number],
		);

		setSectionItem(data, type, item);
	}

	data.customSections = sectionTypes.map((type) => {
		const section = draftFactory.customSections.item.empty(`custom-${type}`, type);
		const item = seedRequiredFields(
			type,
			draftFactory.sections.item.empty(
				type,
				`custom-${type}-item`,
			) as DraftData["sections"][typeof type]["items"][number],
		);
		section.items = [item];
		return section;
	});

	data.metadata.notes = "Parity test note.";

	return data;
};

/**
 * @remarks
 * Creates a ResumeView with fully populated data and non-default styles to validate parity.
 */
const createFullView = () => {
	const data = createFullDraft();
	const styles = resumeStylesFactory.defaults();

	styles.picture.hidden = true;
	styles.picture.rotation = 45;
	styles.customField.icon = "github-logo";
	styles.summary.columns = 2;
	styles.section.columns = 2;
	styles.customSection.columns = 2;
	styles.baseItem.options = { showLinkInTitle: true };
	styles.items.profile.icon = "linkedin-logo";
	styles.items.skill.icon = "star";
	styles.items.interest.icon = "game-controller";
	styles.metadata.template = "azurill";
	styles.metadata.page.hideIcons = true;

	return {
		data,
		styles,
		view: zipResumeView({ data, styles }),
	};
};

/**
 * @remarks
 * Asserts that two objects expose identical key sets for parity checks.
 * @param left - The first object to compare.
 * @param right - The second object to compare.
 */
const assertSameKeys = (left: Record<string, unknown>, right: Record<string, unknown>) => {
	expect(Object.keys(left).sort()).toEqual(Object.keys(right).sort());
};

/**
 * @remarks
 * Validates that ResumeView is a drop-in structural replacement for ResumeData.
 */
describe("ResumeData <-> ResumeView parity", () => {
	/**
	 * @remarks
	 * Ensures a ResumeData sample payload is accepted by the ResumeView schema.
	 */
	it("accepts sample ResumeData in the ResumeView schema", () => {
		const result = resumeViewSchema.safeParse(sampleResumeData);
		expect(result.success).toBe(true);
	});

	/**
	 * @remarks
	 * Ensures ResumeView defaults satisfy the ResumeData schema.
	 */
	it("accepts ResumeView defaults in the ResumeData schema", () => {
		const view = resumeViewFactory.defaults();
		const result = resumeDataSchema.safeParse(view);
		expect(result.success).toBe(true);
	});

	/**
	 * @remarks
	 * Ensures both schemas parse the same fully populated view payload identically.
	 */
	it("produces identical parsed outputs across ResumeData and ResumeView schemas", () => {
		const { view } = createFullView();
		const viewParsed = resumeViewSchema.parse(view);
		const dataParsed = resumeDataSchema.parse(view);

		expect(viewParsed).toEqual(dataParsed);
	});

	/**
	 * @remarks
	 * Ensures nested key parity across all sections and custom sections.
	 */
	it("matches key sets for sections and custom section items", () => {
		const { view } = createFullView();
		const viewParsed = resumeViewSchema.parse(view);
		const dataParsed = resumeDataSchema.parse(view);

		assertSameKeys(viewParsed, dataParsed);
		assertSameKeys(viewParsed.picture, dataParsed.picture);
		assertSameKeys(viewParsed.basics, dataParsed.basics);
		assertSameKeys(viewParsed.summary, dataParsed.summary);
		assertSameKeys(viewParsed.sections, dataParsed.sections);
		assertSameKeys(viewParsed.metadata, dataParsed.metadata);

		for (const type of sectionTypes) {
			assertSameKeys(
				viewParsed.sections[type] as Record<string, unknown>,
				dataParsed.sections[type] as Record<string, unknown>,
			);

			const viewItem = viewParsed.sections[type].items[0] as Record<string, unknown>;
			const dataItem = dataParsed.sections[type].items[0] as Record<string, unknown>;

			assertSameKeys(viewItem, dataItem);

			if (iconSectionTypes.has(type)) {
				expect("icon" in viewItem).toBe(true);
			} else {
				expect("icon" in viewItem).toBe(false);
			}
		}

		for (let index = 0; index < viewParsed.customSections.length; index += 1) {
			const viewSection = viewParsed.customSections[index] as Record<string, unknown>;
			const dataSection = dataParsed.customSections[index] as Record<string, unknown>;

			assertSameKeys(viewSection, dataSection);

			const viewItem = (viewParsed.customSections[index].items[0] ?? {}) as Record<string, unknown>;
			const dataItem = (dataParsed.customSections[index].items[0] ?? {}) as Record<string, unknown>;

			assertSameKeys(viewItem, dataItem);
		}
	});

	/**
	 * @remarks
	 * Ensures a ResumeData-compatible view roundtrips through unzip/zip without losing parity.
	 */
	it("roundtrips ResumeData-compatible views without losing parity", () => {
		const { view } = createFullView();
		const roundTrip = zipResumeView(unzipResumeView(view));

		const viewParsed = resumeViewSchema.parse(view);
		const roundTripParsed = resumeViewSchema.parse(roundTrip);
		const dataParsed = resumeDataSchema.parse(view);
		const roundTripDataParsed = resumeDataSchema.parse(roundTrip);

		expect(roundTripParsed).toEqual(viewParsed);
		expect(roundTripDataParsed).toEqual(dataParsed);
	});
});
