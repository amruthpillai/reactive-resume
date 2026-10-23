import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

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
	it("does not reuse a migrated GitHub account when only the login matches", async () => {
		dbMock.selectQueue.push(
			[
				{
					id: "user-1",
					accountId: "legacy-user-id",
					email: "Legacy.User@Example.COM",
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
		});
	});

	it("normalizes a matched legacy user email before handing it to Better Auth", async () => {
		dbMock.selectQueue.push([
			{
				id: "user-1",
				email: "Legacy.User@Example.COM",
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
		});
	});
});
