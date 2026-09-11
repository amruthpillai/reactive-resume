import { describe, expect, it, vi } from "vitest";
import { rasterizePdf } from "./rasterize-pdf";

describe("rasterizePdf cleanup", () => {
	it("destroys the loading task when loading rejects", async () => {
		const destroy = vi.fn().mockResolvedValue(undefined);
		const loadDocument = vi.fn(() => ({ promise: Promise.reject(new Error("load failed")), destroy }));

		await expect(rasterizePdf(new Uint8Array(), { loadDocument })).rejects.toThrow("load failed");
		expect(destroy).toHaveBeenCalledOnce();
	});

	it("cleans up the page and destroys the loading task when rendering rejects", async () => {
		const cleanup = vi.fn();
		const destroy = vi.fn().mockResolvedValue(undefined);
		const page = {
			getViewport: vi.fn(() => ({ width: 10, height: 10 })),
			render: vi.fn(() => ({ promise: Promise.reject(new Error("render failed")) })),
			cleanup,
		};
		const document = { numPages: 1, getPage: vi.fn().mockResolvedValue(page) };
		const loadDocument = vi.fn(() => ({ promise: Promise.resolve(document), destroy }));

		await expect(rasterizePdf(new Uint8Array(), { loadDocument })).rejects.toThrow("render failed");
		expect(cleanup).toHaveBeenCalledOnce();
		expect(destroy).toHaveBeenCalledOnce();
	});
});
