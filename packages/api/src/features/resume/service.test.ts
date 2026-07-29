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

const createRestoreHarness = (currentData: ResumeData, restoredData: ResumeData) => {
	const currentRow = { ...createResumeRow(currentData), stylesheetRevision: 3 };
	const versionLookup = {
		from: () => ({
			innerJoin: () => ({ where: () => Promise.resolve([{ data: restoredData }]) }),
		}),
	};
	const versionRetention = {
		from: () => ({ where: () => ({ orderBy: () => ({ limit: () => [] }) }) }),
	};
	dbMock.select
		.mockReturnValueOnce(versionLookup)
		.mockReturnValueOnce(createSelectChain([currentRow]))
		.mockReturnValueOnce(versionRetention)
		.mockReturnValueOnce(versionRetention);

	const snapshotValues = vi.fn(() => Promise.resolve());
	dbMock.insert.mockReturnValue({ values: snapshotValues });
	dbMock.delete.mockReturnValue({ where: () => Promise.resolve() });

	const lockedSelect = createLockedSelectChain([
		{
			data: currentData,
			isLocked: false,
			stylesheetRevision: 3,
			renderDataVersion: 7,
			updatedAt: currentRow.updatedAt,
		},
	]);
	let persistedData: ResumeData | undefined;
	const returning = vi.fn(() =>
		Promise.resolve([createResumeRow(persistedData ?? restoredData, new Date("2026-01-02T00:00:00Z"))]),
	);
	const where = vi.fn(() => ({ returning }));
	const set = vi.fn((values: { data: ResumeData }) => {
		persistedData = values.data;
		return { where };
	});
	dbMock.transaction.mockImplementationOnce(async (callback: (tx: unknown) => Promise<unknown>) =>
		callback({ select: () => lockedSelect.chain, update: () => ({ set }) }),
	);

	return { set, snapshotValues };
};

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

describe("create", () => {
	it("copies stylesheet content while leaving both concurrency versions at database defaults", async () => {
		const data = createSemanticResumeData();
		const values = vi.fn((_input: unknown) => Promise.resolve());
		dbMock.insert.mockReturnValueOnce({ values });

		await resumeService.create({
			userId: "u1",
			name: "Copy",
			slug: "copy",
			tags: [],
			locale: "en-US",
			data,
		});

		expect(values).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					metadata: expect.objectContaining({ stylesheet: data.metadata.stylesheet }),
				}),
			}),
		);
		expect(values.mock.calls[0]?.[0]).not.toHaveProperty("stylesheetRevision");
		expect(values.mock.calls[0]?.[0]).not.toHaveProperty("renderDataVersion");
	});
});

describe("versions.restore", () => {
	it.each([
		{ name: "changed render data", changeRenderData: true, expectedRenderDataVersion: 8 },
		{ name: "notes-only data", changeRenderData: false, expectedRenderDataVersion: undefined },
	])(
		"preserves canonical stylesheet state and snapshots the returned data for $name",
		async ({ changeRenderData, expectedRenderDataVersion }) => {
			const currentData = createSemanticResumeData();
			const restoredData: ResumeData = structuredClone(defaultResumeData);
			if (changeRenderData) {
				restoredData.basics.name = "Restored Name";
				restoredData.metadata.stylesheet = {
					mode: "semantic",
					source: { languageVersion: 1, text: "@rr-version 1;\nsection { color: #123456; }\n" },
					applied: { languageVersion: 1, text: "@rr-version 1;\nsection { color: #123456; }\n" },
				};
			} else {
				restoredData.metadata.notes = "Restored private note";
				restoredData.metadata.stylesheet = structuredClone(currentData.metadata.stylesheet);
			}

			const { set, snapshotValues } = createRestoreHarness(currentData, restoredData);
			const prepareData = vi.fn(async ({ data }: { data: ResumeData }) => data);

			const result = await resumeService.versions.restore({
				resumeId: "r1",
				versionId: "v1",
				userId: "u1",
				prepareData,
			});

			expect(set).toHaveBeenCalledTimes(1);
			expect(prepareData).toHaveBeenCalledWith({ data: restoredData, stylesheetRevision: 3 });
			expect(result.data.metadata.stylesheet).toEqual(restoredData.metadata.stylesheet);
			const updateValues = set.mock.calls[0]?.[0];
			expect(updateValues).toHaveProperty("stylesheetRevision", 4);
			if (expectedRenderDataVersion === undefined) {
				expect(updateValues).not.toHaveProperty("renderDataVersion");
			} else {
				expect(updateValues).toHaveProperty("renderDataVersion", expectedRenderDataVersion);
			}
			expect(snapshotValues).toHaveBeenNthCalledWith(1, {
				resumeId: "r1",
				userId: "u1",
				data: currentData,
				label: "Before restore",
			});
			expect(snapshotValues).toHaveBeenNthCalledWith(2, {
				resumeId: "r1",
				userId: "u1",
				data: result.data,
				label: "Restored version",
			});
		},
	);
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
			name: "stylesheet descendant target",
			op: "replace" as const,
			path: "/metadata/stylesheet/source/text",
			value: "@rr-version 1;\nresume { color: red; }\n",
		},
		{
			name: "stylesheet descendant copy source",
			op: "copy" as const,
			from: "/metadata/stylesheet/applied~1text",
			path: "/metadata/notes",
		},
		{
			name: "exact stylesheet move source",
			op: "move" as const,
			from: "/metadata/stylesheet",
			path: "/metadata/notes",
		},
		{
			name: "root target",
			op: "replace" as const,
			path: "",
			value: defaultResumeData,
		},
		{
			name: "metadata ancestor target",
			op: "replace" as const,
			path: "/metadata",
			value: defaultResumeData.metadata,
		},
		{
			name: "root copy source",
			op: "copy" as const,
			from: "",
			path: "/metadata/notes",
		},
		{
			name: "metadata ancestor move source",
			op: "move" as const,
			from: "/metadata",
			path: "/metadata/notes",
		},
	])("rejects $name before applying it", async ({ name: _name, ...operation }) => {
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

	it.each([
		{
			name: "path",
			operation: { op: "add" as const, path: "/metadata/~2stylesheet", value: "invalid escape" },
		},
		{
			name: "from",
			operation: {
				op: "copy" as const,
				from: "/metadata/notes~",
				path: "/metadata/notes",
			},
		},
	])("rejects malformed JSON Pointer escapes in $name before applying", async ({ operation }) => {
		const data = createSemanticResumeData();
		const { tx, update } = createPatchTx({
			data,
			isLocked: false,
			renderDataVersion: 2,
			updatedAt: new Date(),
		});

		const error = await resumeService
			.patchInTransaction(tx as never, {
				id: "r1",
				userId: "u1",
				operations: [operation],
			})
			.catch((caught: unknown) => caught);

		expect(error).toMatchObject({
			code: "INVALID_PATCH_OPERATIONS",
			message: expect.stringContaining("valid JSON Pointer"),
		});
		expect((error as { data: unknown }).data).toEqual({ index: 0, operation });
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

	it.each(["", "/metadata"])("rejects semantic style-rule changes through ancestor path %j", async (path) => {
		const data = createSemanticResumeData();
		const changedMetadata = { ...data.metadata, styleRules: [styleRule] };
		const value = path === "" ? { ...data, metadata: changedMetadata } : changedMetadata;
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
				operations: [{ op: "replace", path, value }],
			}),
		).rejects.toMatchObject({ code: "INVALID_PATCH_OPERATIONS" });
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

	it("allows a harmless sibling operation below metadata while preserving the server stylesheet", async () => {
		const data = createSemanticResumeData();
		const { tx, update } = createPatchTx({
			data,
			isLocked: false,
			renderDataVersion: 5,
			updatedAt: new Date(),
		});

		await resumeService.patchInTransaction(tx as never, {
			id: "r1",
			userId: "u1",
			operations: [{ op: "replace", path: "/metadata/notes", value: "private note" }],
		});

		expect(update.set).toHaveBeenCalledWith({
			data: expect.objectContaining({
				metadata: expect.objectContaining({
					notes: "private note",
					stylesheet: data.metadata.stylesheet,
				}),
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
