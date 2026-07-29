import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createResumePdfBlob } from "../browser";
import { createResumePdfFile } from "../server";

const captured = vi.hoisted(() => ({
	browser: undefined as unknown,
	server: undefined as unknown,
}));

vi.mock("#react-pdf-renderer", async (importOriginal) => ({
	...(await importOriginal<typeof import("@react-pdf/renderer")>()),
	pdf: (element: unknown) => {
		captured.browser = element;
		return { toBlob: async () => new Blob(["%PDF"], { type: "application/pdf" }) };
	},
	renderToBuffer: (element: unknown) => {
		captured.server = element;
		return Promise.resolve(Buffer.from("%PDF"));
	},
}));

type HostNode = {
	type: string;
	props?: Readonly<Record<string, unknown>>;
	style?: unknown;
	children?: HostNode[];
};

const findFirst = (node: HostNode, predicate: (candidate: HostNode) => boolean): HostNode | undefined => {
	if (predicate(node)) return node;
	for (const child of node.children ?? []) {
		const match = findFirst(child, predicate);
		if (match) return match;
	}
};

const buildFixture = (): ResumeData => {
	const data = structuredClone(defaultResumeData);
	const applied = {
		languageVersion: 1,
		text: `
			@rr-version 1;
			page { size: LETTER; }
			header { -rr-fixed: true; background-color: #1e293b; }
		`,
	};
	data.picture.hidden = true;
	data.basics.name = "Ada Lovelace";
	data.metadata.layout.pages = [{ fullWidth: true, main: [], sidebar: [] }];
	data.metadata.stylesheet = { mode: "semantic", source: applied, applied };
	return data;
};

const buildNodeBudgetFixture = (mode: "legacy" | "semantic"): ResumeData => {
	const data = structuredClone(defaultResumeData);
	const applied = { languageVersion: 1, text: "@rr-version 1;\n" };
	data.metadata.layout.pages = [{ fullWidth: true, main: ["skills"], sidebar: [] }];
	data.metadata.stylesheet = { mode, source: applied, applied };
	data.sections.skills.items = Array.from({ length: 2_000 }, (_, index) => ({
		id: `skill-${index}`,
		hidden: false,
		icon: "",
		iconColor: "",
		name: `Skill ${index}`,
		proficiency: "Advanced",
		level: 5,
		keywords: ["TypeScript"],
	}));
	return data;
};

const renderFinalProps = async (element: unknown) => {
	const renderer = await vi.importActual<typeof import("@react-pdf/renderer")>("@react-pdf/renderer");
	const instance = renderer.pdf(element as Parameters<typeof renderer.pdf>[0]);
	await vi.waitFor(() => expect(instance.container.document).not.toBeNull(), { timeout: 15_000 });
	const document = instance.container.document as HostNode;
	const page = findFirst(document, ({ type }) => type === "PAGE");
	const fixed = findFirst(document, ({ props }) => props?.fixed === true);

	return {
		page: { size: page?.props?.size, style: page?.style },
		fixed: { type: fixed?.type, fixed: fixed?.props?.fixed, style: fixed?.style },
	};
};

describe("browser/server semantic runtime identity", () => {
	it("delivers identical final primitive props through ResumeDocument", async () => {
		const data = buildFixture();
		await createResumePdfBlob({ data, template: "onyx" });
		await createResumePdfFile({ data, filename: "resume.pdf", template: "onyx" });

		const browserProps = await renderFinalProps(captured.browser);
		const serverProps = await renderFinalProps(captured.server);

		expect(browserProps).toEqual(serverProps);
		expect(browserProps.page.size).toBe("LETTER");
		expect(browserProps.fixed).toMatchObject({ type: "VIEW", fixed: true });
	}, 30_000);

	it("rejects a valid stylesheet when later content exceeds the RRSS node budget", async () => {
		const data = buildNodeBudgetFixture("semantic");

		const results = await Promise.allSettled([
			createResumePdfBlob({ data, template: "onyx" }),
			createResumePdfFile({ data, filename: "resume.pdf", template: "onyx" }),
		]);

		expect(results).toEqual([
			expect.objectContaining({
				status: "rejected",
				reason: expect.objectContaining({
					cause: expect.arrayContaining([expect.objectContaining({ code: "RESOURCE_LIMIT", severity: "error" })]),
				}),
			}),
			expect.objectContaining({
				status: "rejected",
				reason: expect.objectContaining({
					cause: expect.arrayContaining([expect.objectContaining({ code: "RESOURCE_LIMIT", severity: "error" })]),
				}),
			}),
		]);
	}, 15_000);

	it("keeps legacy PDF rendering unaffected by the semantic node budget", async () => {
		const data = buildNodeBudgetFixture("legacy");

		const blob = await createResumePdfBlob({ data, template: "onyx" });
		const file = await createResumePdfFile({ data, filename: "resume.pdf", template: "onyx" });

		expect(blob.type).toBe("application/pdf");
		expect(file.type).toBe("application/pdf");
	}, 15_000);
});
