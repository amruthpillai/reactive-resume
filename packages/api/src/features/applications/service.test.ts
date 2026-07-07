import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the DB layer; the logic under test is the activity-timeline bookkeeping, not SQL.
const dbMock = vi.hoisted(() => ({
	select: vi.fn(),
	insert: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
}));
const resumeGetByIdMock = vi.hoisted(() => vi.fn());
const storageDeleteMock = vi.hoisted(() => vi.fn());
const uploadFileMock = vi.hoisted(() => vi.fn());

vi.mock("@reactive-resume/db/client", () => ({ db: dbMock }));
vi.mock("@reactive-resume/db/schema", () => ({
	application: {
		id: "id",
		userId: "user_id",
		status: "status",
		updatedAt: "updated_at",
		resumeFileUrl: "resume_file_url",
		coverLetterUrl: "cover_letter_url",
	},
}));
vi.mock("drizzle-orm", () => ({
	and: (...a: unknown[]) => a,
	arrayContains: (...a: unknown[]) => a,
	desc: (x: unknown) => x,
	eq: (...a: unknown[]) => a,
	inArray: (...a: unknown[]) => a,
	sql: Object.assign((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }), {
		join: (values: unknown[]) => values,
	}),
}));
vi.mock("../resume/service", () => ({
	resumeService: { getById: resumeGetByIdMock },
}));
vi.mock("../storage/service", () => ({
	getStorageService: () => ({ delete: storageDeleteMock }),
	uploadFile: uploadFileMock,
}));

const { applicationService } = await import("./service");

const existing = {
	id: "app-1",
	userId: "user-1",
	company: "Stripe",
	role: "Engineer",
	status: "saved" as const,
	activity: [{ id: "e0", type: "created" as const, text: "Added to Saved", at: new Date() }],
	resumeFileUrl: "http://localhost:3000/api/uploads/user-1/pictures/resume.pdf",
	coverLetterUrl: "/api/uploads/user-1/pictures/cover.pdf",
};

const createSelectChain = (rows: unknown[]) => ({
	from: () => ({
		where: () => Promise.resolve(rows),
	}),
});

const setSelectResults = (...results: unknown[][]) => {
	dbMock.select.mockReset();
	for (const rows of results) {
		dbMock.select.mockReturnValueOnce(createSelectChain(rows));
	}
	dbMock.select.mockReturnValue(createSelectChain([]));
};

beforeEach(() => {
	dbMock.insert.mockReset();
	dbMock.update.mockReset();
	dbMock.delete.mockReset();
	resumeGetByIdMock.mockReset();
	storageDeleteMock.mockReset();
	uploadFileMock.mockReset();
	resumeGetByIdMock.mockResolvedValue({ id: "resume-1" });
	storageDeleteMock.mockResolvedValue(true);
	uploadFileMock.mockResolvedValue({
		url: "/api/uploads/user-1/pictures/new.pdf",
		key: "uploads/user-1/pictures/new.pdf",
	});
	setSelectResults([{ ...existing }]);
});

describe("applicationService.create", () => {
	it("seeds a 'created' activity event", async () => {
		const values = vi.fn(() => Promise.resolve());
		dbMock.insert.mockReturnValue({ values });

		await applicationService.create({ userId: "user-1", company: "Stripe", role: "Engineer", status: "applied" });

		const [[inserted]] = values.mock.calls as unknown as [[{ activity: { type: string }[] }]];
		expect(inserted.activity).toHaveLength(1);
		expect(inserted.activity.at(0)?.type).toBe("created");
	});

	it("checks linked resume ownership before inserting", async () => {
		const values = vi.fn(() => Promise.resolve());
		dbMock.insert.mockReturnValue({ values });

		await applicationService.create({
			userId: "user-1",
			company: "Stripe",
			role: "Engineer",
			resumeId: "resume-1",
		});

		expect(resumeGetByIdMock).toHaveBeenCalledWith({ id: "resume-1", userId: "user-1" });
		expect(values).toHaveBeenCalled();
	});
});

describe("applicationService.update", () => {
	const captureSet = () => {
		const set = vi.fn(() => ({ where: () => ({ returning: () => Promise.resolve([{ ...existing }]) }) }));
		dbMock.update.mockReturnValue({ set });
		return set;
	};

	it("appends a 'stage' event when the status changes", async () => {
		const set = captureSet();
		await applicationService.update({ id: "app-1", userId: "user-1", status: "applied" });

		const [[arg]] = set.mock.calls as unknown as [[{ activity: unknown }]];
		expect(arg.activity).toBeDefined();
	});

	it("does not rewrite activity when the status is unchanged", async () => {
		const set = captureSet();
		await applicationService.update({ id: "app-1", userId: "user-1", notes: "hello" });

		const [[arg]] = set.mock.calls as unknown as [[{ activity?: unknown }]];
		expect(arg.activity).toBeUndefined();
	});

	it("checks linked resume ownership before updating", async () => {
		captureSet();
		await applicationService.update({ id: "app-1", userId: "user-1", resumeId: "resume-1" });

		expect(resumeGetByIdMock).toHaveBeenCalledWith({ id: "resume-1", userId: "user-1" });
	});
});

describe("applicationService.delete", () => {
	it("deletes owned uploaded attachments after deleting the application", async () => {
		dbMock.delete.mockReturnValue({
			where: () => ({ returning: () => Promise.resolve([{ id: "app-1" }]) }),
		});

		await applicationService.delete({ id: "app-1", userId: "user-1" });

		expect(storageDeleteMock).toHaveBeenCalledWith("uploads/user-1/pictures/resume.pdf");
		expect(storageDeleteMock).toHaveBeenCalledWith("uploads/user-1/pictures/cover.pdf");
	});
});

describe("applicationService.attachDocument", () => {
	it("uploads a PDF resume document and stores it on the application", async () => {
		setSelectResults([{ ...existing }], [{ ...existing }], []);
		const set = vi.fn(() => ({ where: () => ({ returning: () => Promise.resolve([{ ...existing }]) }) }));
		dbMock.update.mockReturnValue({ set });

		await applicationService.attachDocument({
			id: "app-1",
			userId: "user-1",
			kind: "resume",
			fileName: "sent-resume.pdf",
			contentType: "application/pdf",
			data: new Uint8Array([1, 2, 3]),
		});

		expect(uploadFileMock).toHaveBeenCalledWith({
			userId: "user-1",
			contentType: "application/pdf",
			data: new Uint8Array([1, 2, 3]),
		});
		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({
				resumeFileUrl: "/api/uploads/user-1/pictures/new.pdf",
				resumeFileName: "sent-resume.pdf",
			}),
		);
	});

	it("rejects non-PDF documents before upload", async () => {
		await expect(
			applicationService.attachDocument({
				id: "app-1",
				userId: "user-1",
				kind: "cover-letter",
				fileName: "cover.txt",
				contentType: "text/plain",
				data: new Uint8Array([1]),
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });

		expect(uploadFileMock).not.toHaveBeenCalled();
	});

	it("does not delete the replaced upload when another application still references it", async () => {
		setSelectResults(
			[{ ...existing }],
			[{ ...existing }],
			[
				{
					id: "app-2",
					resumeFileUrl: existing.resumeFileUrl,
					coverLetterUrl: null,
				},
			],
		);
		const set = vi.fn(() => ({ where: () => ({ returning: () => Promise.resolve([{ ...existing }]) }) }));
		dbMock.update.mockReturnValue({ set });

		await applicationService.attachDocument({
			id: "app-1",
			userId: "user-1",
			kind: "resume",
			fileName: "sent-resume.pdf",
			contentType: "application/pdf",
			data: new Uint8Array([1, 2, 3]),
		});

		expect(storageDeleteMock).not.toHaveBeenCalledWith("uploads/user-1/pictures/resume.pdf");
	});
});

describe("applicationService.removeDocument", () => {
	it("clears and deletes an owned cover letter document", async () => {
		setSelectResults([{ ...existing }], [{ ...existing }], []);
		const set = vi.fn(() => ({ where: () => ({ returning: () => Promise.resolve([{ ...existing }]) }) }));
		dbMock.update.mockReturnValue({ set });

		await applicationService.removeDocument({ id: "app-1", userId: "user-1", kind: "cover-letter" });

		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({
				coverLetterUrl: null,
				coverLetterName: null,
			}),
		);
		expect(storageDeleteMock).toHaveBeenCalledWith("uploads/user-1/pictures/cover.pdf");
	});

	it("does not delete a removed upload while another application still references it", async () => {
		setSelectResults(
			[{ ...existing }],
			[{ ...existing }],
			[
				{
					id: "app-2",
					resumeFileUrl: null,
					coverLetterUrl: existing.coverLetterUrl,
				},
			],
		);
		const set = vi.fn(() => ({ where: () => ({ returning: () => Promise.resolve([{ ...existing }]) }) }));
		dbMock.update.mockReturnValue({ set });

		await applicationService.removeDocument({ id: "app-1", userId: "user-1", kind: "cover-letter" });

		expect(storageDeleteMock).not.toHaveBeenCalledWith("uploads/user-1/pictures/cover.pdf");
	});
});

describe("applicationService.bulkDelete", () => {
	it("deletes uploaded attachments for deleted owned applications", async () => {
		setSelectResults(
			[
				{ ...existing, id: "app-1" },
				{
					...existing,
					id: "app-2",
					resumeFileUrl: "http://localhost:3000/api/uploads/user-2/pictures/ignored.pdf",
					coverLetterUrl: null,
				},
			],
			[],
		);
		dbMock.delete.mockReturnValue({
			where: () => ({ returning: () => Promise.resolve([{ id: "app-1" }, { id: "app-2" }]) }),
		});

		const result = await applicationService.bulkDelete({ userId: "user-1", ids: ["app-1", "app-2"] });

		expect(result).toEqual({ deleted: 2 });
		expect(storageDeleteMock).toHaveBeenCalledWith("uploads/user-1/pictures/resume.pdf");
		expect(storageDeleteMock).toHaveBeenCalledWith("uploads/user-1/pictures/cover.pdf");
		expect(storageDeleteMock).not.toHaveBeenCalledWith("uploads/user-2/pictures/ignored.pdf");
	});
});
