import { expect, it } from "vite-plus/test";
import { requireSuccessfulCI } from "./check-ci.mjs";

const sha = "a".repeat(40);
const passed = {
	head_sha: sha,
	event: "push",
	head_branch: "main",
	run_number: 1,
	run_attempt: 1,
	status: "completed",
	conclusion: "success",
	html_url: "https://github.com/example/app/actions/runs/1",
};

function authorize(runs) {
	return requireSuccessfulCI({
		github: { rest: { actions: { listWorkflowRuns() {} } }, paginate: async () => runs },
		repo: { owner: "example", repo: "app" },
		sha,
	});
}

it("accepts successful main-push CI at the exact commit", async () => {
	await expect(authorize([passed])).resolves.toBe(passed.html_url);
});

it.each(
	[
		[],
		[{ ...passed, head_sha: "b".repeat(40) }],
		[{ ...passed, event: "pull_request" }],
		[{ ...passed, event: "workflow_dispatch" }],
		[{ ...passed, head_branch: "untrusted" }],
		[{ ...passed, conclusion: "failure" }],
		[{ ...passed, conclusion: "cancelled" }],
		[{ ...passed, status: "in_progress", conclusion: null }],
		[passed, { ...passed, run_number: 2, conclusion: "failure" }],
		[passed, { ...passed, run_attempt: 2, status: "queued", conclusion: null }],
	].map((runs) => ({ runs })),
)("rejects absent, untrusted, stale, or incomplete CI receipts: %j", async ({ runs }) => {
	await expect(authorize(runs)).rejects.toThrow("Promotion blocked");
});
