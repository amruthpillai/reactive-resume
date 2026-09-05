import type { CoverLetter, CoverLetterStyle } from "@reactive-resume/schema/cover-letter/data";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

export function copyCoverLetterStyle(
	data: ResumeData,
	sectionId = "library-cover-letter",
	itemId = "library-cover-letter-item",
): CoverLetterStyle {
	const { notes: _notes, layout: _layout, ...metadata } = data.metadata;
	return structuredClone({ basics: data.basics, picture: data.picture, metadata, sectionId, itemId });
}

export function createCoverLetterResumeData(
	letter: Pick<CoverLetter, "name" | "recipient" | "content" | "style">,
): ResumeData {
	const data = structuredClone(defaultResumeData);
	const style = structuredClone(letter.style);
	data.basics = style.basics;
	data.picture = style.picture;
	data.metadata = {
		...style.metadata,
		notes: "",
		layout: { sidebarWidth: 35, pages: [{ fullWidth: true, main: [style.sectionId], sidebar: [] }] },
	};
	data.customSections = [
		{
			id: style.sectionId,
			type: "cover-letter",
			title: letter.name,
			icon: "envelope",
			columns: 1,
			hidden: false,
			keepTogether: false,
			startOnNewPage: false,
			items: [{ id: style.itemId, hidden: false, recipient: letter.recipient, content: letter.content }],
		},
	];
	return data;
}

export function coverLetterTextToHtml(text: string): string {
	return text
		.trim()
		.split(/\n\s*\n/)
		.filter(Boolean)
		.map((paragraph) => {
			const escaped = paragraph
				.replaceAll("&", "&amp;")
				.replaceAll("<", "&lt;")
				.replaceAll(">", "&gt;")
				.replaceAll('"', "&quot;")
				.replaceAll("'", "&#39;");
			return `<p>${escaped.replaceAll("\n", "<br />")}</p>`;
		})
		.join("");
}
