import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { updateSemanticCssReference } from "./generate-reference";

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

it("keeps the committed Semantic CSS reference synchronized with the public registries", async () => {
	const committed = new URL("../../docs/guides/semantic-css-reference.mdx", import.meta.url);
	const directory = await mkdtemp(join(tmpdir(), "rrss-reference-"));
	temporaryDirectories.push(directory);
	const generated = join(directory, "semantic-css-reference.mdx");
	await copyFile(committed, generated);

	const before = await readFile(generated, "utf8");
	await updateSemanticCssReference(generated);
	expect(await readFile(generated, "utf8")).toBe(before);
});
