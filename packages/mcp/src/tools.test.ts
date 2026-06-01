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
	PDF_DOWNLOAD_URL_EXPIRES_IN_SECONDS: 600,
	createResumePdfDownloadUrl: mocks.createResumePdfDownloadUrl,
}));

vi.mock("@reactive-resume/env/server", () => ({
	env: {
		APP_URL: "https://example.com",
	},
}));

const { MCP_TOOL_NAME, registerTools } = await import("./tools");

type ToolHandler = (input: { id: string }) => Promise<{
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
});
