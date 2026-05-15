import { beforeEach, describe, expect, it, vi } from "vitest";

const readMock = vi.fn();

vi.mock("@reactive-resume/api/features/storage", () => ({
	getStorageService: () => ({
		read: readMock,
	}),
}));

vi.mock("@reactive-resume/env/server", () => ({
	env: {
		APP_URL: "https://example.com",
	},
}));

const { handleUpload } = await import("./uploads");

describe("handleUpload", () => {
	beforeEach(() => {
		readMock.mockReset();
	});

	it("serves public upload keys", async () => {
		readMock.mockResolvedValueOnce({
			data: new TextEncoder().encode("image"),
			size: 5,
			contentType: "image/jpeg",
		});

		const response = await handleUpload(new Request("https://example.com/api/uploads/user-1/pictures/photo.jpeg"));

		expect(response.status).toBe(200);
		expect(readMock).toHaveBeenCalledWith("uploads/user-1/pictures/photo.jpeg");
		expect(response.headers.get("Content-Type")).toBe("image/jpeg");
	});

	it("does not serve private agent attachment keys through the public uploads route", async () => {
		readMock.mockResolvedValueOnce({
			data: new TextEncoder().encode("secret"),
			size: 6,
			contentType: "text/plain",
		});

		const response = await handleUpload(
			new Request("https://example.com/api/uploads/user-1/agent/thread-1/attachment.txt"),
		);

		expect(response.status).toBe(404);
		expect(readMock).not.toHaveBeenCalled();
	});
});
