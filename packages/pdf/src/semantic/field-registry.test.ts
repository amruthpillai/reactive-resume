import { describe, expect, it } from "vitest";
import { STANDARD_FIELD_REGISTRY, STANDARD_ROLE_REGISTRY } from "./binding-inventory";

const expectedFields = {
	summary: ["content"],
	profiles: ["network", "username"],
	experience: ["company", "position", "location", "period", "description"],
	"experience-role": ["position", "period", "description"],
	education: ["school", "area", "degree", "grade", "location", "period", "description"],
	projects: ["name", "period", "description"],
	skills: ["name", "proficiency", "keywords"],
	languages: ["language", "fluency"],
	interests: ["name", "keywords"],
	awards: ["title", "date", "awarder", "description"],
	certifications: ["title", "date", "issuer", "description"],
	publications: ["title", "date", "publisher", "description"],
	volunteer: ["organization", "location", "period", "description"],
	references: ["name", "position", "phone", "description"],
	"cover-letter": ["recipient", "content"],
};

describe("standard semantic fields", () => {
	it("registers the complete rendered field matrix and only supported role tokens", () => {
		expect(
			Object.fromEntries(Object.entries(STANDARD_FIELD_REGISTRY).map(([type, fields]) => [type, Object.keys(fields)])),
		).toEqual(expectedFields);
		expect(STANDARD_FIELD_REGISTRY.experience.company).toEqual(["primary-text"]);
		expect(STANDARD_FIELD_REGISTRY.experience.description).toEqual([]);
		expect(STANDARD_FIELD_REGISTRY.profiles.username).toEqual(["secondary-text", "structured-link"]);
		expect(STANDARD_ROLE_REGISTRY).toEqual([
			"primary-text",
			"secondary-text",
			"structured-link",
			"decoration",
			"section-title",
			"picture",
			"experience-role",
			"nested-role",
			"active",
			"inactive",
		]);
	});
});
