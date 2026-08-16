// @vitest-environment happy-dom

import type { CompileWorkerRequest, CompileWorkerResponse } from "./protocol";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

function request(source: string): CompileWorkerRequest {
	return {
		type: "compile",
		requestId: 1,
		editGeneration: 1,
		source: { languageVersion: 1, text: source },
		semanticTree: {
			key: "resume",
			kind: "resume",
			attributes: {},
			roles: [],
			children: [{ key: "name", kind: "name", attributes: {}, roles: [], children: [] }],
		},
		baseSettings: {
			picture: defaultResumeData.picture,
			template: defaultResumeData.metadata.template,
			design: defaultResumeData.metadata.design,
			typography: defaultResumeData.metadata.typography,
			page: defaultResumeData.metadata.page,
			layout: { sidebarWidth: defaultResumeData.metadata.layout.sidebarWidth },
		},
		pages: [{ pageKey: "page-1", width: 595.28, height: 841.89 }],
	};
}

describe("stylesheet worker", () => {
	let handleMessage: ((event: MessageEvent<CompileWorkerRequest>) => void) | undefined;
	const postMessage = vi.fn();

	beforeEach(async () => {
		handleMessage = undefined;
		postMessage.mockReset();
		vi.resetModules();
		vi.stubGlobal("self", {
			addEventListener: vi.fn((type: string, listener: (event: MessageEvent<CompileWorkerRequest>) => void) => {
				if (type === "message") handleMessage = listener;
			}),
			postMessage,
		});
		await import("./stylesheet.worker");
	});

	it("returns diagnostics from variable resolution", () => {
		handleMessage?.(
			new MessageEvent("message", {
				data: request("@version 1;\nname { color: var(--missing); }\n"),
			}),
		);

		const response = postMessage.mock.calls[0]?.[0] as CompileWorkerResponse | undefined;
		expect(response?.diagnostics).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: "UNRESOLVED_VARIABLE", severity: "error" })]),
		);
	});

	it("returns overlapping semantic diagnostics once", () => {
		handleMessage?.(
			new MessageEvent("message", {
				data: request('@version 1;\nsection[type="education"] { color: red; }\n'),
			}),
		);

		const response = postMessage.mock.calls[0]?.[0] as CompileWorkerResponse | undefined;
		expect(response?.diagnostics.filter(({ code }) => code === "SELECTOR_NO_MATCH")).toHaveLength(1);
	});
});
