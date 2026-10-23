import { expect, it, vi } from "vite-plus/test";
import { createProcedureClient } from "@orpc/server";

const createApiKey = vi.hoisted(() => vi.fn());
const getSession = vi.hoisted(() => vi.fn(async () => ({ session: { createdAt: new Date() } })));
vi.mock("@reactive-resume/auth/config", () => ({ auth: { api: { createApiKey, getSession } } }));
vi.mock("./service", () => ({ authService: {} }));
const { authRouter } = await import("./router");

it.each(["apiKey", "bearer", "session"] as const)(
	"requires a browser session to issue credentials: %s",
	async (method) => {
		createApiKey.mockReset().mockResolvedValue({ key: "issued-key" });
		const issue = createProcedureClient(authRouter.createApiKey, {
			context: {
				locale: "en-US",
				reqHeaders: new Headers(),
				authentication: {
					user: {
						id: "owner",
						name: "Owner",
						email: "owner@example.test",
						emailVerified: true,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
					method,
					permissions: ["read", "write", "delete"],
				},
			},
		});
		const input = { name: "Read only", access: "read" as const, expiresIn: 86400 };
		if (method === "session") {
			await expect(issue(input)).resolves.toEqual({ key: "issued-key" });
			expect(createApiKey).toHaveBeenCalledWith({
				body: { userId: "owner", name: "Read only", expiresIn: 86400, permissions: { api: ["read"] } },
			});
		} else {
			await expect(issue(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
			expect(createApiKey).not.toHaveBeenCalled();
		}
	},
);

it("asks for a fresh sign-in before issuing a key from an old session", async () => {
	createApiKey.mockReset();
	getSession.mockResolvedValueOnce({ session: { createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) } });
	const issue = createProcedureClient(authRouter.createApiKey, {
		context: {
			locale: "en-US",
			reqHeaders: new Headers(),
			authentication: {
				user: {
					id: "owner",
					name: "Owner",
					email: "owner@example.test",
					emailVerified: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				method: "session",
				permissions: ["read", "write", "delete"],
			},
		},
	});
	await expect(issue({ name: "Full", access: "full", expiresIn: null })).rejects.toMatchObject({ code: "FORBIDDEN" });
	expect(createApiKey).not.toHaveBeenCalled();
});
