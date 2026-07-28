import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../document";

type HostNode = {
	type: string;
	style?: unknown;
	value?: string;
	children?: HostNode[];
};

const emptyStylesheet = { languageVersion: 1, text: "@rr-version 1;" };

const buildFixture = (
	mode: "missing" | "legacy" | "semantic",
	hideLinkUnderline: boolean,
	text = emptyStylesheet.text,
): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "Ada Lovelace";
	data.basics.email = "ada@example.com";
	data.metadata.page.hideLinkUnderline = hideLinkUnderline;
	data.metadata.layout.pages = [{ fullWidth: true, main: [], sidebar: [] }];

	if (mode !== "missing") {
		const stylesheet = { languageVersion: 1, text };
		data.metadata.stylesheet = { mode, source: stylesheet, applied: stylesheet };
	}

	return data;
};

const nodeText = (node: HostNode): string =>
	node.value ?? (node.children ?? []).map((child) => nodeText(child)).join("");

const findEmailLink = (node: HostNode): HostNode | undefined => {
	if (node.type === "LINK" && nodeText(node) === "ada@example.com") return node;
	for (const child of node.children ?? []) {
		const match = findEmailLink(child);
		if (match) return match;
	}
};

const finalLinkDecoration = async (data: ResumeData) => {
	const element = createElement(ResumeDocument, { data, template: "onyx" }) as unknown as Parameters<typeof pdf>[0];
	const instance = pdf(element);
	await expect.poll(() => instance.container.document).not.toBeNull();
	const link = findEmailLink(instance.container.document as HostNode);
	const styles = Array.isArray(link?.style) ? link.style : link?.style ? [link.style] : [];
	return Object.assign({}, ...styles).textDecoration;
};

describe("PDF link decoration fidelity", () => {
	it.each([
		["missing", false, "underline"],
		["missing", true, "none"],
		["legacy", false, "underline"],
		["legacy", true, "none"],
		["semantic", false, "underline"],
		["semantic", true, "none"],
	] as const)("%s stylesheet with hideLinkUnderline=%s resolves to %s", async (mode, hidden, expected) => {
		expect(await finalLinkDecoration(buildFixture(mode, hidden))).toBe(expected);
	});

	it("lets semantic none override an underlined builder baseline (#3134)", async () => {
		const data = buildFixture("semantic", false, "@rr-version 1; link { text-decoration: none; }");

		expect(await finalLinkDecoration(data)).toBe("none");
	});
});
