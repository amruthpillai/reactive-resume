import { describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({
	api: {
		getSession: vi.fn(),
	},
}));
const headersMock = vi.hoisted(() => vi.fn(() => new Headers()));

vi.mock("./config", () => ({ auth: authMock }));
vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeaders: headersMock,
}));

const { getSession } = await import("./functions");

describe("getSession", () => {
	it("delegates to auth.api.getSession with the current request headers", async () => {
		const headers = new Headers({ authorization: "Bearer abc" });
		headersMock.mockReturnValueOnce(headers);
		authMock.api.getSession.mockResolvedValueOnce({ user: { id: "u1" }, session: { id: "s1" } });

		const result = await getSession();

		expect(authMock.api.getSession).toHaveBeenCalledWith({ headers });
		expect(result).toMatchObject({ user: { id: "u1" } });
	});

	it("returns null when better-auth returns no session", async () => {
		authMock.api.getSession.mockResolvedValueOnce(null);

		const result = await getSession();

		expect(result).toBeNull();
	});
});
