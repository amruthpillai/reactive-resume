import { beforeEach, expect, it, vi } from "vitest";
import { createProcedureClient } from "@orpc/server";

const database = vi.hoisted(() => ({ insert: vi.fn(), values: vi.fn(), returning: vi.fn() }));
vi.mock("@reactive-resume/db/client", () => ({ db: database }));
vi.mock("@reactive-resume/auth/config", () => ({ auth: { api: {} } }));
const { reportAiContent } = await import("./reports");
const owner = {
	id: "owner",
	name: "Fixture",
	email: "fixture@example.test",
	emailVerified: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};
const report = createProcedureClient(reportAiContent, {
	context: {
		locale: "en-US",
		reqHeaders: new Headers(),
		authentication: { user: owner, method: "bearer", permissions: ["write"] },
	},
});
beforeEach(() => {
	vi.clearAllMocks();
	database.insert.mockReturnValue(database);
	database.values.mockReturnValue(database);
	database.returning.mockResolvedValue([{ id: "report-1" }]);
});

it("stores submitted content under authenticated account, never a supplied owner, and returns a receipt only after persistence", async () => {
	await expect(
		report({
			source: "assistant",
			reason: "dangerous",
			content: " Fictional unsafe answer ",
			note: " Please review ",
			userId: "other",
		} as never),
	).resolves.toEqual({ id: "report-1" });
	expect(database.values).toHaveBeenCalledWith({
		userId: "owner",
		source: "assistant",
		reason: "dangerous",
		content: "Fictional unsafe answer",
		note: "Please review",
	});
	database.returning.mockRejectedValueOnce(new Error("Storage unavailable"));
	await expect(report({ source: "other", reason: "other", content: "Fictional answer" })).rejects.toThrow();
});

it.each(["", " ", "x".repeat(20_001)])("rejects empty or oversized content without persistence", async (content) => {
	await expect(report({ source: "other", reason: "other", content })).rejects.toMatchObject({ code: "BAD_REQUEST" });
	expect(database.insert).not.toHaveBeenCalled();
});

it("rejects an unauthenticated submission", async () => {
	const anonymous = createProcedureClient(reportAiContent, {
		context: { locale: "en-US", reqHeaders: new Headers(), authentication: null },
	});
	await expect(anonymous({ source: "other", reason: "other", content: "Fictional answer" })).rejects.toMatchObject({
		code: "UNAUTHORIZED",
	});
	expect(database.insert).not.toHaveBeenCalled();
});

it("accepts a public-resume safety report and preserves the submitted public URL", async () => {
	await expect(
		report({ source: "public-resume", reason: "hate", content: "https://fixture.test/recruiter/resume" }),
	).resolves.toEqual({ id: "report-1" });
	expect(database.values).toHaveBeenCalledWith(
		expect.objectContaining({
			userId: "owner",
			source: "public-resume",
			content: "https://fixture.test/recruiter/resume",
		}),
	);
});
