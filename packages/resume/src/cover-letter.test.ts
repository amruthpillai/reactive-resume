import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { copyCoverLetterStyle, coverLetterTextToHtml, createCoverLetterResumeData } from "./cover-letter";

describe("independent cover letters", () => {
	it("copies sender and style without linking source mutations or retaining private notes", () => {
		const source = structuredClone(defaultResumeData);
		source.basics.name = "Ada Lovelace";
		source.metadata.notes = "Private interview notes";
		const style = copyCoverLetterStyle(source, "old-section", "old-item");
		source.basics.name = "Changed later";
		source.metadata.page.marginX = 40;
		expect(style.basics.name).toBe("Ada Lovelace");
		expect(style.metadata.page.marginX).toBe(defaultResumeData.metadata.page.marginX);
		expect(style.metadata).not.toHaveProperty("notes");
		expect(style.metadata).not.toHaveProperty("layout");
		expect(style).toMatchObject({ sectionId: "old-section", itemId: "old-item" });
	});

	it("renders only saved letter content while preserving sender and target identifiers", () => {
		const style = copyCoverLetterStyle(defaultResumeData, "letter-section", "letter-item");
		style.basics.name = "Ada";
		const data = createCoverLetterResumeData({
			name: "Example",
			recipient: "<p>Recruiter</p>",
			content: "<p>Hello</p>",
			style,
		});
		expect(data.basics.name).toBe("Ada");
		expect(data.metadata.notes).toBe("");
		expect(Object.values(data.sections).every((section) => section.items.length === 0)).toBe(true);
		expect(data.customSections).toHaveLength(1);
		expect(data.customSections[0]).toMatchObject({
			id: "letter-section",
			type: "cover-letter",
			items: [{ id: "letter-item", recipient: "<p>Recruiter</p>", content: "<p>Hello</p>" }],
		});
		expect(data.metadata.layout.pages).toEqual([{ fullWidth: true, main: ["letter-section"], sidebar: [] }]);
		data.basics.name = "Independent render copy";
		expect(style.basics.name).toBe("Ada");
	});

	it("escapes generated plain text before inserting paragraph markup", () => {
		expect(coverLetterTextToHtml("  Hello <script>alert('x')</script> & team\nnext\n\nThanks\"  ")).toBe(
			"<p>Hello &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; team<br />next</p><p>Thanks&quot;</p>",
		);
		expect(coverLetterTextToHtml("  ")).toBe("");
	});
});
