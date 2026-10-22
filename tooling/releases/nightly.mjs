import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const androidAbis = ["arm64-v8a", "armeabi-v7a", "x86_64"];

export function getPushCommits({ before, sha, cwd = process.cwd() }) {
	if (!/^[a-f0-9]{40}$/.test(sha) || !/^[a-f0-9]{40}$/.test(before)) {
		throw new Error("Expected full commit SHAs from a push event");
	}
	const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
	// A newly created main branch has no previous tip. Include its head rather than the entire repository history.
	const range = /^0+$/.test(before) ? ["--max-count=1", sha] : [`${before}..${sha}`];
	return git("rev-list", "--reverse", ...range, "--")
		.split("\n")
		.filter(Boolean)
		.map((commit) => ({ sha: commit, message: git("show", "-s", "--format=%B", commit, "--") }));
}

export async function buildChangelog({ github, repo, commits, sha, before, serverUrl, runId }) {
	const url = `${serverUrl}/${repo.owner}/${repo.repo}`;
	const pulls = new Map();
	for (const commit of commits) {
		const associated = await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, {
			...repo,
			commit_sha: commit.sha,
			per_page: 100,
		});
		for (const pull of associated) {
			if (pull.merged_at && pull.base.ref === "main") pulls.set(pull.number, pull);
		}
	}
	const lines = [
		`Nightly build of [\`${sha}\`](${url}/commit/${sha}) from main.`,
		`[Build logs](${url}/actions/runs/${runId}) · Docker: \`ghcr.io/${repo.owner.toLowerCase()}/${repo.repo.toLowerCase()}:sha-${sha}\``,
		"",
		"## Android downloads",
		"",
		"Choose the APK matching your device: arm64-v8a (64-bit ARM), armeabi-v7a (32-bit ARM), or x86_64 (64-bit Intel/AMD). Verify downloads against SHA256SUMS.",
		"",
		"APKs use the existing Android upload signing key and the preview update channel. Play Store installs may use a different signing key and cannot be upgraded with these APKs. Back up local drafts before switching distributions.",
		"",
		"## Commits in this push",
		"",
	];
	if (!/^0+$/.test(before)) lines.push(`[Compare changes](${url}/compare/${before}...${sha})`, "");
	for (const commit of commits) {
		lines.push(`### [\`${commit.sha.slice(0, 7)}\`](${url}/commit/${commit.sha})`, "");
		lines.push(...commit.message.split("\n").map((line) => `> ${line}`), "");
	}
	lines.push("## Pull request summaries", "");
	if (pulls.size === 0) lines.push("No merged pull requests associated with these commits.", "");
	for (const pull of pulls.values()) {
		const title = pull.title.replace(/[\r\n]/g, " ").replace(/[\\`*_[\]<>]/g, "\\$&");
		lines.push(
			`### [#${pull.number}](${pull.html_url}) ${title}`,
			"",
			pull.body?.trim() || "No description provided.",
			"",
		);
	}
	return lines.join("\n");
}

export async function publishNightly({ github, context, artifactDir, sourceDir = process.cwd() }) {
	if (context.eventName !== "push" || context.ref !== "refs/heads/main") {
		throw new Error("Nightly releases require a push to main");
	}
	const repo = context.repo;
	const sha = context.sha;
	const tag = `nightly-${context.runId}`;
	const names = androidAbis.map((abi) => `reactive-resume-${abi}.apk`);
	// Read every required artifact before creating a release; partial matrices must never publish.
	const apks = await Promise.all(names.map((name) => readFile(join(artifactDir, name))));
	if (apks.some((apk) => apk.length === 0)) throw new Error("Empty APK artifact");
	const checksums = apks
		.map((apk, index) => `${createHash("sha256").update(apk).digest("hex")}  ${names[index]}\n`)
		.join("");
	await writeFile(join(artifactDir, "SHA256SUMS"), checksums);

	let release;
	try {
		release = (await github.rest.repos.getReleaseByTag({ ...repo, tag })).data;
	} catch (error) {
		if (error.status !== 404) throw error;
	}
	if (release) {
		if (release.target_commitish !== sha || !release.prerelease)
			throw new Error("Existing release does not match build");
		// Published assets stay immutable on reruns, including repositories enforcing release immutability.
		if (!release.draft) return release.html_url;
	}

	const before = context.payload.before;
	const commits = getPushCommits({ before, sha, cwd: sourceDir });
	const changelog = await buildChangelog({
		github,
		repo,
		commits,
		sha,
		before,
		serverUrl: context.serverUrl,
		runId: context.runId,
	});
	await writeFile(join(artifactDir, "CHANGELOG.md"), changelog);
	const body =
		changelog.length <= 60_000
			? changelog
			: `${changelog.slice(0, 59_000)}\n\n[Full changelog](${context.serverUrl}/${repo.owner}/${repo.repo}/releases/download/${tag}/CHANGELOG.md)`;
	if (!release) {
		release = (
			await github.rest.repos.createRelease({
				...repo,
				tag_name: tag,
				target_commitish: sha,
				name: `Nightly ${tag.slice("nightly-".length)} (${sha.slice(0, 7)})`,
				body,
				draft: true,
				prerelease: true,
				make_latest: "false",
			})
		).data;
	}
	// A failed upload leaves a recoverable draft. Reruns replace only assets on that draft.
	const assets = await github.paginate(github.rest.repos.listReleaseAssets, {
		...repo,
		release_id: release.id,
		per_page: 100,
	});
	for (const name of [...names, "SHA256SUMS", "CHANGELOG.md"]) {
		const existing = assets.find((asset) => asset.name === name);
		if (existing) await github.rest.repos.deleteReleaseAsset({ ...repo, asset_id: existing.id });
		await github.rest.repos.uploadReleaseAsset({
			...repo,
			release_id: release.id,
			name,
			headers: { "content-type": name.endsWith(".apk") ? "application/vnd.android.package-archive" : "text/plain" },
			data: await readFile(join(artifactDir, name)),
		});
	}
	const published = await github.rest.repos.updateRelease({
		...repo,
		release_id: release.id,
		body,
		draft: false,
		prerelease: true,
		make_latest: "false",
	});
	return published.data.html_url;
}
