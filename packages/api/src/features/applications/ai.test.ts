import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

const lookupMock = vi.hoisted(() => vi.fn());
const requestMock = vi.hoisted(() => vi.fn());
const protectedProcedureMock = vi.hoisted(() => {
	const chain = {
		route: vi.fn(() => chain),
		input: vi.fn(() => chain),
		use: vi.fn(() => chain),
		output: vi.fn(() => chain),
		handler: vi.fn(() => chain),
	};
	return chain;
});

vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));
vi.mock("node:http", () => ({ request: requestMock }));
vi.mock("node:https", () => ({ request: requestMock }));
vi.mock("ai", () => ({ generateText: vi.fn() }));
vi.mock("../../context", () => ({ protectedProcedure: protectedProcedureMock }));
vi.mock("../../middleware/rate-limit", () => ({ aiRequestRateLimit: vi.fn() }));
vi.mock("../ai/service", () => ({ getModel: vi.fn() }));
vi.mock("../ai-providers/service", () => ({ aiProvidersService: { getDefaultRunnable: vi.fn() } }));
vi.mock("../resume/service", () => ({ resumeService: { getById: vi.fn(), create: vi.fn() } }));
vi.mock("./service", () => ({
	applicationService: { getById: vi.fn(), setAiResult: vi.fn(), update: vi.fn(), addNote: vi.fn() },
}));

const { autofillInputSchema, fetchJobPostingText } = await import("./ai");

function mockRequestResponse(statusCode: number, headers: Record<string, string>, body = "") {
	requestMock.mockImplementation((_url, _options, callback) => {
		const response = Readable.from(body ? [Buffer.from(body)] : []) as Readable & {
			statusCode: number;
			headers: Record<string, string>;
		};
		response.statusCode = statusCode;
		response.headers = headers;
		callback(response);
		return { on: vi.fn(), end: vi.fn() };
	});
}

describe("fetchJobPostingText", () => {
	beforeEach(() => {
		lookupMock.mockReset();
		requestMock.mockReset();
		vi.restoreAllMocks();
	});

	it("rejects private IP URLs before fetching", async () => {
		await expect(fetchJobPostingText("http://127.0.0.1/posting")).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(requestMock).not.toHaveBeenCalled();
	});

	it("rejects hostnames that resolve to private addresses", async () => {
		lookupMock.mockResolvedValue([{ address: "169.254.169.254", family: 4 }]);

		await expect(fetchJobPostingText("https://jobs.example/posting")).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(requestMock).not.toHaveBeenCalled();
	});

	it("converts DNS lookup failures to bad requests", async () => {
		lookupMock.mockRejectedValue(new Error("ENOTFOUND"));

		await expect(fetchJobPostingText("https://missing.example/posting")).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(requestMock).not.toHaveBeenCalled();
	});

	it("rejects redirects instead of following them", async () => {
		lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
		mockRequestResponse(302, { location: "/" });

		await expect(fetchJobPostingText("https://jobs.example/posting")).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	it("rejects oversized pages before reading the body", async () => {
		lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
		mockRequestResponse(200, { "content-length": "200001", "content-type": "text/html" }, "ignored");

		await expect(fetchJobPostingText("https://jobs.example/posting")).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	it("pins the request lookup to the validated public address", async () => {
		lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
		let pinnedAddress: string | undefined;
		requestMock.mockImplementation((_url, options, callback) => {
			options.lookup("jobs.example", {}, (_error: Error | null, address: string) => {
				pinnedAddress = address;
			});
			const response = Readable.from([
				Buffer.from("<html><script>nope</script><body><h1>Senior Engineer</h1></body></html>"),
			]) as Readable & {
				statusCode: number;
				headers: Record<string, string>;
			};
			response.statusCode = 200;
			response.headers = { "content-type": "text/html" };
			callback(response);
			return { on: vi.fn(), end: vi.fn() };
		});

		await expect(fetchJobPostingText("https://jobs.example/posting")).resolves.toBe("Senior Engineer");
		expect(pinnedAddress).toBe("93.184.216.34");
	});

	it("supports Node lookup calls with all=true", async () => {
		lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
		let lookupResult: unknown;
		requestMock.mockImplementation((_url, options, callback) => {
			options.lookup("jobs.example", { all: true }, (_error: Error | null, result: unknown) => {
				lookupResult = result;
			});
			const response = Readable.from([Buffer.from("<html><body>Senior Engineer</body></html>")]) as Readable & {
				statusCode: number;
				headers: Record<string, string>;
			};
			response.statusCode = 200;
			response.headers = { "content-type": "text/html" };
			callback(response);
			return { on: vi.fn(), end: vi.fn() };
		});

		await expect(fetchJobPostingText("https://jobs.example/posting")).resolves.toBe("Senior Engineer");
		expect(lookupResult).toEqual([{ address: "93.184.216.34", family: 4 }]);
	});
});

describe("autofillInputSchema", () => {
	it("rejects oversized pasted job descriptions", () => {
		expect(() => autofillInputSchema.parse({ jobDescription: "x".repeat(20_001) })).toThrow();
	});
});
