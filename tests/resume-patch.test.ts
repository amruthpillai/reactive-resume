import assert from "node:assert/strict";
import { test } from "node:test";
import { ORPCError } from "@orpc/client";
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

test("test op compares raw values without normalization", () => {
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

	const item = base.data.sections.experience.items[0];

	assert.throws(
		() =>
			applyResumePatch({
				target: base,
				patch: [
					{
						op: "test",
						path: `/data/sections/experience/items/${item.id}`,
						value: {
							id: item.id,
							hidden: item.hidden,
							company: item.company,
							position: item.position,
							location: item.location,
							period: item.period,
							description: item.description,
						},
					},
				],
			}),
		(error) => error instanceof ORPCError && error.code === "PATCH_CONFLICT",
	);
});

test("replace preserves item id when omitted", () => {
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

	const item = base.data.sections.experience.items[0];

	const patched = applyResumePatch({
		target: base,
		patch: [
			{
				op: "replace",
				path: `/data/sections/experience/items/${item.id}`,
				value: {
					company: "Acme Corp",
					position: "Lead Engineer",
					location: "",
					period: "",
					description: "",
					website: { url: "", label: "" },
				},
			},
		],
	});

	assert.equal(patched.data.sections.experience.items[0].id, item.id);
	assert.equal(patched.data.sections.experience.items[0].hidden, item.hidden);
});

test("explicit id paths resolve numeric ids", () => {
	const base = applyResumePatch({
		target: createTarget(),
		patch: [
			{
				op: "add",
				path: "/data/sections/experience/items/-",
				value: {
					id: "123",
					hidden: false,
					company: "Acme Corp",
					position: "Engineer",
					location: "",
					period: "",
					description: "",
					website: { url: "", label: "" },
				},
			},
		],
	});

	const patched = applyResumePatch({
		target: base,
		patch: [
			{
				op: "replace",
				path: "/data/sections/experience/items/id/123/position",
				value: "Lead Engineer",
			},
		],
	});

	assert.equal(patched.data.sections.experience.items[0].position, "Lead Engineer");
});

test("numeric ids are treated as indices without explicit prefix", () => {
	const base = applyResumePatch({
		target: createTarget(),
		patch: [
			{
				op: "add",
				path: "/data/sections/experience/items/-",
				value: {
					id: "123",
					hidden: false,
					company: "Acme Corp",
					position: "Engineer",
					location: "",
					period: "",
					description: "",
					website: { url: "", label: "" },
				},
			},
		],
	});

	assert.throws(
		() =>
			applyResumePatch({
				target: base,
				patch: [
					{
						op: "replace",
						path: "/data/sections/experience/items/123/position",
						value: "Lead Engineer",
					},
				],
			}),
		(error) => error instanceof ORPCError && error.code === "PATCH_TARGET_NOT_FOUND",
	);
});

test("move and copy operations on section items", () => {
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
			{
				op: "add",
				path: "/data/sections/experience/items/-",
				value: {
					company: "Beta Corp",
					position: "Engineer",
					location: "",
					period: "",
					description: "",
				},
			},
		],
	});

	const [first, second] = base.data.sections.experience.items;

	const moved = applyResumePatch({
		target: base,
		patch: [
			{
				op: "move",
				from: `/data/sections/experience/items/id/${first.id}`,
				path: "/data/sections/experience/items/-",
			},
		],
	});

	assert.equal(moved.data.sections.experience.items[0].id, second.id);
	assert.equal(moved.data.sections.experience.items[1].id, first.id);

	const copied = applyResumePatch({
		target: base,
		patch: [
			{
				op: "copy",
				from: `/data/sections/experience/items/id/${first.id}`,
				path: "/data/sections/experience/items/-",
			},
		],
	});

	assert.equal(copied.data.sections.experience.items.length, 3);
	assert.deepEqual(copied.data.sections.experience.items[2], first);
});

test("does not reinsert custom sections when layout is patched", () => {
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
			{
				op: "replace",
				path: "/data/metadata/layout/pages/0/main",
				value: [],
			},
		],
	});

	const customSection = patched.data.customSections[0];
	assert.ok(!patched.data.metadata.layout.pages[0].main.includes(customSection.id));
});

test("does not reinsert existing unreferenced custom sections", () => {
	const target = createTarget();
	target.data.customSections.push({
		id: "existing-custom",
		type: "skills",
		title: "Existing",
		columns: 1,
		hidden: false,
		items: [],
	});

	const patched = applyResumePatch({
		target,
		patch: [
			{
				op: "add",
				path: "/data/customSections/-",
				value: {
					type: "skills",
					title: "New Custom",
				},
			},
		],
	});

	const newCustom = patched.data.customSections.find((section) => section.title === "New Custom");
	assert.ok(newCustom);
	assert.ok(patched.data.metadata.layout.pages[0].main.includes(newCustom.id));
	assert.ok(!patched.data.metadata.layout.pages[0].main.includes("existing-custom"));
});
