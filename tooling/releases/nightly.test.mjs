import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { androidAbis, buildChangelog, getPushCommits, publishNightly } from "./nightly.mjs";

const directories = [];
afterEach(async () => {
	await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function temporaryDirectory() {
	const directory = await mkdtemp(join(tmpdir(), "nightly-release-"));
	directories.push(directory);
	return directory;
}

async function repository() {
	const cwd = await temporaryDirectory();
	const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
	git("init", "--quiet");
	git("config", "user.name", "Release Test");
	git("config", "user.email", "release@example.com");
	const commit = (message) => {
		git("-c", "commit.gpgsign=false", "commit", "--quiet", "--allow-empty", "-m", message);
		return git("rev-parse", "HEAD");
	};
	const before = commit("existing history");
	return { cwd, before, commit };
}

function githubFixture() {
	const repos = {
		listPullRequestsAssociatedWithCommit: vi.fn(async () => ({ data: [] })),
		getReleaseByTag: vi.fn(async () => {
			throw Object.assign(new Error("Not found"), { status: 404 });
		}),
		createRelease: vi.fn(async (input) => ({ data: { id: 17, ...input } })),
		listReleaseAssets: vi.fn(async () => ({ data: [] })),
		deleteReleaseAsset: vi.fn(async () => ({})),
		uploadReleaseAsset: vi.fn(async () => ({})),
		updateRelease: vi.fn(async () => ({
			data: { html_url: "https://github.com/example/resume/releases/tag/nightly-42" },
		})),
	};
	return { rest: { repos }, paginate: vi.fn(async (method, input) => (await method(input)).data) };
}

async function publishingFixture() {
	const source = await repository();
	const sha = source.commit("fix: export\n\nPreserve all fonts.");
	const artifactDir = await temporaryDirectory();
	for (const abi of androidAbis) await writeFile(join(artifactDir, `reactive-resume-${abi}.apk`), `signed ${abi}`);
	const context = {
		eventName: "push",
		ref: "refs/heads/main",
		repo: { owner: "example", repo: "resume" },
		sha,
		runId: 42,
		serverUrl: "https://github.com",
		payload: { before: source.before },
	};
	return { github: githubFixture(), context, artifactDir, sourceDir: source.cwd };
}

it("reads the complete push from Git, including bodies and more than 20 commits", async () => {
	const source = await repository();
	const shas = Array.from({ length: 25 }, (_, index) =>
		source.commit(`fix: change ${index}\n\nDetailed message ${index}`),
	);
	const sha = shas.at(-1);
	const commits = getPushCommits({ before: source.before, sha, cwd: source.cwd });
	expect(commits.map((commit) => commit.sha)).toEqual(shas);
	expect(commits.at(-1).message).toBe("fix: change 24\n\nDetailed message 24");
	expect(getPushCommits({ before: "0".repeat(40), sha, cwd: source.cwd })).toEqual([commits.at(-1)]);
	expect(() => getPushCommits({ before: source.before, sha: "--all", cwd: source.cwd })).toThrow("full commit SHAs");
});

it("includes commit bodies and deduplicated merged main PR summaries, without executing their text", async () => {
	const github = githubFixture();
	const pull = {
		number: 12,
		title: "fix: PDF [export]",
		html_url: "https://github.com/example/resume/pull/12",
		body: "## Summary\n\nPreserve fonts. Literal `$(echo unsafe)` remains text.",
		merged_at: "2026-10-22T00:00:00Z",
		base: { ref: "main" },
	};
	github.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
		data: [pull, { ...pull, number: 13, merged_at: null }, { ...pull, number: 14, base: { ref: "other" } }],
	});
	const body = await buildChangelog({
		github,
		repo: { owner: "example", repo: "resume" },
		commits: [
			{ sha: "a".repeat(40), message: "fix: fonts\n\nFull body" },
			{ sha: "b".repeat(40), message: "fix: layout" },
		],
		sha: "b".repeat(40),
		before: "c".repeat(40),
		serverUrl: "https://github.com",
		runId: 42,
	});
	expect(body).toContain("> fix: fonts\n> \n> Full body");
	expect(body).toContain(pull.body);
	expect(body.match(/### \[#12\]/g)).toHaveLength(1);
	expect(body).not.toContain("### [#13]");
	expect(body).not.toContain("### [#14]");
	expect(github.paginate).toHaveBeenCalledTimes(2);
});

it("stages all APKs, checksums and full changelog before publishing a prerelease at the exact SHA", async () => {
	const fixture = await publishingFixture();
	const repos = fixture.github.rest.repos;
	await publishNightly(fixture);
	expect(repos.createRelease).toHaveBeenCalledWith(
		expect.objectContaining({
			tag_name: "nightly-42",
			target_commitish: fixture.context.sha,
			draft: true,
			prerelease: true,
			make_latest: "false",
		}),
	);
	expect(repos.uploadReleaseAsset.mock.calls.map(([input]) => input.name)).toEqual([
		...androidAbis.map((abi) => `reactive-resume-${abi}.apk`),
		"SHA256SUMS",
		"CHANGELOG.md",
	]);
	const checksum = createHash("sha256").update("signed arm64-v8a").digest("hex");
	expect(await readFile(join(fixture.artifactDir, "SHA256SUMS"), "utf8")).toContain(
		`${checksum}  reactive-resume-arm64-v8a.apk\n`,
	);
	expect(await readFile(join(fixture.artifactDir, "CHANGELOG.md"), "utf8")).toContain("Preserve all fonts.");
	expect(repos.updateRelease).toHaveBeenCalledWith(
		expect.objectContaining({ draft: false, prerelease: true, make_latest: "false" }),
	);
	expect(repos.updateRelease.mock.invocationCallOrder[0]).toBeGreaterThan(
		repos.uploadReleaseAsset.mock.invocationCallOrder.at(-1),
	);
});

it("withholds publishing after upload failure, then resumes the same draft on rerun", async () => {
	const fixture = await publishingFixture();
	const repos = fixture.github.rest.repos;
	repos.uploadReleaseAsset.mockRejectedValueOnce(new Error("Upload failed"));
	await expect(publishNightly(fixture)).rejects.toThrow("Upload failed");
	expect(repos.updateRelease).not.toHaveBeenCalled();
	repos.getReleaseByTag.mockResolvedValue({
		data: { id: 17, target_commitish: fixture.context.sha, prerelease: true, draft: true },
	});
	repos.listReleaseAssets.mockResolvedValue({ data: [{ id: 9, name: "reactive-resume-arm64-v8a.apk" }] });
	await publishNightly(fixture);
	expect(repos.createRelease).toHaveBeenCalledTimes(1);
	expect(repos.deleteReleaseAsset).toHaveBeenCalledWith(expect.objectContaining({ asset_id: 9 }));
	expect(repos.updateRelease).toHaveBeenCalledTimes(1);
});

it("leaves an already published release and its assets untouched on rerun", async () => {
	const fixture = await publishingFixture();
	const repos = fixture.github.rest.repos;
	repos.getReleaseByTag.mockResolvedValue({
		data: { id: 17, target_commitish: fixture.context.sha, prerelease: true, draft: false, html_url: "existing" },
	});
	expect(await publishNightly(fixture)).toBe("existing");
	expect(repos.createRelease).not.toHaveBeenCalled();
	expect(repos.uploadReleaseAsset).not.toHaveBeenCalled();
	expect(repos.updateRelease).not.toHaveBeenCalled();
});

it("attaches oversized changelogs in full while keeping the release description within API limits", async () => {
	const fixture = await publishingFixture();
	const summary = "Detailed PR summary. ".repeat(4000);
	const repos = fixture.github.rest.repos;
	repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
		data: [
			{
				number: 12,
				title: "Large change",
				body: summary,
				html_url: "https://github.com/example/resume/pull/12",
				merged_at: "2026-10-22",
				base: { ref: "main" },
			},
		],
	});
	await publishNightly(fixture);
	expect(repos.createRelease.mock.calls[0][0].body.length).toBeLessThan(60_000);
	expect(repos.createRelease.mock.calls[0][0].body).toContain("/nightly-42/CHANGELOG.md");
	expect(await readFile(join(fixture.artifactDir, "CHANGELOG.md"), "utf8")).toContain(summary.trim());
});

it("fails on release API authorization errors instead of treating them as missing releases", async () => {
	const fixture = await publishingFixture();
	const repos = fixture.github.rest.repos;
	repos.getReleaseByTag.mockRejectedValue(Object.assign(new Error("Forbidden"), { status: 403 }));
	await expect(publishNightly(fixture)).rejects.toThrow("Forbidden");
	expect(repos.createRelease).not.toHaveBeenCalled();
});

it("rejects incomplete APK matrices and non-main events before creating a release", async () => {
	const fixture = await publishingFixture();
	await rm(join(fixture.artifactDir, "reactive-resume-x86_64.apk"));
	await expect(publishNightly(fixture)).rejects.toThrow("ENOENT");
	fixture.context.ref = "refs/heads/other";
	await expect(publishNightly(fixture)).rejects.toThrow("push to main");
	expect(fixture.github.rest.repos.createRelease).not.toHaveBeenCalled();
});
