import z from "@deepseek-ai/schemastery";

/** `dsh-mcp-client` reserves this shape for a server namespace. */
const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

/** Resolved plugin configuration. Every field is populated after parsing. */
export interface Config {
	/** API key minted at `<url>/dashboard/settings/api-keys`. */
	apiKey: string;
	/** Reactive Resume origin, no trailing slash. */
	url: string;
	/** Tool namespace: tools reach the model as `mcp__<serverName>__<rawName>`. */
	serverName: string;
	/** Per-tool-call timeout in milliseconds. */
	toolCallTimeoutMs: number;
}

export const Config = z.object({
	// Not `.required()`: the bundle patch mounts this plugin as soon as the
	// package is installed, so a missing key has to be an inert no-op rather
	// than a validation error that takes the whole profile down at boot.
	// `apply` warns and mounts nothing instead.
	apiKey: z.string().default("").description("API key from <url>/dashboard/settings/api-keys."),
	url: z
		.string()
		.default("https://rxresu.me")
		.description("Reactive Resume origin. Set this for a self-hosted instance."),
	serverName: z
		.string()
		.pattern(SERVER_NAME_PATTERN)
		.default("resume")
		.description("Tool namespace. Must match [A-Za-z0-9_-]{1,32} and be unique across live MCP instances."),
	toolCallTimeoutMs: z.natural().default(60_000).description("Per-tool-call timeout in milliseconds."),
});
