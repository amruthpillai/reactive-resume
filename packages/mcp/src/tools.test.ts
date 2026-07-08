// biome-ignore-all lint/style/noNonNullAssertion: These tests assert registered tool names before exercising handlers.
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	resolveUserFromRequestHeaders: vi.fn(),
	createResumePdfDownloadUrl: vi.fn(),
}));

vi.mock("@reactive-resume/api/context", () => ({
	resolveUserFromRequestHeaders: mocks.resolveUserFromRequestHeaders,
}));

vi.mock("@reactive-resume/api/features/resume/export", () => ({
	MAX_PDF_DOWNLOAD_URL_TTL_SECONDS: 600,
	createResumePdfDownloadUrl: mocks.createResumePdfDownloadUrl,
}));

vi.mock("@reactive-resume/env/server", () => ({
	env: {
		APP_URL: "https://example.com",
	},
}));

const { MCP_TOOL_NAME, registerTools } = await import("./tools");

type ToolHandler = (input: Record<string, unknown>) => Promise<{
	content: Array<{ type: "text"; text: string }>;
	isError?: boolean;
}>;

type Registration = {
	name: string;
	config: {
		title?: string;
		description?: string;
		inputSchema?: unknown;
	};
	handler: ToolHandler;
};

const makeFakeServer = () => {
	const registered: Registration[] = [];
	const server = {
		registerTool: vi.fn((name: string, config: Registration["config"], handler: ToolHandler) => {
			registered.push({ name, config, handler });
		}),
	};
	return { server, registered };
};

const clientMock = {
	resume: {
		getById: vi.fn(),
		list: vi.fn(),
		tags: { list: vi.fn() },
		analysis: { getById: vi.fn() },
		create: vi.fn(),
		import: vi.fn(),
		duplicate: vi.fn(),
		patch: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		setLocked: vi.fn(),
		statistics: { getById: vi.fn() },
	},
	applications: {
		list: vi.fn(),
		getById: vi.fn(),
		tags: vi.fn(),
		stats: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		addNote: vi.fn(),
		updateTimelineEntry: vi.fn(),
		deleteTimelineEntry: vi.fn(),
		delete: vi.fn(),
		bulkUpdate: vi.fn(),
		bulkDelete: vi.fn(),
		import: vi.fn(),
		attachDocument: vi.fn(),
		removeDocument: vi.fn(),
		ai: {
			autofill: vi.fn(),
			matchScore: vi.fn(),
			tailorResume: vi.fn(),
			draftMessage: vi.fn(),
		},
	},
};

describe("registerTools", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("registers a PDF download URL tool that validates access before signing", async () => {
		clientMock.resume.getById.mockResolvedValueOnce({ id: "resume-1", name: "Scizor" });
		mocks.resolveUserFromRequestHeaders.mockResolvedValueOnce({ id: "user-1" });
		mocks.createResumePdfDownloadUrl.mockReturnValueOnce({
			url: "https://example.com/api/resumes/resume-1/pdf?token=signed",
			expiresAt: "2026-06-01T10:10:00.000Z",
			expiresInSeconds: 600,
		});

		const requestHeaders = new Headers({ "x-api-key": "key" });
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, requestHeaders);

		const tool = registered.find((item) => item.name === "download_resume_pdf")!;
		const result = await tool.handler({ id: "resume-1" });
		const payload = JSON.parse(result.content[0]!.text);

		expect(tool.config.title).toBe("Download Resume PDF");
		expect(clientMock.resume.getById).toHaveBeenCalledWith({ id: "resume-1" });
		expect(mocks.resolveUserFromRequestHeaders).toHaveBeenCalledWith(requestHeaders);
		expect(mocks.createResumePdfDownloadUrl).toHaveBeenCalledWith({ resumeId: "resume-1", userId: "user-1" });
		expect(payload).toEqual({
			resumeId: "resume-1",
			name: "Scizor",
			downloadUrl: "https://example.com/api/resumes/resume-1/pdf?token=signed",
			expiresAt: "2026-06-01T10:10:00.000Z",
			expiresInSeconds: 600,
			contentType: "application/pdf",
		});
	});

	it("keeps the tool name stable", () => {
		expect(MCP_TOOL_NAME.downloadResumePdf).toBe("download_resume_pdf");
	});

	it("registers application tracker tools", () => {
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, new Headers());

		const names = registered.map((item) => item.name);
		expect(names).toContain("list_applications");
		expect(names).toContain("create_application");
		expect(names).toContain("attach_application_document");
		expect(names).toContain("draft_application_message");
	});

	it("lists applications as JSON", async () => {
		clientMock.applications.list.mockResolvedValueOnce([{ id: "app-1", company: "Acme", role: "Engineer" }]);
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, new Headers());

		const tool = registered.find((item) => item.name === "list_applications")!;
		const result = await tool.handler({ includeArchived: true, tags: ["remote"] });

		expect(clientMock.applications.list).toHaveBeenCalledWith({ includeArchived: true, tags: ["remote"] });
		expect(JSON.parse(result.content[0]!.text)).toEqual([{ id: "app-1", company: "Acme", role: "Engineer" }]);
	});

	it("creates applications through the router client", async () => {
		clientMock.applications.create.mockResolvedValueOnce("app-1");
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, new Headers());

		const tool = registered.find((item) => item.name === "create_application")!;
		const result = await tool.handler({
			company: "Acme",
			role: "Engineer",
			status: "saved",
			followUpAt: "2026-07-10T09:30:00.000Z",
		});

		expect(clientMock.applications.create).toHaveBeenCalledWith({
			company: "Acme",
			role: "Engineer",
			status: "saved",
			followUpAt: new Date("2026-07-10T09:30:00.000Z"),
		});
		expect(JSON.parse(result.content[0]!.text)).toEqual({ id: "app-1" });
	});

	it("updates applications with followUpAt coerced to Date", async () => {
		clientMock.applications.update.mockResolvedValueOnce({ id: "app-1", company: "Acme" });
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, new Headers());

		const tool = registered.find((item) => item.name === "update_application")!;
		await tool.handler({ id: "app-1", followUpAt: "2026-07-11T10:15:00.000Z" });

		expect(clientMock.applications.update).toHaveBeenCalledWith({
			id: "app-1",
			followUpAt: new Date("2026-07-11T10:15:00.000Z"),
		});
	});

	it("adds dated application notes through the router client", async () => {
		clientMock.applications.addNote.mockResolvedValueOnce({ id: "app-1", company: "Acme" });
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, new Headers());

		const tool = registered.find((item) => item.name === "add_application_note")!;
		await tool.handler({ id: "app-1", text: "Recruiter replied", date: "2026-07-12" });

		expect(clientMock.applications.addNote).toHaveBeenCalledWith({
			id: "app-1",
			text: "Recruiter replied",
			date: "2026-07-12",
		});
	});

	it("updates application timeline entries through the router client", async () => {
		clientMock.applications.updateTimelineEntry.mockResolvedValueOnce({ id: "app-1", company: "Acme" });
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, new Headers());

		const tool = registered.find((item) => item.name === "update_application_timeline_entry")!;
		await tool.handler({ id: "app-1", entryId: "entry-1", date: "2026-07-13", text: "Updated note" });

		expect(clientMock.applications.updateTimelineEntry).toHaveBeenCalledWith({
			id: "app-1",
			entryId: "entry-1",
			date: "2026-07-13",
			text: "Updated note",
		});
	});

	it("deletes application timeline entries through the router client", async () => {
		clientMock.applications.deleteTimelineEntry.mockResolvedValueOnce({ id: "app-1", company: "Acme" });
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, new Headers());

		const tool = registered.find((item) => item.name === "delete_application_timeline_entry")!;
		await tool.handler({ id: "app-1", entryId: "entry-1" });

		expect(clientMock.applications.deleteTimelineEntry).toHaveBeenCalledWith({
			id: "app-1",
			entryId: "entry-1",
		});
	});

	it("imports applications with followUpAt coerced to Date and null preserved", async () => {
		clientMock.applications.import.mockResolvedValueOnce({ imported: 2 });
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, new Headers());

		const tool = registered.find((item) => item.name === "import_applications")!;
		const result = await tool.handler({
			items: [
				{ company: "Acme", role: "Engineer", followUpAt: "2026-07-12T12:00:00.000Z" },
				{ company: "Beta", role: "Designer", followUpAt: null },
			],
		});

		expect(clientMock.applications.import).toHaveBeenCalledWith({
			items: [
				{ company: "Acme", role: "Engineer", followUpAt: new Date("2026-07-12T12:00:00.000Z") },
				{ company: "Beta", role: "Designer", followUpAt: null },
			],
		});
		expect(JSON.parse(result.content[0]!.text)).toEqual({ imported: 2 });
	});

	it("attaches a base64 PDF document through the router client", async () => {
		clientMock.applications.attachDocument.mockResolvedValueOnce({ id: "app-1", resumeFileName: "resume.pdf" });
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, new Headers());

		const tool = registered.find((item) => item.name === "attach_application_document")!;
		const result = await tool.handler({
			id: "app-1",
			kind: "resume",
			fileName: "resume.pdf",
			contentType: "application/pdf",
			dataBase64: Buffer.from("%PDF-1.4").toString("base64"),
		});

		const call = clientMock.applications.attachDocument.mock.calls[0]?.[0] as { file: File };
		expect(call.file).toBeInstanceOf(File);
		expect(call.file.name).toBe("resume.pdf");
		expect(call.file.type).toBe("application/pdf");
		expect(JSON.parse(result.content[0]!.text)).toEqual({ id: "app-1", resumeFileName: "resume.pdf" });
	});

	it("rejects non-PDF application document attachments before calling the client", async () => {
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, new Headers());

		const tool = registered.find((item) => item.name === "attach_application_document")!;
		const result = await tool.handler({
			id: "app-1",
			kind: "resume",
			fileName: "resume.txt",
			contentType: "text/plain",
			dataBase64: Buffer.from("hello").toString("base64"),
		});

		expect(result.isError).toBe(true);
		expect(clientMock.applications.attachDocument).not.toHaveBeenCalled();
	});
});
