import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { downloadFromUrl, downloadWithAnchor, generateFilename } from "./file";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("generateFilename", () => {
  it("should slugify the prefix and append the extension", () => {
    expect(generateFilename("My Resume", "docx")).toBe("my-resume.docx");
  });

  it("should return slugified name without extension when none provided", () => {
    expect(generateFilename("My Resume")).toBe("my-resume");
  });

  it("should handle special characters in the prefix", () => {
    expect(generateFilename("John Doe - CS Base - Program Coordinator", "pdf")).toBe(
      "john-doe-cs-base-program-coordinator.pdf",
    );
  });

  it("should handle empty prefix", () => {
    expect(generateFilename("", "pdf")).toBe(".pdf");
  });
});

describe("downloadWithAnchor", () => {
  it("creates a link, clicks it, and revokes the object URL", () => {
    const blob = new Blob(["test-content"], { type: "text/plain" });
    const appendChildSpy = vi.spyOn(document.body, "appendChild");
    const removeChildSpy = vi.spyOn(document.body, "removeChild");
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob://test");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    downloadWithAnchor(blob, "resume.pdf");

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(appendChildSpy).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(removeChildSpy).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(4999);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob://test");
  });
});

describe("downloadFromUrl", () => {
  it("downloads from URL and triggers file download flow", async () => {
    const blob = new Blob(["payload"], { type: "text/plain" });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      blob: vi.fn<() => Promise<Blob>>().mockResolvedValue(blob),
    } as unknown as Response);
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob://from-url");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    vi.stubGlobal("fetch", fetchMock);

    await downloadFromUrl("https://example.com/resume", "resume.txt");

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/resume");
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(5000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob://from-url");
  });
});
