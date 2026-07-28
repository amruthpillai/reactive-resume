import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

// Characterization tests for the resume service. The goal is to pin down CURRENT behavior
// (CRUD / lock / password / statistics branching) so later changes are deliberate. The DB
// layer and side-effecting helpers are mocked; the branching in service.ts is what's under test.

const dbMock = vi.hoisted(() => ({
	select: vi.fn(),
	insert: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
	transaction: vi.fn(),
}));
const hashMock = vi.hoisted(() => vi.fn());
const compareMock = vi.hoisted(() => vi.fn());
const publishResumeUpdatedMock = vi.hoisted(() => vi.fn());
const grantResumeAccessMock = vi.hoisted(() => vi.fn());
const hasResumeAccessMock = vi.hoisted(() => vi.fn());
const storageDeleteMock = vi.hoisted(() => vi.fn());

vi.mock("@reactive-resume/db/client", () => ({ db: dbMock }));
vi.mock("@reactive-resume/db/schema", () => ({
	resume: {
		id: "id",
		userId: "user_id",
		slug: "slug",
		name: "name",
		tags: "tags",
		data: "data",
		isPublic: "is_public",
		isLocked: "is_locked",
		password: "password",
		stylesheetRevision: "stylesheet_revision",
		renderDataVersion: "render_data_version",
		updatedAt: "updated_at",
		createdAt: "created_at",
	},
	resumeStatistics: {
		resumeId: "resume_id",
		views: "views",
		downloads: "downloads",
		lastViewedAt: "last_viewed_at",
		lastDownloadedAt: "last_downloaded_at",
	},
	resumeStatisticsDaily: {
		resumeId: "resume_id",
		date: "date",
		views: "views",
		downloads: "downloads",
	},
	resumeVersion: {
		id: "id",
		resumeId: "resume_id",
		userId: "user_id",
		data: "data",
		label: "label",
		createdAt: "created_at",
	},
	resumeAnalysis: { resumeId: "resume_id", analysis: "analysis" },
	user: { id: "id", username: "username" },
}));
vi.mock("drizzle-orm", () => ({
	and: (...a: unknown[]) => a,
	arrayContains: (...a: unknown[]) => a,
	asc: (x: unknown) => x,
	desc: (x: unknown) => x,
	eq: (...a: unknown[]) => a,
	gte: (...a: unknown[]) => a,
	isNotNull: (...a: unknown[]) => a,
	notInArray: (...a: unknown[]) => a,
	sql: Object.assign((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }), {
		join: (values: unknown[]) => values,
	}),
}));
vi.mock("bcrypt", () => ({ hash: hashMock, compare: compareMock }));
vi.mock("./events", () => ({ publishResumeUpdated: publishResumeUpdatedMock }));
vi.mock("./access", () => ({
	grantResumeAccess: grantResumeAccessMock,
	hasResumeAccess: hasResumeAccessMock,
}));
vi.mock("../storage/service", () => ({
	getStorageService: () => ({ delete: storageDeleteMock }),
}));

const { resumeService } = await import("./service");

// A `db.update(...).set(...).where(...).returning(...)` chain that resolves to `rows`.
const createUpdateChain = (rows: unknown[]) => {
	const returning = vi.fn(() => Promise.resolve(rows));
	const where = vi.fn(() => ({ returning }));
	const set = vi.fn(() => ({ where }));
	return { chain: { set }, set, where, returning };
};

// A `db.select(...).from(...).where(...)` chain that resolves to `rows`.
const createSelectChain = (rows: unknown[]) => ({
	from: () => ({ where: () => Promise.resolve(rows) }),
});

const createLockedSelectChain = (rows: unknown[]) => {
	const forUpdate = vi.fn(() => Promise.resolve(rows));
	return {
		chain: { from: () => ({ where: () => ({ for: forUpdate }) }) },
		forUpdate,
	};
};

const createSemanticResumeData = (): ResumeData => {
	const data: ResumeData = structuredClone(defaultResumeData);
	data.metadata.stylesheet = {
		mode: "semantic",
		source: { languageVersion: 1, text: "@rr-version 1;\n" },
		applied: { languageVersion: 1, text: "@rr-version 1;\n" },
	};
	return data;
};

const createResumeRow = (data: ResumeData, updatedAt = new Date()) => ({
	id: "r1",
	name: "Resume",
	slug: "resume",
	tags: [],
	data,
	isPublic: false,
	isLocked: false,
	updatedAt,
	hasPassword: false,
});

beforeEach(() => {
	dbMock.select.mockReset();
	dbMock.insert.mockReset();
	dbMock.update.mockReset();
	dbMock.delete.mockReset();
	dbMock.transaction.mockReset();
	hashMock.mockReset();
	compareMock.mockReset();
	publishResumeUpdatedMock.mockReset();
	grantResumeAccessMock.mockReset();
	hasResumeAccessMock.mockReset();
	storageDeleteMock.mockReset();
	hashMock.mockResolvedValue("hashed-password");
	publishResumeUpdatedMock.mockResolvedValue(undefined);
	storageDeleteMock.mockResolvedValue(true);
});

it("imports", () => {
	expect(resumeService).toBeDefined();
});

describe("update", () => {
	it("throws RESUME_LOCKED when the pre-read reports the resume is locked", async () => {
		const select = createLockedSelectChain([
			{ data: defaultResumeData, isLocked: true, renderDataVersion: 0, updatedAt: new Date() },
		]);
		dbMock.transaction.mockImplementationOnce(async (callback: (tx: unknown) => Promise<unknown>) =>
			callback({ select: () => select.chain }),
		);

		await expect(resumeService.update({ id: "r1", userId: "u1", name: "New" })).rejects.toMatchObject({
			code: "RESUME_LOCKED",
		});
		expect(select.forUpdate).toHaveBeenCalledWith("update");
	});

	it("updates and returns the ordinary row inside one locked transaction", async () => {
		const row = {
			id: "r1",
			name: "New",
			slug: "slug",
			tags: [],
			data: {},
			isPublic: false,
			isLocked: false,
			updatedAt: new Date("2026-01-01T00:00:00Z"),
			hasPassword: false,
		};
		const select = createLockedSelectChain([
			{ data: defaultResumeData, isLocked: false, renderDataVersion: 0, updatedAt: row.updatedAt },
		]);
		const update = createUpdateChain([row]);
		dbMock.transaction.mockImplementationOnce(async (callback: (tx: unknown) => Promise<unknown>) =>
			callback({ select: () => select.chain, update: () => update.chain }),
		);

		const result = await resumeService.update({ id: "r1", userId: "u1", name: "New" });

		expect(result).toEqual(row);
		expect(dbMock.transaction).toHaveBeenCalledTimes(1);
		expect(select.forUpdate).toHaveBeenCalledWith("update");
		expect(publishResumeUpdatedMock).toHaveBeenCalledTimes(1);
	});

	it("throws NOT_FOUND when the UPDATE ... RETURNING matches no row", async () => {
		const select = createLockedSelectChain([
			{ data: defaultResumeData, isLocked: false, renderDataVersion: 0, updatedAt: new Date() },
		]);
		dbMock.transaction.mockImplementationOnce(async (callback: (tx: unknown) => Promise<unknown>) =>
			callback({ select: () => select.chain, update: () => createUpdateChain([]).chain }),
		);

		await expect(resumeService.update({ id: "r1", userId: "u1", name: "New" })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});

	it("maps a resume_slug_user_id_unique violation to RESUME_SLUG_ALREADY_EXISTS", async () => {
		const select = createLockedSelectChain([
			{ data: defaultResumeData, isLocked: false, renderDataVersion: 0, updatedAt: new Date() },
		]);
		const update = {
			set: () => ({
				where: () => ({
					returning: () => {
						const error = new Error("duplicate key") as Error & { cause: { constraint: string } };
						error.cause = { constraint: "resume_slug_user_id_unique" };
						return Promise.reject(error);
					},
				}),
			}),
		};
		dbMock.transaction.mockImplementationOnce(async (callback: (tx: unknown) => Promise<unknown>) =>
			callback({ select: () => select.chain, update: () => update }),
		);

		await expect(resumeService.update({ id: "r1", userId: "u1", slug: "taken" })).rejects.toMatchObject({
			code: "RESUME_SLUG_ALREADY_EXISTS",
		});
	});

	it("preserves the server stylesheet and increments render-data version once for visual changes", async () => {
		const serverData = createSemanticResumeData();
		const clientData: ResumeData = structuredClone(defaultResumeData);
		clientData.basics.name = "Changed";
		const row = createResumeRow(clientData);
		const select = createLockedSelectChain([
			{ data: serverData, isLocked: false, renderDataVersion: 3, updatedAt: row.updatedAt },
		]);
		const update = createUpdateChain([row]);
		dbMock.transaction.mockImplementationOnce(async (callback: (tx: unknown) => Promise<unknown>) =>
			callback({ select: () => select.chain, update: () => update.chain }),
		);

		await resumeService.update({ id: "r1", userId: "u1", data: clientData, skipAutoSnapshot: true });

		expect(update.set).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					metadata: expect.objectContaining({ stylesheet: serverData.metadata.stylesheet }),
				}),
				renderDataVersion: 4,
			}),
		);
	});

	it("does not increment render-data version for notes-only changes", async () => {
		const serverData: ResumeData = structuredClone(defaultResumeData);
		const clientData: ResumeData = structuredClone(defaultResumeData);
		clientData.metadata.notes = "private note";
		const row = createResumeRow(clientData);
		const select = createLockedSelectChain([
			{ data: serverData, isLocked: false, renderDataVersion: 3, updatedAt: row.updatedAt },
		]);
		const update = createUpdateChain([row]);
		dbMock.transaction.mockImplementationOnce(async (callback: (tx: unknown) => Promise<unknown>) =>
			callback({ select: () => select.chain, update: () => update.chain }),
		);

		await resumeService.update({ id: "r1", userId: "u1", data: clientData, skipAutoSnapshot: true });

		expect(update.set).toHaveBeenCalledWith(expect.not.objectContaining({ renderDataVersion: expect.anything() }));
	});
});

describe("patch", () => {
	const styleRule = {
		id: "rule",
		label: "Rule",
		enabled: true,
		target: { scope: "global" as const },
		slots: { heading: { color: "#000000" } },
	};

	const createPatchTx = (existing: {
		data: ResumeData;
		isLocked: boolean;
		renderDataVersion: number;
		updatedAt: Date;
	}) => {
		const lockedSelect = createLockedSelectChain([existing]);
		const row = createResumeRow(existing.data, existing.updatedAt);
		const update = createUpdateChain([row]);
		const versionSelect = {
			from: () => ({ where: () => ({ orderBy: () => ({ limit: () => [] }) }) }),
		};
		const tx = {
			select: vi.fn().mockReturnValueOnce(lockedSelect.chain).mockReturnValueOnce(versionSelect),
			update: vi.fn(() => update.chain),
			insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })),
			delete: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })),
		};

		return { tx, update };
	};

	it.each([
		{
			op: "replace" as const,
			path: "/metadata/stylesheet/source/text",
			value: "@rr-version 1;\nresume { color: red; }\n",
		},
		{
			op: "copy" as const,
			from: "/metadata/stylesheet/applied~1text",
			path: "/metadata/notes",
		},
		{
			op: "move" as const,
			from: "/metadata/stylesheet",
			path: "/metadata/notes",
		},
	])("rejects stylesheet paths and move/copy sources before applying them", async (operation) => {
		const data = createSemanticResumeData();
		const { tx, update } = createPatchTx({
			data,
			isLocked: false,
			renderDataVersion: 2,
			updatedAt: new Date(),
		});

		await expect(
			resumeService.patchInTransaction(tx as never, {
				id: "r1",
				userId: "u1",
				operations: [operation],
			}),
		).rejects.toMatchObject({
			code: "INVALID_PATCH_OPERATIONS",
			message: expect.stringContaining("server-owned stylesheet"),
		});
		expect(update.set).not.toHaveBeenCalled();
	});

	it("rejects legacy style-rule changes while semantic mode is active", async () => {
		const data = createSemanticResumeData();
		const { tx, update } = createPatchTx({
			data,
			isLocked: false,
			renderDataVersion: 2,
			updatedAt: new Date(),
		});

		await expect(
			resumeService.patchInTransaction(tx as never, {
				id: "r1",
				userId: "u1",
				operations: [{ op: "add", path: "/metadata/styleRules/-", value: styleRule }],
			}),
		).rejects.toMatchObject({
			code: "INVALID_PATCH_OPERATIONS",
			message: expect.stringContaining("Legacy style rules"),
		});
		expect(update.set).not.toHaveBeenCalled();
	});

	it("allows legacy style-rule changes and increments render-data version once", async () => {
		const data: ResumeData = structuredClone(defaultResumeData);
		const { tx, update } = createPatchTx({
			data,
			isLocked: false,
			renderDataVersion: 5,
			updatedAt: new Date(),
		});

		await resumeService.patchInTransaction(tx as never, {
			id: "r1",
			userId: "u1",
			operations: [{ op: "add", path: "/metadata/styleRules/-", value: styleRule }],
		});

		expect(update.set).toHaveBeenCalledWith(expect.objectContaining({ renderDataVersion: 6 }));
	});

	it("preserves the server stylesheet through an ancestor metadata replacement without bumping render data", async () => {
		const data = createSemanticResumeData();
		const { stylesheet: _stylesheet, ...clientMetadata } = data.metadata;
		const { tx, update } = createPatchTx({
			data,
			isLocked: false,
			renderDataVersion: 5,
			updatedAt: new Date(),
		});

		await resumeService.patchInTransaction(tx as never, {
			id: "r1",
			userId: "u1",
			operations: [{ op: "replace", path: "/metadata", value: clientMetadata }],
		});

		expect(update.set).toHaveBeenCalledWith({
			data: expect.objectContaining({
				metadata: expect.objectContaining({ stylesheet: data.metadata.stylesheet }),
			}),
		});
	});
});

describe("setLocked", () => {
	it("resolves and notifies on success (mutation: lock)", async () => {
		dbMock.update.mockReturnValueOnce(
			createUpdateChain([{ id: "r1", updatedAt: new Date("2026-01-01T00:00:00Z") }]).chain,
		);

		await expect(resumeService.setLocked({ id: "r1", userId: "u1", isLocked: true })).resolves.toBeUndefined();

		expect(publishResumeUpdatedMock).toHaveBeenCalledTimes(1);
		expect(publishResumeUpdatedMock).toHaveBeenCalledWith(expect.objectContaining({ mutation: "lock" }));
	});

	// Plan 003: no matching row now rejects with NOT_FOUND (previously a silent resolve).
	it("throws NOT_FOUND when no row matches, without notifying", async () => {
		dbMock.update.mockReturnValueOnce(createUpdateChain([]).chain);

		await expect(resumeService.setLocked({ id: "r1", userId: "u1", isLocked: true })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		expect(publishResumeUpdatedMock).not.toHaveBeenCalled();
	});
});

describe("setPassword", () => {
	it("hashes the password then resolves and notifies on success (mutation: password)", async () => {
		dbMock.update.mockReturnValueOnce(
			createUpdateChain([{ id: "r1", updatedAt: new Date("2026-01-01T00:00:00Z") }]).chain,
		);

		await expect(resumeService.setPassword({ id: "r1", userId: "u1", password: "secret" })).resolves.toBeUndefined();

		expect(hashMock).toHaveBeenCalledWith("secret", 10);
		expect(publishResumeUpdatedMock).toHaveBeenCalledTimes(1);
		expect(publishResumeUpdatedMock).toHaveBeenCalledWith(expect.objectContaining({ mutation: "password" }));
	});

	// Plan 003: no matching row now rejects with NOT_FOUND (previously a silent resolve).
	it("throws NOT_FOUND when no row matches, without notifying", async () => {
		dbMock.update.mockReturnValueOnce(createUpdateChain([]).chain);

		await expect(resumeService.setPassword({ id: "r1", userId: "u1", password: "secret" })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		expect(publishResumeUpdatedMock).not.toHaveBeenCalled();
	});
});

describe("removePassword", () => {
	it("resolves and notifies on success (mutation: password)", async () => {
		dbMock.update.mockReturnValueOnce(
			createUpdateChain([{ id: "r1", updatedAt: new Date("2026-01-01T00:00:00Z") }]).chain,
		);

		await expect(resumeService.removePassword({ id: "r1", userId: "u1" })).resolves.toBeUndefined();

		expect(publishResumeUpdatedMock).toHaveBeenCalledTimes(1);
		expect(publishResumeUpdatedMock).toHaveBeenCalledWith(expect.objectContaining({ mutation: "password" }));
	});

	// Plan 003: no matching row now rejects with NOT_FOUND (previously a silent resolve).
	it("throws NOT_FOUND when no row matches, without notifying", async () => {
		dbMock.update.mockReturnValueOnce(createUpdateChain([]).chain);

		await expect(resumeService.removePassword({ id: "r1", userId: "u1" })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		expect(publishResumeUpdatedMock).not.toHaveBeenCalled();
	});
});

describe("verifyPassword", () => {
	it("throws INVALID_PASSWORD when no matching row is found", async () => {
		dbMock.select.mockReturnValueOnce({
			from: () => ({ innerJoin: () => ({ where: () => Promise.resolve([]) }) }),
		});

		await expect(resumeService.verifyPassword({ slug: "s", username: "u", password: "p" })).rejects.toMatchObject({
			code: "INVALID_PASSWORD",
		});
	});

	it("throws INVALID_PASSWORD when bcrypt.compare returns false", async () => {
		dbMock.select.mockReturnValueOnce({
			from: () => ({ innerJoin: () => ({ where: () => Promise.resolve([{ id: "r1", password: "hash" }]) }) }),
		});
		compareMock.mockResolvedValueOnce(false);

		await expect(resumeService.verifyPassword({ slug: "s", username: "u", password: "p" })).rejects.toMatchObject({
			code: "INVALID_PASSWORD",
		});
	});

	it("returns true and grants access when bcrypt.compare returns true", async () => {
		dbMock.select.mockReturnValueOnce({
			from: () => ({ innerJoin: () => ({ where: () => Promise.resolve([{ id: "r1", password: "hash" }]) }) }),
		});
		compareMock.mockResolvedValueOnce(true);
		const responseHeaders = new Headers();

		const result = await resumeService.verifyPassword({
			slug: "s",
			username: "u",
			password: "p",
			responseHeaders,
		});

		expect(result).toBe(true);
		expect(grantResumeAccessMock).toHaveBeenCalledWith(responseHeaders, "r1", "hash");
	});
});

describe("delete", () => {
	const runTransaction = (tx: unknown) => {
		dbMock.transaction.mockImplementationOnce(async (cb: (tx: unknown) => Promise<unknown>) => cb(tx));
	};

	it("throws NOT_FOUND when the row is missing", async () => {
		runTransaction({
			select: () => createSelectChain([]),
		});

		await expect(resumeService.delete({ id: "r1", userId: "u1" })).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("throws RESUME_LOCKED when the row is locked", async () => {
		runTransaction({
			select: () => createSelectChain([{ isLocked: true }]),
		});

		await expect(resumeService.delete({ id: "r1", userId: "u1" })).rejects.toMatchObject({
			code: "RESUME_LOCKED",
		});
	});

	it("deletes storage for screenshot and pdf keys on success", async () => {
		const deleteWhere = vi.fn(() => Promise.resolve());
		runTransaction({
			select: () => createSelectChain([{ isLocked: false }]),
			delete: () => ({ where: deleteWhere }),
		});

		await resumeService.delete({ id: "r1", userId: "u1" });

		expect(deleteWhere).toHaveBeenCalledTimes(1);
		expect(storageDeleteMock).toHaveBeenCalledWith("uploads/u1/screenshots/r1");
		expect(storageDeleteMock).toHaveBeenCalledWith("uploads/u1/pdfs/r1");
		expect(publishResumeUpdatedMock).toHaveBeenCalledWith(expect.objectContaining({ mutation: "delete" }));
	});
});

describe("statistics.increment", () => {
	it("writes both resumeStatistics and resumeStatisticsDaily inside one transaction", async () => {
		const values = vi.fn(() => ({ onConflictDoUpdate: vi.fn(() => Promise.resolve()) }));
		const txInsert = vi.fn(() => ({ values }));
		dbMock.transaction.mockImplementationOnce(async (cb: (tx: unknown) => Promise<unknown>) =>
			cb({ insert: txInsert }),
		);

		await resumeService.statistics.increment({ id: "r1", views: true });

		expect(dbMock.transaction).toHaveBeenCalledTimes(1);
		expect(txInsert).toHaveBeenCalledTimes(2);
	});
});
