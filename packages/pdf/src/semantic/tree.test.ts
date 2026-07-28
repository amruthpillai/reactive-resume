import type { SemanticNode } from "@reactive-resume/resume/stylesheet/types";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { semanticNodeKeys } from "./node-keys";
import { buildSemanticTree } from "./tree";

const findNode = (node: SemanticNode, predicate: (candidate: SemanticNode) => boolean): SemanticNode | undefined => {
	if (predicate(node)) return node;

	for (const child of node.children) {
		const match = findNode(child, predicate);
		if (match) return match;
	}
};

const flattenTree = (node: SemanticNode): SemanticNode[] => [node, ...node.children.flatMap(flattenTree)];
const findNodes = (node: SemanticNode, predicate: (candidate: SemanticNode) => boolean): SemanticNode[] =>
	flattenTree(node).filter(predicate);
const findParent = (node: SemanticNode, childKey: string): SemanticNode | undefined => {
	if (node.children.some((child) => child.key === childKey)) return node;

	for (const child of node.children) {
		const parent = findParent(child, childKey);
		if (parent) return parent;
	}
};
const required = <T>(value: T | undefined, label: string): T => {
	if (value === undefined) throw new Error(`Missing ${label}`);
	return value;
};

const richTextFixture = [
	"<h1>One</h1><h2>Two</h2><h3>Three</h3><h4>Four</h4><h5>Five</h5><h6>Six</h6>",
	"<blockquote>Quote</blockquote>",
	'<p><a href="https://example.com"><strong>Bold</strong></a> <em>Em</em> <u>Under</u> <s>Strike</s> <code>Code</code> <span style="color: #f00">Color</span> <mark data-color="#ff0">Mark</mark><br></p>',
	"<ul><li>First</li></ul><hr>",
].join("");

const buildFixture = (): ResumeData => {
	const data = structuredClone(defaultResumeData);

	data.basics = {
		name: "Ada Lovelace",
		headline: "Engineer",
		email: "ada@example.com",
		phone: "",
		location: "Berlin",
		website: { url: "https://example.com", label: "example.com" },
		customFields: [],
	};
	data.sections.experience.items = [
		{
			id: "experience/item",
			hidden: false,
			company: "Analytical Engines",
			position: "Engineer",
			location: "London",
			period: "1842",
			website: { url: "https://example.com/company", label: "Company", inlineLink: true },
			description: "<p>Ignored when roles exist</p>",
			roles: [
				{
					id: "role/item",
					position: "Programmer",
					period: "1843",
					description: "<p>Built <strong>algorithms</strong>.</p><ul><li>First</li></ul>",
				},
			],
		},
	];
	data.metadata.layout.pages = [{ fullWidth: false, main: ["experience"], sidebar: [] }];

	return data;
};

const buildCompleteFixture = (): ResumeData => {
	const data = structuredClone(defaultResumeData);

	data.picture.url = "/uploads/ada.png";
	data.basics = {
		name: "Ada Lovelace",
		headline: "Engineer",
		email: "ada@example.com",
		phone: "+49 123",
		location: "Berlin",
		website: { url: "https://example.com", label: "example.com" },
		customFields: [
			{ id: "custom/link", icon: "link", text: "Portfolio", link: "https://portfolio.example.com" },
			{ id: "custom/empty", icon: "star", text: "", link: "" },
		],
	};
	data.summary.content = richTextFixture;
	data.sections.profiles.items = [
		{
			id: "profile/1",
			hidden: false,
			icon: "github-logo",
			iconColor: "",
			network: "GitHub",
			username: "ada",
			website: { url: "https://github.com/ada", label: "GitHub", inlineLink: false },
		},
	];
	data.sections.experience.items = [
		{
			id: "experience/1",
			hidden: false,
			company: "Analytical Engines",
			position: "Engineer",
			location: "London",
			period: "1842",
			website: { url: "https://example.com/company", label: "Company", inlineLink: true },
			description: "<p>Outer description</p>",
			roles: [
				{ id: "role/1", position: "Programmer", period: "1843", description: "<p>Role description</p>" },
				{ id: "role/hidden", position: " ", period: "1844", description: "<p>Filtered role</p>" },
			],
		},
		{
			id: "experience/2",
			hidden: false,
			company: "Difference Engine",
			position: "Writer",
			location: "London",
			period: "1841",
			website: { url: "https://example.com/role", label: "Role", inlineLink: false },
			description: "<p>Visible description</p>",
			roles: [],
		},
		{
			id: "hidden/item",
			hidden: true,
			company: "Hidden",
			position: "",
			location: "",
			period: "",
			website: { url: "", label: "", inlineLink: false },
			description: "",
			roles: [],
		},
	];
	data.sections.education.items = [
		{
			id: "education/1",
			hidden: false,
			school: "University",
			area: "Mathematics",
			degree: "BSc",
			grade: "A",
			location: "London",
			period: "1835",
			website: { url: "https://example.com/education", label: "School", inlineLink: false },
			description: "<p>Education</p>",
		},
	];
	data.sections.projects.items = [
		{
			id: "project/1",
			hidden: false,
			name: "Engine",
			period: "1843",
			website: { url: "https://example.com/project", label: "Project", inlineLink: true },
			description: "<p>Project</p>",
		},
		{
			id: "project/invalid",
			hidden: false,
			name: " ",
			period: "never",
			website: { url: "", label: "", inlineLink: false },
			description: "<p>Filtered project</p>",
		},
	];
	data.sections.skills.items = [
		{
			id: "skill/1",
			hidden: false,
			icon: "code",
			iconColor: "",
			name: "TypeScript",
			proficiency: "Expert",
			level: 3,
			keywords: ["Types"],
		},
	];
	data.sections.languages.items = [
		{ id: "language/1", hidden: false, language: "English", fluency: "Native", level: 4 },
	];
	data.sections.interests.items = [
		{
			id: "interest/1",
			hidden: false,
			icon: "book",
			iconColor: "",
			name: "Reading",
			keywords: ["Science"],
		},
	];
	data.sections.awards.items = [
		{
			id: "award/1",
			hidden: false,
			title: "Prize",
			date: "1843",
			awarder: "Society",
			website: { url: "https://example.com/award", label: "Award", inlineLink: false },
			description: "<p>Award</p>",
		},
	];
	data.sections.certifications.items = [
		{
			id: "certification/1",
			hidden: false,
			title: "Certificate",
			date: "1843",
			issuer: "Society",
			website: { url: "https://example.com/cert", label: "Certificate", inlineLink: false },
			description: "<p>Certificate</p>",
		},
	];
	data.sections.publications.items = [
		{
			id: "publication/1",
			hidden: false,
			title: "Notes",
			date: "1843",
			publisher: "Journal",
			website: { url: "https://example.com/publication", label: "Publication", inlineLink: false },
			description: "<p>Publication</p>",
		},
	];
	data.sections.volunteer.items = [
		{
			id: "volunteer/1",
			hidden: false,
			organization: "Society",
			location: "London",
			period: "1843",
			website: { url: "https://example.com/volunteer", label: "Volunteer", inlineLink: false },
			description: "<p>Volunteer</p>",
		},
	];
	data.sections.references.items = [
		{
			id: "reference/1",
			hidden: false,
			name: "Charles",
			position: "Inventor",
			phone: "+44 123",
			website: { url: "https://example.com/reference", label: "Reference", inlineLink: false },
			description: "<p>Reference</p>",
		},
	];

	const builtInItems = {
		profiles: required(data.sections.profiles.items[0], "profiles fixture item"),
		experience: required(data.sections.experience.items[0], "experience fixture item"),
		education: required(data.sections.education.items[0], "education fixture item"),
		projects: required(data.sections.projects.items[0], "projects fixture item"),
		skills: required(data.sections.skills.items[0], "skills fixture item"),
		languages: required(data.sections.languages.items[0], "languages fixture item"),
		interests: required(data.sections.interests.items[0], "interests fixture item"),
		awards: required(data.sections.awards.items[0], "awards fixture item"),
		certifications: required(data.sections.certifications.items[0], "certifications fixture item"),
		publications: required(data.sections.publications.items[0], "publications fixture item"),
		volunteer: required(data.sections.volunteer.items[0], "volunteer fixture item"),
		references: required(data.sections.references.items[0], "references fixture item"),
	};
	const customTypes = [
		"summary",
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
		"cover-letter",
	] as const;

	data.customSections = customTypes.map((type) => ({
		id: `custom/${type}~%`,
		type,
		title: `Custom ${type}`,
		icon: "star",
		columns: 1,
		hidden: false,
		keepTogether: false,
		startOnNewPage: false,
		items: [
			type === "summary"
				? { id: `custom-item/${type}`, hidden: false, content: "<p>Custom summary</p>" }
				: type === "cover-letter"
					? {
							id: `custom-item/${type}`,
							hidden: false,
							recipient: "<p>Recipient</p>",
							content: "<p>Letter</p>",
						}
					: {
							...structuredClone(builtInItems[type]),
							id: `custom-item/${type}`,
						},
		],
	})) as ResumeData["customSections"];
	data.customSections.push({
		id: "custom/hidden",
		type: "profiles",
		title: "Hidden",
		icon: "star",
		columns: 1,
		hidden: true,
		keepTogether: false,
		startOnNewPage: false,
		items: [
			{
				...structuredClone(required(data.sections.profiles.items[0], "profiles fixture item")),
				id: "custom-hidden/item",
			},
		],
	});

	const builtInSectionIds = [
		"summary",
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
	];
	const customSectionIds = data.customSections.map((section) => section.id);
	data.metadata.layout.pages = [
		{
			fullWidth: false,
			main: [...builtInSectionIds, ...customSectionIds],
			sidebar: ["skills"],
		},
	];

	return data;
};

describe("buildSemanticTree", () => {
	it("builds stable authored-page, section, nested-role, field, and rich-text ancestry", () => {
		const data = buildFixture();
		const before = structuredClone(data);
		const input = {
			data,
			template: "onyx" as const,
			page: required(data.metadata.layout.pages[0], "authored page"),
			pageNumber: 1,
			showHeader: true,
		};

		const first = buildSemanticTree(input);
		const second = buildSemanticTree(input);
		const nodes = flattenTree(first);
		const section = findNode(first, (node) => node.key === "page-1/region-main/section-experience");
		const role = findNode(first, (node) => node.id === "role/item");
		const company = findNode(first, (node) => node.kind === "field" && node.attributes.name === "company");
		const listItem = findNode(first, (node) => node.kind === "list-item");

		expect(second).toEqual(first);
		expect(data).toEqual(before);
		expect(section?.attributes).toEqual({ type: "experience", placement: "main", origin: "main" });
		expect(company?.roles).toContain("primary-text");
		expect(role?.kind).toBe("item");
		expect(role?.roles).toEqual(expect.arrayContaining(["experience-role", "nested-role"]));
		expect(findNode(required(role, "nested role"), (node) => node.kind === "strong")).toBeDefined();
		expect(listItem?.children.map((node) => node.kind)).toEqual(["list-marker", "list-item-content"]);
		expect(new Set(nodes.map((node) => node.key)).size).toBe(nodes.length);
	});

	it("covers every built-in and custom field, contact, link, icon, level decoration, and rich-text kind", () => {
		const data = buildCompleteFixture();
		const tree = buildSemanticTree({
			data,
			template: "onyx",
			page: required(data.metadata.layout.pages[0], "authored page"),
			pageNumber: 1,
			showHeader: true,
		});
		const expectedFields = {
			summary: ["content"],
			profiles: ["network", "username"],
			experience: ["company", "position", "location", "period", "description"],
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
		};

		for (const [type, fields] of Object.entries(expectedFields)) {
			const section = required(
				findNode(tree, (node) => node.kind === "section" && node.id === type),
				`${type} section`,
			);
			const names = new Set(findNodes(section, (node) => node.kind === "field").map((node) => node.attributes.name));
			for (const field of fields) expect(names.has(field), `${type}.${field}`).toBe(true);
		}

		for (const customSection of data.customSections.filter((section) => !section.hidden)) {
			const section = required(
				findNode(tree, (node) => node.kind === "section" && node.id === customSection.id),
				customSection.id,
			);
			const expected =
				customSection.type === "cover-letter"
					? ["recipient", "content"]
					: customSection.type === "summary"
						? ["content"]
						: expectedFields[customSection.type];
			const names = new Set(findNodes(section, (node) => node.kind === "field").map((node) => node.attributes.name));
			for (const field of expected) expect(names.has(field), `${customSection.id}.${field}`).toBe(true);
		}

		expect(findNode(tree, (node) => node.id === "custom/hidden")).toBeUndefined();
		expect(findNode(tree, (node) => node.id === "hidden/item")).toBeUndefined();
		expect(findNode(tree, (node) => node.id === "project/invalid")).toBeUndefined();
		expect(findNode(tree, (node) => node.id === "role/hidden")).toBeUndefined();
		expect(findNode(tree, (node) => node.kind === "picture")).toBeDefined();
		expect(findNode(tree, (node) => node.id === "custom/cover-letter~%")?.children[0]?.kind).toBe("section-items");
		expect(findNodes(tree, (node) => node.kind === "contact-item").map((node) => node.attributes.name)).toEqual(
			expect.arrayContaining(["email", "phone", "location", "website", "custom"]),
		);
		expect(findNodes(tree, (node) => node.kind === "link").map((node) => node.key)).toEqual(
			expect.arrayContaining([expect.stringContaining("link-inline-website"), expect.stringContaining("link-website")]),
		);
		expect(findNodes(tree, (node) => node.kind === "icon").length).toBeGreaterThan(5);
		const skill = required(
			findNode(tree, (node) => node.kind === "item" && node.id === "skill/1"),
			"skill item",
		);
		expect(findNodes(skill, (node) => node.kind === "icon" && node.roles.includes("active"))).toHaveLength(3);
		expect(findNodes(skill, (node) => node.kind === "icon" && node.roles.includes("inactive"))).toHaveLength(2);
		expect(
			findNodes(
				skill,
				(node) => node.kind === "icon" && (node.roles.includes("active") || node.roles.includes("inactive")),
			).every((node) => node.attributes.type === "circle"),
		).toBe(true);
		for (const [itemId, fields] of [
			["language/1", ["language", "fluency"]],
			["reference/1", ["name", "position", "phone"]],
		] as const) {
			const item = required(
				findNode(tree, (node) => node.kind === "item" && node.id === itemId),
				`${itemId} item`,
			);
			expect(findNode(item, (node) => node.kind === "item-header")).toBeUndefined();
			expect(item.children.filter(({ kind }) => kind === "field").map((node) => node.attributes.name)).toEqual(
				expect.arrayContaining([...fields]),
			);
		}

		const richKinds = new Set(
			findNodes(tree, (node) =>
				[
					"rich-heading",
					"blockquote",
					"paragraph",
					"list",
					"list-item",
					"list-marker",
					"list-item-content",
					"link",
					"strong",
					"emphasis",
					"underline",
					"strike",
					"code",
					"text-span",
					"mark",
					"hard-break",
					"horizontal-rule",
				].includes(node.kind),
			).map((node) => node.kind),
		);
		expect(richKinds).toEqual(
			new Set([
				"rich-heading",
				"blockquote",
				"paragraph",
				"list",
				"list-item",
				"list-marker",
				"list-item-content",
				"link",
				"strong",
				"emphasis",
				"underline",
				"strike",
				"code",
				"text-span",
				"mark",
				"hard-break",
				"horizontal-rule",
			]),
		);
		expect(findNodes(tree, (node) => node.kind === "rich-heading").map((node) => node.attributes.level)).toEqual([
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
		]);
		const strong = required(
			findNode(tree, (node) => node.kind === "strong"),
			"strong rich-text node",
		);
		const strongParent = required(findParent(tree, strong.key), "strong parent");
		expect(strongParent.kind).toBe("link");
		const normalizedLink = findParent(tree, strongParent.key);
		expect(normalizedLink?.kind).toBe("paragraph");

		const nodes = flattenTree(tree);
		expect(new Set(nodes.map((node) => node.key)).size).toBe(nodes.length);
		expect(findNode(tree, (node) => node.id === "custom/experience~%")?.key).toContain(
			"section-custom%2Fexperience%7E%25",
		);
	});

	it("omits conditional base contacts, preserves rendered custom fields, and scopes repeated sections by authored page", () => {
		const data = buildCompleteFixture();
		data.basics.email = "";
		data.basics.phone = "";
		data.basics.location = "";
		data.basics.website = { url: "", label: "" };
		const page = { fullWidth: true, main: ["experience"], sidebar: [] };
		const first = buildSemanticTree({ data, template: "onyx", page, pageNumber: 1, showHeader: true });
		const second = buildSemanticTree({ data, template: "onyx", page, pageNumber: 2, showHeader: true });

		expect(findNodes(first, (node) => node.kind === "contact-item").map((node) => node.attributes.name)).toEqual([
			"custom",
			"custom",
		]);
		const emptyCustomContact = findNode(first, (node) => node.id === "custom/empty");
		expect(emptyCustomContact).toBeDefined();
		expect(emptyCustomContact && findNode(emptyCustomContact, (node) => node.kind === "field")).toMatchObject({
			key: "page-1/region-header/header/contact-list/contact-custom~custom%2Fempty/field-custom",
			attributes: { name: "custom" },
		});
		expect(findNode(first, (node) => node.kind === "region" && node.attributes.region === "sidebar")).toBeUndefined();
		expect(findNode(first, (node) => node.kind === "section" && node.id === "experience")?.key).toBe(
			"page-1/region-main/section-experience",
		);
		expect(findNode(second, (node) => node.kind === "section" && node.id === "experience")?.key).toBe(
			"page-2/region-main/section-experience",
		);
	});

	it("encodes every caller-controlled key segment without path or delimiter collisions", () => {
		const parent = "page-1/region-main";

		expect(semanticNodeKeys.section(parent, "a/b")).not.toBe(semanticNodeKeys.section(parent, "a%2Fb"));
		expect(semanticNodeKeys.contactItem(parent, "a~b", "c")).not.toBe(semanticNodeKeys.contactItem(parent, "a", "b~c"));
		expect(semanticNodeKeys.field(parent, "name/role")).toBe("page-1/region-main/field-name%2Frole");
		expect(semanticNodeKeys.richTextNode(parent, "paragraph", 2)).toBe("page-1/region-main/paragraph-2");
	});

	it.each([false, true])("emits exactly one profile link when inlineLink is %s", (inlineLink) => {
		const data = structuredClone(defaultResumeData);
		data.sections.profiles.items = [
			{
				id: "profile/1",
				hidden: false,
				icon: "github-logo",
				iconColor: "",
				network: "GitHub",
				username: "ada",
				website: { url: "https://github.com/ada", label: "GitHub", inlineLink },
			},
		];
		const tree = buildSemanticTree({
			data,
			template: "onyx",
			page: { fullWidth: true, main: ["profiles"], sidebar: [] },
			pageNumber: 1,
			showHeader: false,
		});
		const profile = required(
			findNode(tree, (node) => node.kind === "item" && node.id === "profile/1"),
			"profile item",
		);

		expect(findNodes(profile, (node) => node.kind === "link").map((node) => node.key)).toEqual([
			"page-1/region-main/section-profiles/section-items/item-profile%2F1/link-profile",
		]);
	});

	it("models Chikorita's two physical contact rows and routes contacts to their real row parent", () => {
		const data = structuredClone(defaultResumeData);
		data.basics.email = "ada@example.com";
		data.basics.phone = "+44 123";
		data.basics.location = "London";
		data.basics.website = { url: "https://example.com", label: "example.com" };
		data.basics.customFields = [{ id: "custom-1", icon: "", text: "Portfolio", link: "" }];
		const tree = buildSemanticTree({
			data,
			template: "chikorita",
			page: { fullWidth: true, main: [], sidebar: [] },
			pageNumber: 1,
			showHeader: true,
		});
		const contactList = required(
			findNode(tree, (node) => node.kind === "contact-list"),
			"contact list",
		);
		const rows = contactList.children.filter(({ kind }) => kind === "template-part");

		expect(rows.map(({ attributes }) => attributes.name)).toEqual(["contact-row-primary", "contact-row-secondary"]);
		expect(rows.map((row) => row.children.map(({ attributes }) => attributes.name))).toEqual([
			["email", "phone", "location"],
			["website", "custom"],
		]);
	});

	it("models Meowth's education inline header and grade row as sibling hosts", () => {
		const data = structuredClone(defaultResumeData);
		data.sections.education.items = [
			{
				id: "education-1",
				hidden: false,
				school: "University of London",
				area: "Mathematics",
				degree: "BSc",
				grade: "First",
				location: "London",
				period: "1835",
				website: { url: "", label: "", inlineLink: false },
				description: "",
			},
		];
		const tree = buildSemanticTree({
			data,
			template: "meowth",
			page: { fullWidth: true, main: ["education"], sidebar: [] },
			pageNumber: 1,
			showHeader: false,
		});
		const item = required(
			findNode(tree, (node) => node.id === "education-1"),
			"education item",
		);
		const header = required(
			item.children.find(({ kind }) => kind === "item-header"),
			"education header",
		);
		const gradeRow = required(
			item.children.find(({ attributes }) => attributes.name === "education-grade-row"),
			"education grade row",
		);

		expect(header.children.map(({ attributes }) => attributes.name)).toEqual([
			"inline-item-header-leading",
			"inline-item-header-middle",
			"inline-item-header-trailing",
		]);
		expect(gradeRow.kind).toBe("template-part");
		expect(gradeRow.children.map(({ attributes }) => attributes.name)).toEqual(["grade", "location"]);
	});

	it.each([
		["en-US", ["list-marker", "list-item-content"]],
		["ar-SA", ["list-item-content", "list-marker"]],
	] as const)("models %s rich-list row children in their authored physical order", (locale, kinds) => {
		const data = structuredClone(defaultResumeData);
		data.metadata.page.locale = locale;
		data.summary.content = "<ul><li>Item</li></ul>";
		const tree = buildSemanticTree({
			data,
			template: "onyx",
			page: { fullWidth: true, main: ["summary"], sidebar: [] },
			pageNumber: 1,
			showHeader: false,
		});
		const item = required(
			findNode(tree, (node) => node.kind === "list-item"),
			"rich list item",
		);

		expect(item.children.map(({ kind }) => kind)).toEqual([...kinds]);
		expect(item.children.every(({ key }) => key.startsWith(`${item.key}/`))).toBe(true);
	});
});
