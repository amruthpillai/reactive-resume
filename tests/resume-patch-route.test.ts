import assert from "node:assert/strict";
import { test } from "node:test";
import { patchHandler } from "@/routes/api/resume/$id";

test("patch handler rejects unsupported content types", async () => {
	const request = new Request("http://localhost/api/resume/test-id", {
		method: "PATCH",
		headers: {
			"content-type": "text/plain",
		},
	});

	const response = await patchHandler({ request, params: { id: "test-id" } });
	assert.equal(response.status, 415);
});
