import type { PromptSection } from "@deepseek-ai/dsh-system-prompt";
import { expect, it, vi } from "vitest";
import { Config } from "./config";
import { apply } from "./index";
import { PATCH_GUIDE } from "./prompt";

function fakeContext() {
	return {
		plugin: vi.fn(async (_plugin: unknown, _config: unknown) => undefined),
		systemPrompt: { section: vi.fn((_section: PromptSection) => () => undefined) },
	};
}

it("registers one prompt section in the tool-guidance order band", async () => {
	const ctx = fakeContext();

	await apply(ctx as never, Config({ apiKey: "test-key" }));

	expect(ctx.systemPrompt.section).toHaveBeenCalledTimes(1);
	const section = ctx.systemPrompt.section.mock.calls[0]?.[0] as PromptSection;
	expect(section.name).toBe("reactive-resume:resume");
	expect(section.order).toBeGreaterThanOrEqual(100);
	expect(section.order).toBeLessThanOrEqual(199);
	expect(section.text).toBe(PATCH_GUIDE);
});

it("derives the section name from serverName so a second instance can coexist", async () => {
	const first = fakeContext();
	const second = fakeContext();

	await apply(first as never, Config({ apiKey: "test-key" }));
	await apply(second as never, Config({ apiKey: "test-key", serverName: "self-hosted" }));

	const firstSection = first.systemPrompt.section.mock.calls[0]?.[0] as PromptSection;
	const secondSection = second.systemPrompt.section.mock.calls[0]?.[0] as PromptSection;
	expect(firstSection.name).not.toBe(secondSection.name);
});

it("names the tools it references with the configured namespace", async () => {
	const ctx = fakeContext();

	await apply(ctx as never, Config({ apiKey: "test-key", serverName: "rr" }));

	const section = ctx.systemPrompt.section.mock.calls[0]?.[0] as PromptSection;
	expect(section.text).toContain("mcp__rr__read_resume");
	expect(section.text).not.toContain("mcp__resume__read_resume");
});

it("covers the documented failure modes", () => {
	for (const phrase of ["RFC 6902", "unlock_resume", "lock_resume", "list_resumes"]) {
		expect(PATCH_GUIDE).toContain(phrase);
	}
});

it("does not point at the unreachable schema resource", () => {
	expect(PATCH_GUIDE).not.toContain("resume://_meta/schema");
});

it("does not claim update_resume replaces resume content", () => {
	expect(PATCH_GUIDE).toContain("only changes metadata");
});
