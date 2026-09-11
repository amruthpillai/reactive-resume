import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it, vi } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../document";
import { semanticNodeKeys } from "./node-keys";
import { resolveResumePresentation } from "./resolve";

vi.mock("@react-pdf/renderer", async (importOriginal) => ({
	...(await importOriginal<typeof import("@react-pdf/renderer")>()),
}));

type HostNode = {
	type: string;
	value?: string;
	break?: boolean;
	wrap?: boolean;
	props?: { break?: boolean; wrap?: boolean };
	children?: HostNode[];
};

const nodeText = (node: HostNode): string =>
	node.value ?? (node.children ?? []).map((child) => nodeText(child)).join("");

const findSectionView = (node: HostNode, text: string): HostNode | undefined => {
	for (const child of node.children ?? []) {
		const match = findSectionView(child, text);
		if (match) return match;
	}

	const props = flowProps(node);
	return node.type === "VIEW" && nodeText(node) === text && (props.break !== undefined || props.wrap !== undefined)
		? node
		: undefined;
};

const flowProps = (node: HostNode | undefined) => ({
	break: node?.break ?? node?.props?.break,
	wrap: node?.wrap ?? node?.props?.wrap,
});

const buildFixture = (value: string): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "";
	data.basics.headline = "";
	data.basics.email = "";
	data.basics.phone = "";
	data.basics.location = "";
	data.basics.customFields = [];
	data.summary.content = "<p>Pagination sentinel</p>";
	data.summary.keepTogether = true;
	data.summary.startOnNewPage = true;
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	const source = {
		languageVersion: 1,
		text: `@version 1; section[type="summary"] { break-before: ${value}; break-inside: ${value}; }`,
	};
	data.metadata.stylesheet = { mode: "semantic", source };
	return data;
};

describe("semantic pagination cancellation", () => {
	it.each([
		["auto", false, true],
		["initial", false, true],
		["unset", false, true],
		["inherit", false, true],
		["revert", true, false],
	] as const)("maps %s over builder pagination to explicit break=%s and wrap=%s", (value, breakBefore, wrap) => {
		const data = buildFixture(value);
		const presentation = resolveResumePresentation({ data, template: "onyx", mode: "semantic" });
		const sectionKey = semanticNodeKeys.section(semanticNodeKeys.region(semanticNodeKeys.page(1), "main"), "summary");

		expect(presentation[sectionKey]).toMatchObject({ break: breakBefore, wrap });
	});

	it.each([
		["auto", false, true],
		["initial", false, true],
		["unset", false, true],
		["revert", true, false],
	] as const)("puts the %s cancellation on the final existing section View", async (value, breakBefore, wrap) => {
		const data = buildFixture(value);
		const element = createElement(ResumeDocument, { data, template: "onyx" }) as unknown as Parameters<typeof pdf>[0];
		const instance = pdf(element);
		await vi.waitFor(() => expect(instance.container.document).not.toBeNull());
		const section = findSectionView(instance.container.document as HostNode, "SummaryPagination sentinel");

		expect(flowProps(section)).toEqual({ break: breakBefore, wrap });
	});
});
