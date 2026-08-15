/**
 * End-to-end coverage for the provider connection test.
 *
 * Everything from the oRPC procedure down is the real thing: the router (including its auth
 * middleware and error mapping), the service, `testConnection`, the failure classifier, and the
 * AES-GCM credential encryption. Only the database and the outbound HTTP call are substituted —
 * the database with an in-memory row store, the provider with a stubbed `fetch`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRouterClient } from "@orpc/server";

const { dbMock, dbState } = vi.hoisted(() => {
	const state = { rows: [] as Record<string, unknown>[] };

	const selectChain = {
		from: () => selectChain,
		where: () => selectChain,
		orderBy: async () => state.rows,
		limit: async () => state.rows,
	};

	const db = {
		select: () => selectChain,
		update: () => ({
			set: (values: Record<string, unknown>) => ({
				where: () => {
					const applied = state.rows.map((row) => Object.assign(row, values));
					return Object.assign(Promise.resolve(applied), { returning: async () => applied });
				},
			}),
		}),
	};

	return { dbMock: db, dbState: state };
});

vi.mock("@reactive-resume/db/client", () => ({ db: dbMock }));
vi.mock("@reactive-resume/db/schema", () => ({
	aiProvider: { id: "ai_provider.id", userId: "ai_provider.user_id" },
	user: { id: "user.id" },
}));
vi.mock("drizzle-orm", () => ({
	and: (...conditions: unknown[]) => ({ conditions }),
	asc: (value: unknown) => ({ value }),
	desc: (value: unknown) => ({ value }),
	eq: (left: unknown, right: unknown) => ({ left, right }),
	sql: () => ({}),
}));

// Real AES-GCM credential encryption runs; it only needs a secret.
vi.mock("@reactive-resume/env/server", () => ({
	env: { ENCRYPTION_SECRET: "e2e-encryption-secret", FLAG_ALLOW_UNSAFE_AI_BASE_URL: true },
}));

vi.mock("@reactive-resume/auth/config", () => ({
	auth: {
		api: {
			getSession: async () => ({ user: { id: "user-1", email: "kaushik@example.test" } }),
			verifyApiKey: async () => ({ valid: false, key: null }),
		},
	},
	verifyOAuthToken: async () => null,
}));

const { aiProvidersRouter } = await import("./router");
const { encryptCredential } = await import("../ai/credentials");

const client = createRouterClient(aiProvidersRouter, {
	context: { locale: "en-US" as const, reqHeaders: new Headers() },
});

function seedProvider(overrides: Record<string, unknown> = {}) {
	const credential = encryptCredential("sk-live-demo-key-1234");

	dbState.rows = [
		{
			id: "provider-1",
			userId: "user-1",
			label: "My provider",
			provider: "openai",
			model: "gpt-4.1",
			baseUrl: "https://api.openai.test/v1",
			enabled: false,
			testStatus: "untested",
			testError: null,
			lastTestedAt: null,
			lastUsedAt: null,
			createdAt: new Date("2026-08-01T00:00:00Z"),
			updatedAt: new Date("2026-08-01T00:00:00Z"),
			...credential,
			...overrides,
		},
	];
}

function stubProvider(status: number, body: unknown) {
	const fetchMock = vi.fn(
		() =>
			new Response(typeof body === "string" ? body : JSON.stringify(body), {
				status,
				headers: { "Content-Type": "application/json" },
			}),
	);
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

function chatCompletion(content: string) {
	return {
		id: "chatcmpl-1",
		object: "chat.completion",
		created: 1,
		model: "gpt-4.1",
		choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
		usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("POST /ai-providers/{id}/test — end to end", () => {
	beforeEach(() => {
		seedProvider();
	});

	it("resolves with a usable provider and enables it", async () => {
		stubProvider(200, chatCompletion("1"));

		const response = await client.test({ id: "provider-1" });

		expect(response.testStatus).toBe("success");
		expect(response.testError).toBeNull();
		expect(response.enabled).toBe(true);
		// The persisted row is what the dashboard reads on the next page load.
		expect(dbState.rows[0]).toMatchObject({ testStatus: "success", testError: null, enabled: true });
	});

	it("resolves — not rejects — when the provider rejects the key, and explains why", async () => {
		stubProvider(401, { error: { message: "Incorrect API key provided." } });

		// Before this change the procedure threw BAD_GATEWAY, so this call would reject.
		const response = await client.test({ id: "provider-1" });

		expect(response.testStatus).toBe("failure");
		expect(response.testError).toBe("OpenAI rejected the API key.");
		expect(response.enabled).toBe(false);
		expect(dbState.rows[0]?.testError).toBe("OpenAI rejected the API key.");
	});

	it("names the model when the provider returns not-found", async () => {
		stubProvider(404, {});

		const response = await client.test({ id: "provider-1" });

		expect(response.testError).toBe('OpenAI has no model named "gpt-4.1", or the base URL is wrong.');
	});

	it("attributes an outage to the provider and does not retry", async () => {
		const fetchMock = stubProvider(503, {});

		const response = await client.test({ id: "provider-1" });

		expect(response.testError).toBe("OpenAI reported a server error (503). This is a problem on the provider's side.");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("separates a reachable provider from a usable one", async () => {
		stubProvider(200, chatCompletion("Of course! I am connected."));

		const response = await client.test({ id: "provider-1" });

		expect(response.testStatus).toBe("failure");
		expect(response.testError).toContain("reachable, but the model replied with unexpected output");
	});

	it("never leaks the decrypted API key into the persisted error", async () => {
		stubProvider(400, { error: { message: "Bad request for key sk-live-demo-key-1234" } });

		const response = await client.test({ id: "provider-1" });

		expect(response.testError).not.toContain("sk-live-demo-key-1234");
		expect(response.testError).toContain("***");
	});

	it("still rejects with BAD_REQUEST when the base URL is not permitted", async () => {
		// A blocked address must remain a configuration error, not a provider failure.
		seedProvider({ baseUrl: "ftp://api.openai.test/v1" });
		stubProvider(200, chatCompletion("1"));

		await expect(client.test({ id: "provider-1" })).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: "Invalid AI provider configuration.",
		});
	});

	it("rejects with NOT_FOUND when the provider belongs to nobody", async () => {
		dbState.rows = [];

		await expect(client.test({ id: "provider-1" })).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});
