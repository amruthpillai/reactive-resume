/// <reference lib="webworker" />

import type { CompileWorkerRequest, CompileWorkerResponse } from "./protocol";
import { analyzeStylesheet, compileStylesheet } from "@reactive-resume/resume/stylesheet";

self.addEventListener("message", ({ data }: MessageEvent<CompileWorkerRequest>) => {
	if (data.type !== "compile") return;
	const compiled = compileStylesheet(data.source);
	const diagnostics = compiled.program
		? [...compiled.diagnostics, ...analyzeStylesheet(compiled.program, data.semanticTree)]
		: compiled.diagnostics;
	const response: CompileWorkerResponse = {
		type: "compile_result",
		requestId: data.requestId,
		editGeneration: data.editGeneration,
		program: compiled.program,
		diagnostics,
	};
	self.postMessage(response);
});
