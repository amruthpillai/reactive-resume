import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it, vi } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../document";

vi.mock("@react-pdf/renderer", async (importOriginal) => ({
	...(await importOriginal<typeof import("@react-pdf/renderer")>()),
}));

type HostNode = {
	type: string;
	style?: unknown;
	props?: { style?: unknown };
	children?: HostNode[];
};

const collectStyles = (node: HostNode): Record<string, unknown>[] => {
	const style = node.style ?? node.props?.style;
	const current = Array.isArray(style) ? style : style ? [style] : [];
	return [...(current as Record<string, unknown>[]), ...(node.children ?? []).flatMap(collectStyles)];
};

const buildFixture = (): ResumeData => {
	const data = structuredClone(defaultResumeData);
	const applied = {
		languageVersion: 1,
		text: `
			@rr-version 1;
			paragraph { color: #123456; }
			strong { color: #654321; }
			list-marker { color: #abcdef; }
		`,
	};
	data.picture.hidden = true;
	data.basics.name = "Ada Lovelace";
	data.summary.content = "<p>First <strong>bold</strong></p><ul><li>Item</li></ul>";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	data.metadata.stylesheet = { mode: "semantic", source: applied, applied };
	return data;
};

describe("semantic rich-text bindings", () => {
	it("applies occurrence-specific paragraph, strong, and marker styles to existing primitives", async () => {
		const element = createElement(ResumeDocument, {
			data: buildFixture(),
			template: "onyx",
		}) as unknown as Parameters<typeof pdf>[0];
		const instance = pdf(element);
		await vi.waitFor(() => expect(instance.container.document).not.toBeNull());

		const colors = collectStyles(instance.container.document as HostNode).map(({ color }) => color);
		expect(colors).toEqual(expect.arrayContaining(["#123456", "#654321", "#abcdef"]));
	});
});
