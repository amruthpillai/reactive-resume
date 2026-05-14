import { describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({
	api: {
		getSession: vi.fn(),
	},
}));

vi.mock("./config", () => ({ auth: authMock }));

const { getSession } = await import("./functions");

describe("getSession", () => {
	it("delegates to auth.api.getSession with the provided request headers", async () => {
		const headers = new Headers({ authorization: "Bearer abc" });
		authMock.api.getSession.mockResolvedValueOnce({ user: { id: "u1" }, session: { id: "s1" } });

		const result = await getSession(headers);

		expect(authMock.api.getSession).toHaveBeenCalledWith({ headers });
		expect(result).toMatchObject({ user: { id: "u1" } });
	});

	it("returns null when better-auth returns no session", async () => {
		authMock.api.getSession.mockResolvedValueOnce(null);

		const result = await getSession(new Headers());

		expect(result).toBeNull();
	});
});
