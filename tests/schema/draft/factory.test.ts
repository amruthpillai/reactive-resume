import { describe, expect, it } from "vitest";
import { draftFactory } from "@/schema/draft/data";

/**
 * @remarks
 * Validates the Draft factory for sections and item defaults.
 */
describe("draftFactory", () => {
	/**
	 * @remarks
	 * Ensures section item factories return stable identifiers and empty defaults.
	 */
	it("creates empty items for less common sections", () => {
		const profile = draftFactory.sections.item.empty("profiles", "profile-1");
		expect(profile).toEqual({
			id: "profile-1",
			network: "",
			username: "",
			website: { label: "", url: "" },
		});

		const education = draftFactory.sections.item.empty("education", "education-1");
		expect(education).toEqual({
			id: "education-1",
			school: "",
			degree: "",
			area: "",
			grade: "",
			location: "",
			period: "",
			website: { label: "", url: "" },
			description: "",
		});

		const language = draftFactory.sections.item.empty("languages", "language-1");
		expect(language).toEqual({
			id: "language-1",
			language: "",
			fluency: "",
			level: 0,
		});

		const interest = draftFactory.sections.item.empty("interests", "interest-1");
		expect(interest).toEqual({
			id: "interest-1",
			name: "",
			keywords: [],
		});

		const award = draftFactory.sections.item.empty("awards", "award-1");
		expect(award).toEqual({
			id: "award-1",
			title: "",
			awarder: "",
			date: "",
			website: { label: "", url: "" },
			description: "",
		});

		const certification = draftFactory.sections.item.empty("certifications", "certification-1");
		expect(certification).toEqual({
			id: "certification-1",
			title: "",
			issuer: "",
			date: "",
			website: { label: "", url: "" },
			description: "",
		});

		const publication = draftFactory.sections.item.empty("publications", "publication-1");
		expect(publication).toEqual({
			id: "publication-1",
			title: "",
			publisher: "",
			date: "",
			website: { label: "", url: "" },
			description: "",
		});

		const volunteer = draftFactory.sections.item.empty("volunteer", "volunteer-1");
		expect(volunteer).toEqual({
			id: "volunteer-1",
			organization: "",
			location: "",
			period: "",
			website: { label: "", url: "" },
			description: "",
		});

		const reference = draftFactory.sections.item.empty("references", "reference-1");
		expect(reference).toEqual({
			id: "reference-1",
			name: "",
			position: "",
			website: { label: "", url: "" },
			phone: "",
			description: "",
		});
	});

	/**
	 * @remarks
	 * Ensures custom section factory respects the provided id and section type.
	 */
	it("creates empty custom sections with stable identifiers", () => {
		const customSection = draftFactory.customSections.item.empty("custom-1", "projects");
		expect(customSection).toEqual({
			id: "custom-1",
			title: "",
			type: "projects",
			items: [],
		});
	});

	/**
	 * @remarks
	 * Ensures section factories return empty titles and lists by default.
	 */
	it("creates empty section payloads with empty items", () => {
		const section = draftFactory.sections.section.empty("skills");
		expect(section).toEqual({ title: "", items: [] });
	});
});
