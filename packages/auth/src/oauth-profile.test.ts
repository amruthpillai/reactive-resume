import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => {
	const selectQueue: unknown[][] = [];
	const updateWhere = vi.fn();
	const updateSet = vi.fn((_value: unknown) => ({
		where: updateWhere,
	}));
	const where = vi.fn(() => ({
		limit: vi.fn(() => selectQueue.shift() ?? []),
	}));
	const innerJoin = vi.fn(() => ({ where }));
	const from = vi.fn(() => ({ innerJoin, where }));
	const select = vi.fn(() => ({ from }));
	const update = vi.fn(() => ({ set: updateSet }));

	return {
		selectQueue,
		select,
		from,
		innerJoin,
		where,
		update,
		updateSet,
		updateWhere,
	};
});

vi.mock("@reactive-resume/db/client", () => ({
	db: {
		select: dbMock.select,
		update: dbMock.update,
	},
}));

const { createGithubProfileMapper, createProfileMapper } = await import("./oauth-profile");

beforeEach(() => {
	dbMock.selectQueue.length = 0;
	dbMock.select.mockClear();
	dbMock.from.mockClear();
	dbMock.innerJoin.mockClear();
	dbMock.where.mockClear();
	dbMock.update.mockClear();
	dbMock.updateSet.mockClear();
	dbMock.updateWhere.mockClear();
});

describe("createProfileMapper", () => {
	it("reuses a migrated GitHub account when the login and email match the legacy account", async () => {
		dbMock.selectQueue.push([
			{
				id: "user-1",
				accountId: "legacy-user-id",
				email: "Legacy.User@Example.COM",
				emailVerified: true,
				username: "octo-cat",
				displayUsername: "Octo-Cat",
				name: "Legacy User",
				image: "https://example.com/old.png",
			},
		]);

		const mapper = createGithubProfileMapper();

		const result = await mapper({
			id: "123456",
			email: "legacy.user@example.com",
			login: "Octo-Cat",
			name: "Provider Name",
			avatar_url: "https://example.com/new.png",
		});

		expect(dbMock.select).toHaveBeenCalledTimes(1);
		expect(dbMock.update).toHaveBeenCalledTimes(1);
		expect(dbMock.updateSet).toHaveBeenCalledWith({ email: "legacy.user@example.com" });
		expect(result).toEqual({
			id: "legacy-user-id",
			name: "Legacy User",
			email: "legacy.user@example.com",
			image: "https://example.com/new.png",
			username: "octo-cat",
			displayUsername: "Octo-Cat",
			emailVerified: true,
		});
	});

	it("does not reuse a migrated GitHub account when only the login matches", async () => {
		dbMock.selectQueue.push(
			[
				{
					id: "user-1",
					accountId: "legacy-user-id",
					email: "Legacy.User@Example.COM",
					emailVerified: true,
					username: "octo-cat",
					displayUsername: "Octo-Cat",
					name: "Legacy User",
					image: "https://example.com/old.png",
				},
			],
			[],
			[{ id: "user-1" }],
			[],
		);

		const mapper = createGithubProfileMapper();

		const result = await mapper({
			id: "123456",
			email: "current.github@example.com",
			login: "Octo-Cat",
			name: "Provider Name",
			avatar_url: "https://example.com/new.png",
		});

		expect(dbMock.select).toHaveBeenCalledTimes(4);
		expect(dbMock.update).not.toHaveBeenCalled();
		expect(result).toEqual({
			name: "Provider Name",
			email: "current.github@example.com",
			image: "https://example.com/new.png",
			username: "octo-cat-1",
			displayUsername: "octo-cat-1",
			emailVerified: true,
		});
	});

	it("falls back to email matching when no migrated GitHub account matches the provider login", async () => {
		dbMock.selectQueue.push(
			[],
			[
				{
					id: "user-1",
					email: "GitHub.User@Example.COM",
					emailVerified: false,
					username: "github.user",
					displayUsername: "github.user",
					name: "GitHub User",
					image: null,
				},
			],
		);

		const mapper = createGithubProfileMapper();

		const result = await mapper({
			id: "123456",
			email: "github.user@example.com",
			login: "other-login",
			avatar_url: "https://example.com/new.png",
		});

		expect(dbMock.select).toHaveBeenCalledTimes(2);
		expect(result).toEqual({
			name: "GitHub User",
			email: "github.user@example.com",
			image: "https://example.com/new.png",
			username: "github.user",
			displayUsername: "github.user",
			emailVerified: false,
		});
	});

	it("normalizes a matched legacy user email before handing it to Better Auth", async () => {
		dbMock.selectQueue.push([
			{
				id: "user-1",
				email: "Legacy.User@Example.COM",
				emailVerified: false,
				username: "legacy.user",
				displayUsername: "legacy.user",
				name: "Legacy User",
				image: "https://example.com/old.png",
			},
		]);

		const mapper = createProfileMapper({
			providerName: "Google",
			getImage: (profile) => profile.picture,
		});

		const result = await mapper({
			email: "legacy.user@example.com",
			name: "Provider Name",
			picture: "https://example.com/new.png",
		});

		expect(dbMock.update).toHaveBeenCalledTimes(1);
		expect(dbMock.updateSet).toHaveBeenCalledWith({ email: "legacy.user@example.com" });
		expect(result).toEqual({
			name: "Legacy User",
			email: "legacy.user@example.com",
			image: "https://example.com/new.png",
			username: "legacy.user",
			displayUsername: "legacy.user",
			emailVerified: false,
		});
	});

	it("does not update the user row when the matched email is already normalized", async () => {
		dbMock.selectQueue.push([
			{
				id: "user-1",
				email: "user@example.com",
				emailVerified: true,
				username: "user",
				displayUsername: "user",
				name: "User",
				image: null,
			},
		]);

		const mapper = createProfileMapper({ providerName: "Google" });

		const result = await mapper({ email: "USER@example.com", name: "Provider User" });

		expect(dbMock.update).not.toHaveBeenCalled();
		expect(result.email).toBe("user@example.com");
		expect(result.name).toBe("User");
	});

	it("allocates a provider username for a new social user", async () => {
		dbMock.selectQueue.push([], []);

		const mapper = createProfileMapper({
			providerName: "GitHub",
			getPreferredUsername: (profile) => profile.login,
			getName: (profile) => profile.name,
			getImage: (profile) => profile.avatar_url,
		});

		const result = await mapper({
			email: "New.User@Example.com",
			login: "Octo-Cat",
			name: "Octo Cat",
			avatar_url: "https://example.com/avatar.png",
		});

		expect(result).toEqual({
			name: "Octo Cat",
			email: "new.user@example.com",
			image: "https://example.com/avatar.png",
			username: "octo-cat",
			displayUsername: "octo-cat",
			emailVerified: true,
		});
	});

	it("rejects provider profiles without an email address", async () => {
		const mapper = createProfileMapper({ providerName: "GitHub" });

		await expect(mapper({ login: "octocat" })).rejects.toThrow("GitHub provider did not return an email address");
	});
});
