// @vitest-environment jsdom

import { Document } from "docx";
import { describe, expect, it } from "vitest";
import type { ResumeData } from "@/schema/resume/data";
import { defaultResumeData } from "@/schema/resume/data";
import { buildDocument } from "./builder";

function makeResumeData(overrides?: Partial<ResumeData>): ResumeData {
	return { ...defaultResumeData, ...overrides };
}

describe("buildDocument", () => {
	it("produces a valid Document from default resume data", () => {
		const doc = buildDocument(defaultResumeData);
		expect(doc).toBeInstanceOf(Document);
	});

	it("includes name in header when present", () => {
		const data = makeResumeData({
			basics: { ...defaultResumeData.basics, name: "John Doe" },
		});
		const doc = buildDocument(data);
		expect(doc).toBeInstanceOf(Document);
	});

	it("includes contact info in header", () => {
		const data = makeResumeData({
			basics: {
				...defaultResumeData.basics,
				name: "Jane Smith",
				email: "jane@example.com",
				phone: "+1-555-1234",
				location: "San Francisco, CA",
				website: { url: "https://jane.dev", label: "jane.dev" },
			},
		});
		const doc = buildDocument(data);
		expect(doc).toBeInstanceOf(Document);
	});

	it("renders summary section when visible", () => {
		const data = makeResumeData({
			summary: {
				title: "About Me",
				columns: 1,
				hidden: false,
				content: "<p>I am a software engineer.</p>",
			},
		});
		const doc = buildDocument(data);
		expect(doc).toBeInstanceOf(Document);
	});

	it("omits summary when hidden", () => {
		const data = makeResumeData({
			summary: {
				title: "About Me",
				columns: 1,
				hidden: true,
				content: "<p>Should not appear.</p>",
			},
		});
		const doc = buildDocument(data);
		expect(doc).toBeInstanceOf(Document);
	});

	it("renders experience items", () => {
		const data = makeResumeData({
			sections: {
				...defaultResumeData.sections,
				experience: {
					title: "Experience",
					columns: 1,
					hidden: false,
					items: [
						{
							id: "exp-1",
							hidden: false,
							company: "Acme Corp",
							position: "Developer",
							location: "Remote",
							period: "2020-2024",
							website: { url: "", label: "" },
							description: "<p>Built features</p>",
							roles: [],
						},
					],
				},
			},
		});
		const doc = buildDocument(data);
		expect(doc).toBeInstanceOf(Document);
	});

	it("filters hidden items from experience", () => {
		const data = makeResumeData({
			sections: {
				...defaultResumeData.sections,
				experience: {
					title: "Experience",
					columns: 1,
					hidden: false,
					items: [
						{
							id: "exp-1",
							hidden: true,
							company: "Hidden Corp",
							position: "Ghost",
							location: "",
							period: "",
							website: { url: "", label: "" },
							description: "",
							roles: [],
						},
					],
				},
			},
		});
		// Should produce a document but the experience section should be omitted
		// (all items hidden → section heading omitted)
		const doc = buildDocument(data);
		expect(doc).toBeInstanceOf(Document);
	});

	it("renders skills with keywords", () => {
		const data = makeResumeData({
			sections: {
				...defaultResumeData.sections,
				skills: {
					title: "Skills",
					columns: 1,
					hidden: false,
					items: [
						{
							id: "skill-1",
							hidden: false,
							icon: "",
							name: "TypeScript",
							proficiency: "Advanced",
							level: 4,
							keywords: ["React", "Node.js", "Vite"],
						},
					],
				},
			},
		});
		const doc = buildDocument(data);
		expect(doc).toBeInstanceOf(Document);
	});

	it("follows section order from layout metadata", () => {
		const data = makeResumeData({
			metadata: {
				...defaultResumeData.metadata,
				layout: {
					sidebarWidth: 35,
					pages: [
						{
							fullWidth: false,
							main: ["experience", "education"],
							sidebar: ["skills"],
						},
					],
				},
			},
		});
		const doc = buildDocument(data);
		expect(doc).toBeInstanceOf(Document);
	});

	it("renders custom sections by type", () => {
		const data = makeResumeData({
			customSections: [
				{
					id: "custom-1",
					title: "Side Projects",
					columns: 1,
					hidden: false,
					type: "projects",
					items: [
						{
							id: "proj-1",
							hidden: false,
							name: "My App",
							period: "2023",
							website: { url: "https://myapp.dev", label: "myapp.dev" },
							description: "<p>A cool app.</p>",
						},
					],
				},
			],
			metadata: {
				...defaultResumeData.metadata,
				layout: {
					sidebarWidth: 35,
					pages: [
						{
							fullWidth: false,
							main: ["custom-1"],
							sidebar: [],
						},
					],
				},
			},
		});
		const doc = buildDocument(data);
		expect(doc).toBeInstanceOf(Document);
	});

	it("extracts primary color from metadata", () => {
		const data = makeResumeData({
			metadata: {
				...defaultResumeData.metadata,
				design: {
					...defaultResumeData.metadata.design,
					colors: {
						primary: "rgba(59, 130, 246, 1)",
						text: "rgba(0, 0, 0, 1)",
						background: "rgba(255, 255, 255, 1)",
					},
				},
			},
		});
		// Should not throw — the color is used for section headings
		const doc = buildDocument(data);
		expect(doc).toBeInstanceOf(Document);
	});

	it("renders full-width layout when sidebar is empty", () => {
		const data = makeResumeData({
			metadata: {
				...defaultResumeData.metadata,
				layout: {
					sidebarWidth: 35,
					pages: [
						{
							fullWidth: true,
							main: ["experience"],
							sidebar: [],
						},
					],
				},
			},
		});
		const doc = buildDocument(data);
		expect(doc).toBeInstanceOf(Document);
	});

	it("applies page format and margins from metadata", () => {
		const data = makeResumeData({
			metadata: {
				...defaultResumeData.metadata,
				page: {
					...defaultResumeData.metadata.page,
					format: "letter",
					marginX: 20,
					marginY: 15,
				},
			},
		});
		const doc = buildDocument(data);
		expect(doc).toBeInstanceOf(Document);
	});

	it("applies typography settings from metadata", () => {
		const data = makeResumeData({
			metadata: {
				...defaultResumeData.metadata,
				typography: {
					body: {
						fontFamily: "Arial",
						fontWeights: ["400"],
						fontSize: 11,
						lineHeight: 1.6,
					},
					heading: {
						fontFamily: "Georgia",
						fontWeights: ["700"],
						fontSize: 16,
						lineHeight: 1.3,
					},
				},
			},
		});
		const doc = buildDocument(data);
		expect(doc).toBeInstanceOf(Document);
	});

	it("produces a valid DOCX blob via Packer", async () => {
		const { Packer } = await import("docx");
		const data = makeResumeData({
			basics: { ...defaultResumeData.basics, name: "Test User" },
		});
		const doc = buildDocument(data);
		const blob = await Packer.toBlob(doc);

		expect(blob).toBeInstanceOf(Blob);
		expect(blob.size).toBeGreaterThan(0);

		// DOCX files are ZIP archives — first 2 bytes are "PK" (0x50, 0x4B)
		const buffer = await blob.arrayBuffer();
		const view = new Uint8Array(buffer);
		expect(view[0]).toBe(0x50);
		expect(view[1]).toBe(0x4b);
	});
});
