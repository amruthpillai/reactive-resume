import type { FileUIPart } from "ai";

export type ChatAttachment = {
	id: string;
	filename: string;
	mediaType: string;
};

export function attachmentToFilePart(attachment: ChatAttachment): FileUIPart {
	return {
		type: "file",
		url: `agent-attachment:${attachment.id}`,
		mediaType: attachment.mediaType,
		filename: attachment.filename,
	};
}

export function attachmentIdsFromTransportBody(body: object | undefined) {
	return body && "attachmentIds" in body && Array.isArray(body.attachmentIds)
		? body.attachmentIds.filter((id): id is string => typeof id === "string")
		: undefined;
}

export function buildAgentChatSubmission(text: string, pendingAttachments: ChatAttachment[]) {
	const trimmedText = text.trim();
	const files = pendingAttachments.map(attachmentToFilePart);
	const attachmentIds = pendingAttachments.map((attachment) => attachment.id);
	const options = { body: { attachmentIds } };

	if (trimmedText) {
		return {
			message: files.length > 0 ? { text: trimmedText, files } : { text: trimmedText },
			options,
		};
	}

	return { message: { files }, options };
}
