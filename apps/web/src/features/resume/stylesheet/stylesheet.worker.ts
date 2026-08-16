/// <reference lib="webworker" />

import type { CompileWorkerRequest, CompileWorkerResponse } from "./protocol";
import { analyzeStylesheet, compileStylesheet, resolveStylesheet } from "@reactive-resume/resume/stylesheet";
import { collectCompiledColorTokens } from "./color-tokens";

self.addEventListener("message", ({ data }: MessageEvent<CompileWorkerRequest>) => {
	if (data.type !== "compile") return;
	const compiled = compileStylesheet(data.source);
	const diagnostics = compiled.program
		? [
				...compiled.diagnostics,
				...analyzeStylesheet(compiled.program, data.semanticTree),
				...resolveStylesheet(compiled.program, data.semanticTree, {
					baseStyles: {},
					baseSettings: data.baseSettings,
					pages: data.pages,
				}).diagnostics,
			]
		: compiled.diagnostics;
	const response: CompileWorkerResponse = {
		type: "compile_result",
		requestId: data.requestId,
		editGeneration: data.editGeneration,
		program: compiled.program,
		diagnostics,
		colorTokens: collectCompiledColorTokens(data.source.text, compiled.program),
	};
	self.postMessage(response);
});
