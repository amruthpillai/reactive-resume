import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { MCP_TOOL_NAME } from "./mcp-tool-names";

type McpRegisteredToolName = (typeof MCP_TOOL_NAME)[keyof typeof MCP_TOOL_NAME];

/** Tool behavior hints for MCP `tools/list` and the static server card. */
export const TOOL_ANNOTATIONS: Record<McpRegisteredToolName, ToolAnnotations> = {
	[MCP_TOOL_NAME.listResumes]: {
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
	},
	[MCP_TOOL_NAME.listResumeTags]: {
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
	},
	[MCP_TOOL_NAME.getResume]: {
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
	},
	[MCP_TOOL_NAME.getResumeAnalysis]: {
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
	},
	[MCP_TOOL_NAME.createResume]: {
		readOnlyHint: false,
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: false,
	},
	[MCP_TOOL_NAME.importResume]: {
		readOnlyHint: false,
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: false,
	},
	[MCP_TOOL_NAME.duplicateResume]: {
		readOnlyHint: false,
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: false,
	},
	[MCP_TOOL_NAME.patchResume]: {
		readOnlyHint: false,
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: false,
	},
	[MCP_TOOL_NAME.updateResume]: {
		readOnlyHint: false,
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: false,
	},
	[MCP_TOOL_NAME.deleteResume]: {
		readOnlyHint: false,
		destructiveHint: true,
		idempotentHint: true,
		openWorldHint: false,
	},
	[MCP_TOOL_NAME.lockResume]: {
		readOnlyHint: false,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
	},
	[MCP_TOOL_NAME.unlockResume]: {
		readOnlyHint: false,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
	},
	[MCP_TOOL_NAME.getResumeStatistics]: {
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
	},
};
