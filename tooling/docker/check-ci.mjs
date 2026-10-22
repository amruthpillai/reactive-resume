export async function requireSuccessfulCI({ github, repo, sha }) {
	if (!/^[a-f0-9]{40}$/.test(sha ?? "")) throw new Error("Promotion requires a full commit SHA");
	const runs = await github.paginate(github.rest.actions.listWorkflowRuns, {
		...repo,
		workflow_id: "e2e.yml",
		head_sha: sha,
		event: "push",
		branch: "main",
		per_page: 100,
	});
	const latest = runs
		.filter((run) => run.head_sha === sha && run.event === "push" && run.head_branch === "main")
		.sort((a, b) => b.run_number - a.run_number || b.run_attempt - a.run_attempt)[0];
	// Manual smoke-only runs and PR checks cannot authorize production promotion.
	if (!latest || latest.status !== "completed" || latest.conclusion !== "success") {
		throw new Error(`Promotion blocked: latest main-push CI for ${sha} must complete successfully`);
	}
	return latest.html_url;
}
