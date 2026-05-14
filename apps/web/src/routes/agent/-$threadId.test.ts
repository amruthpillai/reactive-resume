import { describe, expect, it } from "vitest";
import {
	attachmentIdsFromTransportBody,
	attachmentToFilePart,
	buildAgentChatSubmission,
} from "./-helpers/chat-attachments";

describe("agent chat attachment helpers", () => {
	it("builds safe UI file parts without embedding file bytes", () => {
		expect(attachmentToFilePart({ id: "attachment-1", filename: "resume.pdf", mediaType: "application/pdf" })).toEqual({
			type: "file",
			url: "agent-attachment:attachment-1",
			mediaType: "application/pdf",
			filename: "resume.pdf",
		});
	});

	it("extracts only string attachment IDs from transport body metadata", () => {
		expect(attachmentIdsFromTransportBody({ attachmentIds: ["a", 1, "b", null] })).toEqual(["a", "b"]);
		expect(attachmentIdsFromTransportBody({ attachmentIds: "a" })).toBeUndefined();
		expect(attachmentIdsFromTransportBody(undefined)).toBeUndefined();
	});

	it("keeps attachment IDs in transport metadata while sending file parts in the UI message", () => {
		const submission = buildAgentChatSubmission("  Tailor this  ", [
			{ id: "attachment-1", filename: "job.txt", mediaType: "text/plain" },
			{ id: "attachment-2", filename: "portfolio.png", mediaType: "image/png" },
		]);

		expect(submission).toEqual({
			message: {
				text: "Tailor this",
				files: [
					{
						type: "file",
						url: "agent-attachment:attachment-1",
						mediaType: "text/plain",
						filename: "job.txt",
					},
					{
						type: "file",
						url: "agent-attachment:attachment-2",
						mediaType: "image/png",
						filename: "portfolio.png",
					},
				],
			},
			options: { body: { attachmentIds: ["attachment-1", "attachment-2"] } },
		});
	});

	it("supports attachment-only submissions", () => {
		const submission = buildAgentChatSubmission("   ", [
			{ id: "attachment-1", filename: "job.txt", mediaType: "text/plain" },
		]);

		expect(submission.message).toEqual({
			files: [
				{
					type: "file",
					url: "agent-attachment:attachment-1",
					mediaType: "text/plain",
					filename: "job.txt",
				},
			],
		});
		expect(submission.options).toEqual({ body: { attachmentIds: ["attachment-1"] } });
	});
});
