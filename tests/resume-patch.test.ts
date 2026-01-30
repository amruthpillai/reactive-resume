import assert from "node:assert/strict";
import { test } from "node:test";
import { applyResumePatch } from "@/integrations/orpc/helpers/resume-patch";
import { defaultResumeData } from "@/schema/resume/data";

const createTarget = () => ({
	name: "Test Resume",
	slug: "test-resume",
	tags: [],
	isPublic: false,
	data: structuredClone(defaultResumeData),
});

test("adds a section item with defaults", () => {
	const target = createTarget();

	const patched = applyResumePatch({
		target,
		patch: [
			{
				op: "add",
				path: "/data/sections/experience/items/-",
				value: {
					company: "Acme Corp",
					position: "Engineer",
					location: "",
					period: "",
					description: "",
				},
			},
		],
	});

	const item = patched.data.sections.experience.items[0];
	assert.ok(item.id);
	assert.equal(item.hidden, false);
	assert.deepEqual(item.website, { url: "", label: "" });
});

test("updates a section item by id", () => {
	const base = applyResumePatch({
		target: createTarget(),
		patch: [
			{
				op: "add",
				path: "/data/sections/experience/items/-",
				value: {
					company: "Acme Corp",
					position: "Engineer",
					location: "",
					period: "",
					description: "",
				},
			},
		],
	});

	const itemId = base.data.sections.experience.items[0].id;

	const patched = applyResumePatch({
		target: base,
		patch: [
			{
				op: "replace",
				path: `/data/sections/experience/items/${itemId}/position`,
				value: "Lead Engineer",
			},
		],
	});

	assert.equal(patched.data.sections.experience.items[0].position, "Lead Engineer");
});

test("removes a section item by id", () => {
	const base = applyResumePatch({
		target: createTarget(),
		patch: [
			{
				op: "add",
				path: "/data/sections/experience/items/-",
				value: {
					company: "Acme Corp",
					position: "Engineer",
					location: "",
					period: "",
					description: "",
				},
			},
		],
	});

	const itemId = base.data.sections.experience.items[0].id;

	const patched = applyResumePatch({
		target: base,
		patch: [
			{
				op: "remove",
				path: `/data/sections/experience/items/${itemId}`,
			},
		],
	});

	assert.equal(patched.data.sections.experience.items.length, 0);
});

test("adds a custom section and syncs layout", () => {
	const patched = applyResumePatch({
		target: createTarget(),
		patch: [
			{
				op: "add",
				path: "/data/customSections/-",
				value: {
					type: "skills",
					title: "Custom Skills",
				},
			},
		],
	});

	const customSection = patched.data.customSections[0];
	assert.ok(customSection.id);
	assert.equal(customSection.columns, 1);
	assert.equal(customSection.hidden, false);
	assert.ok(patched.data.metadata.layout.pages[0].main.includes(customSection.id));
});
