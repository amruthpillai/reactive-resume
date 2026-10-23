import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { AnyProcedure, InferRouterInitialContext, RouterClient } from "@orpc/server";
import type { RequestAuthentication } from "@reactive-resume/api/context";
import { call, ORPCError } from "@orpc/server";
import z from "zod";
import { requiredPermission } from "@reactive-resume/api/context";
import { restAliases } from "@reactive-resume/api/rest";
import router from "@reactive-resume/api/routers";
import { env } from "@reactive-resume/env/server";
import { fileInputSchema, toWireObjectSchema, wireJsonSchema } from "./contracts";
import { readMcpFile } from "./files";
import { json, withErrorHandling } from "./results";
import { PARITY_TOOL_DESCRIPTIONS } from "./tool-meta";

export const MCP_ROUTER = { ...router, rest: restAliases };

// Explicit allowlist: adding an API procedure never silently grants MCP access.
const PARITY_PROCEDURES = {
	"resume.listVersions": router.resume.listVersions,
	"resume.getVersion": router.resume.getVersion,
	"resume.createVersion": router.resume.createVersion,
	"resume.renameVersion": router.resume.renameVersion,
	"resume.deleteVersion": router.resume.deleteVersion,
	"resume.restoreVersion": router.resume.restoreVersion,
	"resume.removePassword": router.resume.removePassword,
	"resume.getBySlug": router.resume.getBySlug,
	"resume.checkSlug": router.resume.checkSlug,
	"resume.update": router.resume.update,
	"resume.statistics.getDailyById": router.resume.statistics.getDailyById,
	"resume.statistics.recordDownload": router.resume.statistics.recordDownload,
	"coverLetters.listVersions": router.coverLetters.listVersions,
	"coverLetters.getVersion": router.coverLetters.getVersion,
	"coverLetters.createVersion": router.coverLetters.createVersion,
	"coverLetters.renameVersion": router.coverLetters.renameVersion,
	"coverLetters.deleteVersion": router.coverLetters.deleteVersion,
	"coverLetters.restoreVersion": router.coverLetters.restoreVersion,
	"coverLetters.draft": router.coverLetters.draft,
	"documents.list": router.documents.list,
	"documents.counts": router.documents.counts,
	"documents.rename": router.documents.rename,
	"documents.setTags": router.documents.setTags,
	"documents.setLocked": router.documents.setLocked,
	"documents.linkApplication": router.documents.linkApplication,
	"documents.trash": router.documents.trash,
	"documents.restore": router.documents.restore,
	"documents.purge": router.documents.purge,
	"documents.purgeExpired": router.documents.purgeExpired,
	"documents.copyForJob": router.documents.copyForJob,
	"applications.ai.searchPostings": router.applications.ai.searchPostings,
	"applications.ai.parsePosting": router.applications.ai.parsePosting,
	"ai.parsePdf": router.ai.parsePdf,
	"ai.parseDocx": router.ai.parseDocx,
	"ai.atsReview": router.ai.atsReview,
	"ai.improve": router.ai.improve,
	"aiProviders.list": router.aiProviders.list,
	"aiProviders.delete": router.aiProviders.delete,
	"aiProviders.test": router.aiProviders.test,
	"aiProviders.setDefault": router.aiProviders.setDefault,
	"webAccess.status": router.webAccess.status,
	"webAccess.delete": router.webAccess.delete,
	"webAccess.test": router.webAccess.test,
	"agent.threads.list": router.agent.threads.list,
	"agent.threads.start": router.agent.threads.start,
	"agent.threads.get": router.agent.threads.get,
	"agent.threads.update": router.agent.threads.update,
	"agent.threads.delete": router.agent.threads.delete,
	"agent.messages.send": router.agent.messages.send,
	"agent.messages.stop": router.agent.messages.stop,
	"agent.messages.resume": router.agent.messages.resume,
	"agent.messages.setEditStatus": router.agent.messages.setEditStatus,
	"agent.attachments.create": router.agent.attachments.create,
	"agent.attachments.delete": router.agent.attachments.delete,
	"career.profile": router.career.profile,
	"career.saveProfile": router.career.saveProfile,
	"career.facts": router.career.facts,
	"career.saveFact": router.career.saveFact,
	"career.updateFact": router.career.updateFact,
	"career.forgetFact": router.career.forgetFact,
	"career.stories": router.career.stories,
	"career.saveStory": router.career.saveStory,
	"career.deleteStory": router.career.deleteStory,
	"career.savedItems": router.career.savedItems,
	"career.deleteSavedItem": router.career.deleteSavedItem,
	"career.applyReply": router.career.applyReply,
	"career.workspace": router.career.workspace,
	"career.saveWorkspace": router.career.saveWorkspace,
	"career.schedules": router.career.schedules,
	"career.saveSchedule": router.career.saveSchedule,
	"career.deleteSchedule": router.career.deleteSchedule,
	"career.opportunities": router.career.opportunities,
	"career.dismissOpportunity": router.career.dismissOpportunity,
	"career.trackOpportunity": router.career.trackOpportunity,
	"career.notifications": router.career.notifications,
	"career.markNotificationRead": router.career.markNotificationRead,
	"auth.providers.list": router.auth.providers.list,
	"auth.exportData": router.auth.exportData,
	"flags.get": router.flags.get,
	"statistics.getTotals": router.statistics.getTotals,
	"statistics.github.getStarCount": router.statistics.github.getStarCount,
	"storage.deleteFile": router.storage.deleteFile,
	"rest.documentExports.resume": restAliases.documentExports.resume,
	"rest.documentExports.letter": restAliases.documentExports.letter,
	"rest.checkResume": restAliases.checkResume,
	"rest.checkPdf": restAliases.checkPdf,
	"rest.matchResume": restAliases.matchResume,
	"rest.importResumeFile": restAliases.importResumeFile,
	"rest.fileUpload": restAliases.fileUpload,
} as const;

function parityToolName(path: string): string {
	return `api_${path
		.replaceAll(".", "_")
		.replace(/([a-z])([A-Z])/g, "$1_$2")
		.toLowerCase()}`;
}

const streamingPaths = new Set(["coverLetters.draft", "agent.messages.send", "agent.messages.resume"]);
const readOnlyPosts = new Set([
	"ai.parsePdf",
	"ai.parseDocx",
	"ai.atsReview",
	"ai.improve",
	"applications.ai.searchPostings",
	"applications.ai.parsePosting",
	"rest.checkResume",
	"rest.checkPdf",
	"rest.matchResume",
	"coverLetters.draft",
	"webAccess.test",
]);
const exportPaths = new Set(["rest.documentExports.resume", "rest.documentExports.letter"]);
const destructiveWrites = new Set([
	"career.saveProfile",
	"career.saveStory",
	"career.saveSchedule",
	"career.saveWorkspace",
	"career.applyReply",
	"agent.messages.stop",
]);
// Changes what a public resume link or uploaded file URL shows, or sends content to the user's AI provider.
const openWorldPaths = new Set([
	"resume.update",
	"resume.restoreVersion",
	"resume.removePassword",
	"rest.fileUpload",
	"coverLetters.draft",
	"career.saveSchedule",
	"agent.messages.send",
	"statistics.github.getStarCount",
]);

/** These workflows require browser interaction so secrets and security ceremonies stay with the user. */
const BROWSER_HANDOFFS = {
	"aiProviders.create": "ai",
	"aiProviders.update": "ai",
	"webAccess.save": "ai",
	"resume.getRoot": "",
	"auth.createApiKey": "api-keys",
	"auth.deleteAccount": "account",
} as const;

const HANDOFF_TITLES: Record<string, string> = {
	"aiProviders.create": "Add an AI provider in the app",
	"aiProviders.update": "Edit an AI provider in the app",
	"webAccess.save": "Set up web search in the app",
	"resume.getRoot": "Open the dashboard",
	"auth.createApiKey": "Create an API key in the app",
	"auth.deleteAccount": "Delete your account in the app",
	"resume.setPassword": "Set a resume's share password in the app",
	"resume.verifyPassword": "Open a password-protected resume",
};

/** Resume share passwords are credentials too: owners set them and visitors enter them in the browser. */
const RESUME_PASSWORD_HANDOFFS = {
	"resume.setPassword": {
		description:
			"Open the resume in the editor to set, change or remove its share password under Share → Link → Require a password. Passwords stay out of tool arguments. No change is made by this tool.",
		inputSchema: z.object({ id: z.string().min(1).describe("Resume ID. Use `list_resumes` to find valid IDs.") }),
		url: ({ id }: Record<string, string>) => `/builder/${encodeURIComponent(id ?? "")}`,
	},
	"resume.verifyPassword": {
		description:
			"Open a password-protected public resume so the visitor can enter its password in the browser. Passwords stay out of tool arguments. No change is made by this tool.",
		inputSchema: z.object({
			username: z.string().min(1).describe("Username in the public resume address."),
			slug: z.string().min(1).describe("Slug in the public resume address."),
		}),
		url: ({ username, slug }: Record<string, string>) =>
			`/${encodeURIComponent(username ?? "")}/${encodeURIComponent(slug ?? "")}`,
	},
};

const handoffAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const handoffOutputSchema = z.object({ url: z.url(), action: z.string(), requiresBrowser: z.literal(true) });
type HandoffToolMeta = {
	title: string;
	description: string;
	inputSchema: z.ZodObject;
	outputSchema: typeof handoffOutputSchema;
	annotations: ToolAnnotations;
};
// Directories show annotations.title as the tool's name, so every tool repeats its title there.
const handoffMeta = (path: string, description: string, inputSchema: z.ZodObject): HandoffToolMeta => {
	const title = HANDOFF_TITLES[path] ?? `Open ${path} in the app`;
	return {
		title,
		description,
		inputSchema,
		outputSchema: handoffOutputSchema,
		annotations: { title, ...handoffAnnotations },
	};
};
const browserToolMeta: Record<string, HandoffToolMeta> = Object.fromEntries([
	...Object.keys(BROWSER_HANDOFFS).map((path) => [
		parityToolName(path),
		handoffMeta(
			path,
			"Complete this workflow in the authenticated browser. Provider keys, passwords, passkeys and other account credentials stay out of tool arguments. No change is made by this tool.",
			z.object({}),
		),
	]),
	...Object.entries(RESUME_PASSWORD_HANDOFFS).map(([path, { description, inputSchema }]) => [
		parityToolName(path),
		handoffMeta(path, description, inputSchema),
	]),
]);
const accountToolMeta = {
	title: "Open account settings",
	description:
		"Open profile, security, connected applications, API keys or preferences. Authentication changes require the user's browser interaction.",
	inputSchema: z.object({
		page: z.enum(["profile", "authentication", "api-keys", "preferences", "account"]).default("profile"),
	}),
	outputSchema: z.object({ url: z.url(), requiresBrowser: z.literal(true) }),
	annotations: { title: "Open account settings", ...handoffAnnotations },
};

type ParityToolContract = {
	inputJson: ReturnType<typeof wireJsonSchema>;
	inputSchema: z.ZodObject;
	outputSchema: z.ZodObject;
};
const parityContracts = new WeakMap<AnyProcedure, Map<string, ParityToolContract>>();
// The export's full contract repeats every document, application and career schema (~13k tokens);
// the procedure still validates it, so discovery only names its parts.
const accountExportOutputSchema = z
	.looseObject({
		exportedAt: z.string(),
		user: z.looseObject({}).describe("Profile: id, name, email, username, image and timestamps."),
		resumes: z.array(z.looseObject({})).describe("Every resume, as returned by read_resume."),
		coverLetters: z.array(z.looseObject({})).describe("Every cover letter, as returned by read_cover_letter."),
		applications: z.array(z.looseObject({})).describe("Every application, as returned by read_application."),
		career: z
			.looseObject({})
			.describe(
				"Career data: profile, facts, stories, artifacts, schedules, notifications, assistant threads, messages and attachments, opportunities, jobs, transcripts and workspaces.",
			),
	})
	.describe("Everything in the account. Secrets such as password hashes, tokens and API keys are never included.");

/** The live server and server card share static contracts, never request context or callbacks. */
export function parityToolContract(path: string, procedure: AnyProcedure): ParityToolContract {
	let contracts = parityContracts.get(procedure);
	const cached = contracts?.get(path);
	if (cached) return cached;
	const definition = procedure["~orpc"];
	const inputJson = definition.inputSchema
		? wireJsonSchema(requireZod(definition.inputSchema), "input")
		: z.toJSONSchema(z.object({}));
	if (path === "ai.parsePdf" || path === "ai.parseDocx" || path === "agent.attachments.create") {
		const properties = inputJson.properties as Record<string, unknown>;
		properties[path === "agent.attachments.create" ? "data" : "file"] = z.toJSONSchema(fileInputSchema);
	}
	// MCP requires object inputs; optional/default API inputs become ordinary objects.
	delete inputJson.default;
	const inputSchema = z.fromJSONSchema(inputJson);
	if (!(inputSchema instanceof z.ZodObject)) throw new Error(`MCP input must be an object: ${path}`);
	const boundedInput =
		"limit" in inputSchema.shape
			? inputSchema.extend({
					limit: z.number().int().min(1).max(100).default(20),
					offset: z.number().int().nonnegative().default(0),
				})
			: inputSchema;
	const outputSchema = exportPaths.has(path)
		? z.object({ url: z.url(), requiresAuthentication: z.literal(true) })
		: path === "auth.exportData"
			? accountExportOutputSchema
			: streamingPaths.has(path)
				? z.object({ events: z.array(z.string()), truncated: z.boolean() })
				: toWireObjectSchema(requireZod(definition.outputSchema));
	const contract = { inputJson, inputSchema: boundedInput, outputSchema };
	if (!contracts) {
		contracts = new Map();
		parityContracts.set(procedure, contracts);
	}
	contracts.set(path, contract);
	return contract;
}

export const PARITY_TOOL_META: Record<
	string,
	Pick<ReturnType<typeof parityToolContract>, "inputSchema" | "outputSchema"> & {
		title: string;
		description: string;
		annotations: ToolAnnotations;
	}
> = {
	...Object.fromEntries(
		Object.entries(PARITY_PROCEDURES).map(([path, procedure]) => {
			const route = procedure["~orpc"].route;
			const readOnly =
				(route.method === "GET" || readOnlyPosts.has(path)) && !["resume.getBySlug", "aiProviders.list"].includes(path);
			const contract = parityToolContract(path, procedure);
			const title = route.summary ?? path;
			return [
				parityToolName(path),
				{
					title,
					description: `${sentence(PARITY_TOOL_DESCRIPTIONS[path] ?? route.description ?? route.summary ?? path)}${path.startsWith("agent.messages.") && streamingPaths.has(path) ? " Returns collected stream chunks, at most 500,000 characters; use the thread getter to retrieve persisted assistant replies." : ""}${exportPaths.has(path) ? " Returns a download link rather than the file. Opening it requires authentication as this account, so it suits API clients; the file is rendered when the link is opened." : ""}${path === "rest.documentExports.resume" ? " For a PDF link the user can open directly, use `download_resume_pdf`." : ""}`,
					inputSchema: contract.inputSchema,
					outputSchema: contract.outputSchema,
					annotations: {
						title,
						readOnlyHint: readOnly,
						destructiveHint:
							!readOnly &&
							(route.method === "DELETE" ||
								destructiveWrites.has(path) ||
								/update|delete|purge|remove|restore|password|trash|set/i.test(path)),
						idempotentHint: readOnly && !/draft|parse|test|search|improve|review/i.test(path),
						openWorldHint:
							openWorldPaths.has(path) || /ai|webAccess|storage|attachments|Exports|importResumeFile/i.test(path),
					},
				},
			];
		}),
	),
	...browserToolMeta,
	open_account_settings: accountToolMeta,
};

/** Route summaries have no full stop; descriptions append further sentences. */
function sentence(text: string) {
	return /[.!?]$/.test(text) ? text : `${text}.`;
}

function requireZod(schema: unknown): z.ZodType {
	if (!(schema instanceof z.ZodType)) throw new Error("MCP procedure requires a Zod contract.");
	return schema;
}

async function decodeInput(
	value: unknown,
	schema: Record<string, unknown>,
	userId: string,
	maxBytes = 10 * 1024 * 1024,
): Promise<unknown> {
	if (value === null || value === undefined) return value;
	if (schema["x-mcp-native"] === "date") return new Date(String(value));
	if (schema["x-mcp-native"] === "file") return readMcpFile(value, userId, maxBytes);
	const variants = schema.anyOf ?? schema.oneOf;
	if (Array.isArray(variants)) {
		for (const variant of variants) {
			if (variant && typeof variant === "object" && z.fromJSONSchema(variant).safeParse(value).success) {
				return decodeInput(value, variant as Record<string, unknown>, userId, maxBytes);
			}
		}
	}
	if (Array.isArray(value) && schema.items && typeof schema.items === "object") {
		return Promise.all(
			value.map((item) => decodeInput(item, schema.items as Record<string, unknown>, userId, maxBytes)),
		);
	}
	if (typeof value === "object" && !Array.isArray(value)) {
		const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
		return Object.fromEntries(
			await Promise.all(
				Object.entries(value).map(async ([key, item]) => [
					key,
					properties?.[key] ? await decodeInput(item, properties[key], userId, maxBytes) : item,
				]),
			),
		);
	}
	return value;
}

function encodeOutput(value: unknown): unknown {
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map(encodeOutput);
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.filter(([, item]) => item !== undefined)
				.map(([key, item]) => [key, encodeOutput(item)]),
		);
	}
	return value ?? null;
}

type DynamicClient = { [key: string]: DynamicClient | ((input: unknown) => Promise<unknown>) };
function getClientCall(client: RouterClient<typeof MCP_ROUTER>, path: string) {
	let value: DynamicClient | ((input: unknown) => Promise<unknown>) = client as unknown as DynamicClient;
	for (const part of path.split(".")) {
		if (typeof value === "function" || !value[part]) throw new Error(`Missing MCP client procedure: ${path}`);
		value = value[part];
	}
	if (typeof value !== "function") throw new Error(`Invalid MCP client procedure: ${path}`);
	return value;
}

export function registerParityTools(
	server: McpServer,
	client: RouterClient<typeof MCP_ROUTER>,
	headers: Headers,
	context: {
		authentication: RequestAuthentication;
		resHeaders: Headers;
		locale: InferRouterInitialContext<typeof MCP_ROUTER>["locale"];
		trustedClient: string;
		signal?: AbortSignal;
	},
) {
	for (const [path, procedure] of Object.entries(PARITY_PROCEDURES)) {
		const definition = (procedure as AnyProcedure)["~orpc"];
		const { inputJson } = parityToolContract(path, procedure);
		const name = parityToolName(path);
		const meta = PARITY_TOOL_META[name];
		if (!meta) throw new Error(`Missing MCP tool contract: ${path}`);
		server.registerTool(
			name,
			meta,
			withErrorHandling(path, async (params) => {
				const userId = context.authentication.user.id;
				const permission = requiredPermission(definition.route);
				if (!context.authentication.permissions.includes(permission))
					throw new ORPCError("FORBIDDEN", { message: `This credential requires api:${permission} permission.` });
				const maxBytes =
					path === "rest.checkPdf"
						? 25_000_000
						: path === "agent.attachments.create"
							? 25 * 1024 * 1024
							: 10 * 1024 * 1024;
				let input = await decodeInput(params, inputJson as Record<string, unknown>, userId, maxBytes);
				if (path === "ai.parsePdf" || path === "ai.parseDocx" || path === "agent.attachments.create") {
					const record = input as Record<string, unknown>;
					const field = path === "agent.attachments.create" ? "data" : "file";
					const file = await readMcpFile(record[field], userId, maxBytes);
					input = { ...record, [field]: Buffer.from(await file.arrayBuffer()).toString("base64") };
				}
				context.resHeaders.delete("set-cookie");
				let result: unknown;
				if (exportPaths.has(path)) {
					const { id, format, words } = input as { id: string; format: string; words?: Record<string, string> };
					await (path.endsWith(".resume") ? client.resume.getById({ id }) : client.coverLetters.getById({ id }));
					const collection = path.endsWith(".resume") ? "resumes" : "cover-letters";
					const url = new URL(
						`/api/openapi/${collection}/${encodeURIComponent(id)}/exports/${encodeURIComponent(format)}`,
						env.APP_URL,
					);
					if (words) for (const [key, value] of Object.entries(words)) url.searchParams.set(`words[${key}]`, value);
					return json({ url: url.toString(), requiresAuthentication: true });
				}
				if (path === "resume.getBySlug") {
					// Public reads never borrow the caller's browser cookies.
					const reqHeaders = new Headers(headers);
					reqHeaders.delete("cookie");
					context.signal?.throwIfAborted();
					result = await call(router.resume.getBySlug, input as { username: string; slug: string }, {
						context: { ...context, reqHeaders },
						...(context.signal && { signal: context.signal }),
					});
				} else {
					result = await getClientCall(client, path)(input);
				}
				if (streamingPaths.has(path)) {
					const events: string[] = [];
					let length = 0;
					let truncated = false;
					for await (const event of result as AsyncIterable<string>) {
						if (length + event.length > 500_000) {
							truncated = true;
							break;
						}
						events.push(event);
						length += event.length;
					}
					result = { events, truncated };
				}
				return json(encodeOutput(result));
			}),
		);
	}
	for (const [path, destination] of Object.entries(BROWSER_HANDOFFS)) {
		const meta = browserToolMeta[parityToolName(path)];
		if (!meta) throw new Error(`Missing browser workflow contract: ${path}`);
		server.registerTool(parityToolName(path), meta, () =>
			json({
				url: new URL(destination ? `/dashboard/settings/${destination}` : "/dashboard", env.APP_URL).toString(),
				action: path,
				requiresBrowser: true,
			}),
		);
	}
	for (const [path, { url }] of Object.entries(RESUME_PASSWORD_HANDOFFS)) {
		const meta = browserToolMeta[parityToolName(path)];
		if (!meta) throw new Error(`Missing browser workflow contract: ${path}`);
		server.registerTool(parityToolName(path), meta, (input) =>
			json({
				url: new URL(url(input as Record<string, string>), env.APP_URL).toString(),
				action: path,
				requiresBrowser: true,
			}),
		);
	}
	server.registerTool("open_account_settings", accountToolMeta, ({ page }) =>
		json({ url: new URL(`/dashboard/settings/${page}`, env.APP_URL).toString(), requiresBrowser: true }),
	);
}
