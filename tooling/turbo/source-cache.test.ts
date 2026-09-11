import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
const turbo = join(root, "node_modules", "turbo", "bin", "turbo");
const tasks = ["build", "check", "typecheck", "test", "test:coverage", "test:ci", "test:agent"];
type DryTask = { taskId: string; task: string; hash: string; command: string; dependencies: string[] };
let directory: string;
let baseline: Map<string, DryTask>;

function dryRun() {
	const output = execFileSync(process.execPath, [turbo, "run", ...tasks, "--dry=json"], {
		cwd: directory,
		encoding: "utf8",
		maxBuffer: 8 * 1024 * 1024,
		env: { ...process.env, TURBO_TELEMETRY_DISABLED: "1" },
	});
	const result = JSON.parse(output) as { tasks: DryTask[] };
	return new Map(result.tasks.map((task) => [task.taskId, task]));
}

beforeAll(async () => {
	directory = await mkdtemp(join(tmpdir(), "reactive-resume-turbo-cache-"));
	const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
	await writeFile(
		join(directory, "package.json"),
		JSON.stringify({ private: true, packageManager: packageJson.packageManager }),
	);
	await writeFile(join(directory, "pnpm-workspace.yaml"), 'packages: ["packages/*"]\n');
	await writeFile(join(directory, ".gitignore"), "node_modules/\n.turbo/\n");
	await writeFile(join(directory, "turbo.json"), await readFile(join(root, "turbo.json")));

	// app -> api -> pdf mirrors a source-consumed dependency with no build script.
	const dependencies: Record<string, string[]> = { app: ["api"], api: ["pdf"], pdf: [], unrelated: [] };
	let lock = "lockfileVersion: '9.0'\nimporters:\n  .: {}\n";
	for (const [name, deps] of Object.entries(dependencies)) {
		const packageDirectory = join(directory, "packages", name);
		await mkdir(packageDirectory, { recursive: true });
		await writeFile(join(packageDirectory, "source.ts"), "export const value = 1;\n");
		await writeFile(
			join(packageDirectory, "package.json"),
			JSON.stringify({
				name,
				version: "0.0.0",
				private: true,
				dependencies: Object.fromEntries(deps.map((dependency) => [dependency, "workspace:*"])),
				scripts: name === "pdf" ? {} : Object.fromEntries(tasks.map((task) => [task, "node -e ''"])),
			}),
		);
		lock += `  packages/${name}:`;
		lock += deps.length
			? `\n    dependencies:\n${deps.map((dependency) => `      ${dependency}:\n        specifier: workspace:*\n        version: link:../${dependency}\n`).join("")}`
			: " {}\n";
	}
	await writeFile(join(directory, "pnpm-lock.yaml"), lock);
	baseline = dryRun();
});

afterAll(async () => {
	if (directory) await rm(directory, { recursive: true, force: true });
});

async function withChangedSource(name: string, check: (result: Map<string, DryTask>) => void) {
	const path = join(directory, "packages", name, "source.ts");
	const original = await readFile(path);
	try {
		await writeFile(path, "export const value = 2;\n");
		check(dryRun());
	} finally {
		await writeFile(path, original);
	}
}

it("invalidates every cached consumer task after a transitive source-only package changes", async () => {
	await withChangedSource("pdf", (result) => {
		for (const name of ["app", "api"]) {
			for (const task of tasks) {
				const id = `${name}#${task}`;
				expect(result.get(id)?.hash, id).not.toBe(baseline.get(id)?.hash);
			}
		}
	});
});

it("invalidates direct consumers while retaining unrelated package cache keys", async () => {
	await withChangedSource("api", (result) => {
		for (const task of tasks) {
			expect(result.get(`app#${task}`)?.hash, task).not.toBe(baseline.get(`app#${task}`)?.hash);
			expect(result.get(`unrelated#${task}`)?.hash, task).toBe(baseline.get(`unrelated#${task}`)?.hash);
		}
	});
});

it("keeps cache keys stable when sources are unchanged", () => {
	expect(dryRun()).toEqual(baseline);
});

it("propagates dependency hashes without ordering runnable tasks between packages", () => {
	for (const task of tasks) {
		const app = baseline.get(`app#${task}`);
		expect(app?.dependencies.length, task).toBeGreaterThan(0);
		const pending = [...(app?.dependencies ?? [])];
		const visited = new Set<string>();
		while (pending.length > 0) {
			const id = pending.pop();
			if (!id || visited.has(id)) continue;
			visited.add(id);
			const dependency = baseline.get(id);
			expect(dependency?.command, id).toBe("<NONEXISTENT>");
			pending.push(...(dependency?.dependencies ?? []));
		}
	}
});
