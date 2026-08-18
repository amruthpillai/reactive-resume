import { expect, it } from "vitest";
import { MCP_TOOL_NAME } from "@reactive-resume/mcp/tool-names";
import { buildPatchGuide } from "./prompt";

/** Every raw tool name the prompt guide instructs the model to call. */
function toolsReferencedByGuide(): string[] {
	const guide = buildPatchGuide("resume");
	const matches = guide.matchAll(/mcp__resume__([a-z0-9_]+)/g);
	return [...new Set([...matches].map((match) => match[1] as string))];
}

it("references at least one tool", () => {
	// Guards the regex itself: a guide rewrite that drops the namespaced form
	// would otherwise make the next test pass vacuously.
	expect(toolsReferencedByGuide().length).toBeGreaterThan(0);
});

it("only references tools the MCP server actually publishes", () => {
	// Reads the server's own tool-name table rather than a generated snapshot of
	// a live server card, so renaming a tool in `packages/mcp` fails here on the
	// same PR instead of drifting until a scheduled network check notices.
	const published: readonly string[] = Object.values(MCP_TOOL_NAME);

	for (const referenced of toolsReferencedByGuide()) {
		expect(published).toContain(referenced);
	}
});
