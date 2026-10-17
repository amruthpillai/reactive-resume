import type { RenderRequest, RenderedPages } from "../../src/preview/types";
// Assert observable scheduling at the owning boundary; no fake timers or production-only test exports.
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { PreviewScheduler } from "../../src/preview/scheduler";

const calls: RenderRequest[] = [];
let release: ((result: RenderedPages) => void) | undefined;
const result = (request: RenderRequest): RenderedPages => ({
	requestId: request.id,
	pageCount: 1,
	pages: [],
	pageMap: { pages: [], nodes: [] },
	lostCharacters: [],
	pdf: new Uint8Array(),
});
const scheduler = new PreviewScheduler((request) => {
	calls.push(request);
	if (calls.length === 1)
		return new Promise((resolve) => {
			release = resolve;
		});
	return Promise.resolve(result(request));
});
const request = { data: sampleResumeData, scale: 1 };
const first = scheduler.schedule(request);
await delay(130);
assert.equal(calls.length, 1);
const second = scheduler.schedule({ ...request, focused: true });
assert(release && calls[0]);
release(result(calls[0]));
assert.equal(await first, null, "new debouncing request must stale an in-flight result immediately");
await delay(120);
assert.equal(calls.length, 1, "focused debounce must not run before 250 ms");
assert.equal((await second)?.requestId, 2);
const third = scheduler.schedule(request);
const fourth = scheduler.schedule(request);
assert.equal(await third, null, "coalesce pending requests");
assert.equal((await fourth)?.requestId, 4);
assert.equal(calls.length, 3);
const canceled = scheduler.schedule(request);
scheduler.cancel();
assert.equal(await canceled, null, "cancel resolves pending request");
assert.equal(calls.length, 3, "cancel skips pending render");
assert.equal((await scheduler.schedule(request))?.requestId, 7, "scheduler usable after cancel");
assert.equal(calls.length, 4);
const pending = scheduler.schedule(request);
scheduler.dispose();
assert.equal(await pending, null);
assert.equal(await scheduler.schedule(request), null);
console.log("Scheduler PASS: debounce, immediate staleness, serial execution, coalescing, cancel, disposal");
