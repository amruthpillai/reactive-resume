import type { AIProvider } from "@reactive-resume/ai/types";
import { ORPCError } from "@orpc/client";
import { and, asc, desc, eq } from "drizzle-orm";
import { aiProviderSchema } from "@reactive-resume/ai/types";
import { db } from "@reactive-resume/db/client";
import * as schema from "@reactive-resume/db/schema";
import { testConnection } from "./ai";
import {
	assertAgentEnvironment,
	decryptCredential,
	encryptCredential,
	redactEncryptedCredential,
} from "./ai-credentials";
import { resolveAiBaseUrl } from "./ai-url-policy";

type AiProviderRecord = typeof schema.aiProvider.$inferSelect;

export type AiProviderResponse = {
	id: string;
	label: string;
	provider: AIProvider;
	model: string;
	baseURL: string | null;
	enabled: boolean;
	testStatus: string;
	testError: string | null;
	apiKeyPreview: string;
	apiKeyFingerprint: string;
	lastTestedAt: Date | null;
	lastUsedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

type CreateAiProviderInput = {
	userId: string;
	label: string;
	provider: AIProvider;
	model: string;
	baseURL?: string | null;
	apiKey: string;
};

type UpdateAiProviderInput = {
	id: string;
	userId: string;
	label?: string;
	provider?: AIProvider;
	model?: string;
	baseURL?: string | null;
	apiKey?: string;
	enabled?: boolean;
};

function toResponse(row: AiProviderRecord): AiProviderResponse {
	const provider = aiProviderSchema.parse(row.provider);
	const { apiKeyFingerprint, apiKeyPreview } = redactEncryptedCredential({
		encryptedApiKey: row.encryptedApiKey,
		apiKeySalt: row.apiKeySalt,
		apiKeyHash: row.apiKeyHash,
		apiKeyPreview: row.apiKeyPreview,
	});

	return {
		id: row.id,
		label: row.label,
		provider,
		model: row.model,
		baseURL: row.baseUrl,
		enabled: row.enabled,
		testStatus: row.testStatus,
		testError: row.testError,
		apiKeyPreview,
		apiKeyFingerprint,
		lastTestedAt: row.lastTestedAt,
		lastUsedAt: row.lastUsedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function normalizeBaseUrl(input: { provider: AIProvider; baseURL?: string | null }) {
	const trimmed = input.baseURL?.trim() ?? "";
	if (!trimmed) return null;

	return resolveAiBaseUrl({ provider: input.provider, baseURL: trimmed });
}

async function getOwnedProvider(input: { id: string; userId: string }) {
	const [provider] = await db
		.select()
		.from(schema.aiProvider)
		.where(and(eq(schema.aiProvider.id, input.id), eq(schema.aiProvider.userId, input.userId)))
		.limit(1);

	if (!provider) throw new ORPCError("NOT_FOUND");

	return provider;
}

export const aiProvidersService = {
	list: async (input: { userId: string }) => {
		assertAgentEnvironment();

		const providers = await db
			.select()
			.from(schema.aiProvider)
			.where(eq(schema.aiProvider.userId, input.userId))
			.orderBy(desc(schema.aiProvider.lastUsedAt), asc(schema.aiProvider.createdAt));

		return providers.map(toResponse);
	},

	getRunnableById: async (input: { id: string; userId: string }) => {
		assertAgentEnvironment();

		const provider = await getOwnedProvider(input);
		if (!provider.enabled || provider.testStatus !== "success") {
			throw new ORPCError("BAD_REQUEST", { message: "AI provider must be tested and enabled before use." });
		}

		return {
			...toResponse(provider),
			apiKey: decryptCredential(provider.encryptedApiKey),
			baseURL: provider.baseUrl ?? "",
		};
	},

	getDefaultRunnable: async (input: { userId: string }) => {
		assertAgentEnvironment();

		const [provider] = await db
			.select()
			.from(schema.aiProvider)
			.where(
				and(
					eq(schema.aiProvider.userId, input.userId),
					eq(schema.aiProvider.enabled, true),
					eq(schema.aiProvider.testStatus, "success"),
				),
			)
			.orderBy(desc(schema.aiProvider.lastUsedAt), asc(schema.aiProvider.createdAt))
			.limit(1);

		return provider
			? {
					...toResponse(provider),
					apiKey: decryptCredential(provider.encryptedApiKey),
					baseURL: provider.baseUrl ?? "",
				}
			: null;
	},

	create: async (input: CreateAiProviderInput) => {
		assertAgentEnvironment();

		const encrypted = encryptCredential(input.apiKey.trim());
		const [provider] = await db
			.insert(schema.aiProvider)
			.values({
				userId: input.userId,
				label: input.label.trim(),
				provider: input.provider,
				model: input.model.trim(),
				baseUrl: normalizeBaseUrl(input),
				...encrypted,
			})
			.returning();

		if (!provider) throw new Error("AI_PROVIDER_CREATE_FAILED");

		return toResponse(provider);
	},

	update: async (input: UpdateAiProviderInput) => {
		assertAgentEnvironment();

		const existing = await getOwnedProvider(input);
		const provider = input.provider ?? aiProviderSchema.parse(existing.provider);
		const nextApiKey = input.apiKey?.trim();
		const encrypted = nextApiKey ? encryptCredential(nextApiKey) : {};
		const credentialChanged = !!nextApiKey;
		if (input.enabled === true && existing.testStatus !== "success" && !credentialChanged) {
			throw new ORPCError("BAD_REQUEST", { message: "AI provider must be tested successfully before enabling." });
		}

		const [updated] = await db
			.update(schema.aiProvider)
			.set({
				...(input.label !== undefined ? { label: input.label.trim() } : {}),
				...(input.provider !== undefined ? { provider: input.provider } : {}),
				...(input.model !== undefined ? { model: input.model.trim() } : {}),
				...(input.baseURL !== undefined ? { baseUrl: normalizeBaseUrl({ provider, baseURL: input.baseURL }) } : {}),
				...(input.enabled !== undefined && !credentialChanged ? { enabled: input.enabled } : {}),
				...(credentialChanged ? { enabled: false, testStatus: "untested", lastTestedAt: null, testError: null } : {}),
				...encrypted,
			})
			.where(and(eq(schema.aiProvider.id, input.id), eq(schema.aiProvider.userId, input.userId)))
			.returning();

		if (!updated) throw new ORPCError("NOT_FOUND");
		return toResponse(updated);
	},

	delete: async (input: { id: string; userId: string }) => {
		assertAgentEnvironment();

		await db
			.delete(schema.aiProvider)
			.where(and(eq(schema.aiProvider.id, input.id), eq(schema.aiProvider.userId, input.userId)));
	},

	test: async (input: { id: string; userId: string }) => {
		assertAgentEnvironment();

		const provider = await getOwnedProvider(input);
		const parsedProvider = aiProviderSchema.parse(provider.provider);
		const apiKey = decryptCredential(provider.encryptedApiKey);

		try {
			const ok = await testConnection({
				provider: parsedProvider,
				model: provider.model,
				apiKey,
				baseURL: provider.baseUrl ?? "",
			});

			const [updated] = await db
				.update(schema.aiProvider)
				.set({
					enabled: ok,
					testStatus: ok ? "success" : "failure",
					testError: ok ? null : "The provider test returned an unexpected response.",
					lastTestedAt: new Date(),
				})
				.where(and(eq(schema.aiProvider.id, input.id), eq(schema.aiProvider.userId, input.userId)))
				.returning();

			if (!updated) throw new ORPCError("NOT_FOUND");
			return toResponse(updated);
		} catch (error) {
			const [updated] = await db
				.update(schema.aiProvider)
				.set({
					enabled: false,
					testStatus: "failure",
					testError: error instanceof Error ? error.message : "Failed to test provider.",
					lastTestedAt: new Date(),
				})
				.where(and(eq(schema.aiProvider.id, input.id), eq(schema.aiProvider.userId, input.userId)))
				.returning();

			if (!updated) throw error;
			throw error;
		}
	},

	markUsed: async (input: { id: string; userId: string }) => {
		await db
			.update(schema.aiProvider)
			.set({ lastUsedAt: new Date() })
			.where(and(eq(schema.aiProvider.id, input.id), eq(schema.aiProvider.userId, input.userId)));
	},
};
