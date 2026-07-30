import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { generateOpenApiDocumentation } from "./generate-spec";

const temporaryDirectories: string[] = [];
const committedSpec = new URL("../../../../docs/spec.json", import.meta.url);

afterEach(async () => {
	await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

it("keeps the committed OpenAPI specification synchronized without rewriting it", async () => {
	const directory = await mkdtemp(join(tmpdir(), "openapi-documentation-"));
	temporaryDirectories.push(directory);
	const firstTarget = join(directory, "first.json");
	const secondTarget = join(directory, "second.json");
	const before = await readFile(committedSpec, "utf8");

	await generateOpenApiDocumentation(firstTarget);
	await generateOpenApiDocumentation(secondTarget);

	expect(await readFile(firstTarget, "utf8")).toBe(before);
	expect(await readFile(secondTarget, "utf8")).toBe(before);
	expect(await readFile(committedSpec, "utf8")).toBe(before);
});
