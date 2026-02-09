import { ORPCError } from "@orpc/server";
import z from "zod";
import { protectedProcedure } from "../context";
import { getStorageService, isImageFile, processImageForUpload, uploadFile } from "../services/storage";

const storageService = getStorageService();

const fileSchema = z.file().max(10 * 1024 * 1024, "File size must be less than 10MB");

const filenameSchema = z.object({
	filename: z.string().min(1).describe("The path or filename of the file to delete."),
});

export const storageRouter = {
	uploadFile: protectedProcedure
		.route({
			tags: ["Internal"],
			operationId: "uploadFile",
			summary: "Upload a file",
			description:
				"Uploads a file to storage. Images are automatically resized and converted to WebP format. Maximum file size is 10MB. Requires authentication.",
			successDescription: "The file was uploaded successfully.",
		})
		.input(fileSchema)
		.output(
			z.object({
				url: z.string().describe("The public URL to access the uploaded file."),
				path: z.string().describe("The storage path of the uploaded file."),
				contentType: z.string().describe("The MIME type of the uploaded file."),
			}),
		)
		.handler(async ({ context, input: file }) => {
			const originalMimeType = file.type;
			const isImage = isImageFile(originalMimeType);

			let data: Uint8Array;
			let contentType: string;

			if (isImage) {
				const processed = await processImageForUpload(file);
				data = processed.data;
				contentType = processed.contentType;
			} else {
				const fileBuffer = await file.arrayBuffer();
				data = new Uint8Array(fileBuffer);
				contentType = originalMimeType;
			}

			const result = await uploadFile({
				userId: context.user.id,
				data,
				contentType,
				type: "picture",
			});

			return {
				url: result.url,
				path: result.key,
				contentType,
			};
		}),

	deleteFile: protectedProcedure
		.route({
			tags: ["Internal"],
			operationId: "deleteFile",
			summary: "Delete a file",
			description:
				"Deletes a file from storage by its filename or path. If the filename does not start with 'uploads/', the user's picture directory is assumed. Requires authentication.",
			successDescription: "The file was deleted successfully.",
		})
		.input(filenameSchema)
		.output(z.void())
		.errors({
			NOT_FOUND: {
				message: "The specified file was not found in storage.",
				status: 404,
			},
		})
		.handler(async ({ context, input }): Promise<void> => {
			// The filename is now the full path from the URL (e.g., "uploads/userId/pictures/timestamp.webp")
			// We need to extract just the path portion that matches the storage key
			const key = input.filename.startsWith("uploads/")
				? input.filename
				: `uploads/${context.user.id}/pictures/${input.filename}`;

			const deleted = await storageService.delete(key);

			if (!deleted) throw new ORPCError("NOT_FOUND");
		}),
};
