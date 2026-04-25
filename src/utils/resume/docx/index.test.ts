import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { ResumeData } from "@/schema/resume/data";

import { defaultResumeData } from "@/schema/resume/data";

import { buildDocx } from "./index";

type BuiltDocument = { kind: "test-doc" };
type BuildDocument = (data: ResumeData) => BuiltDocument;
type ToBlob = (doc: BuiltDocument) => Promise<Blob>;

const buildDocumentMock = vi.fn<BuildDocument>();
const toBlobMock = vi.fn<ToBlob>();

vi.mock("./builder", () => ({
  buildDocument: buildDocumentMock,
}));

vi.mock("docx", () => ({
  Packer: {
    toBlob: toBlobMock,
  },
}));

describe("buildDocx", () => {
  const data: ResumeData = defaultResumeData;
  const builtDocument: BuiltDocument = { kind: "test-doc" };

  beforeEach(() => {
    buildDocumentMock.mockReset();
    toBlobMock.mockReset();
  });

  it("builds and packs a docx blob successfully", async () => {
    const blob = new Blob(["docx-content"], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    buildDocumentMock.mockReturnValueOnce(builtDocument);
    toBlobMock.mockResolvedValueOnce(blob);

    await expect(buildDocx(data)).resolves.toBe(blob);

    expect(buildDocumentMock).toHaveBeenCalledOnce();
    expect(buildDocumentMock).toHaveBeenCalledWith(data);
    expect(toBlobMock).toHaveBeenCalledOnce();
    expect(toBlobMock).toHaveBeenCalledWith(builtDocument);
  });

  it("rejects when the builder throws", async () => {
    const error = new Error("Failed to build document");
    buildDocumentMock.mockImplementationOnce(() => {
      throw error;
    });

    await expect(buildDocx(data)).rejects.toThrow("Failed to build document");
    expect(toBlobMock).not.toHaveBeenCalled();
  });

  it("rejects when docx packing fails", async () => {
    buildDocumentMock.mockReturnValueOnce(builtDocument);
    toBlobMock.mockRejectedValueOnce(new Error("Packer failed"));

    await expect(buildDocx(data)).rejects.toThrow("Packer failed");
    expect(buildDocumentMock).toHaveBeenCalledOnce();
    expect(toBlobMock).toHaveBeenCalledOnce();
  });
});
