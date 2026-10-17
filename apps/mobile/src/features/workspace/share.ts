import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

const PREFIX = "workspace-";

/**
 * Shares text as a file through the system share sheet (web's Download). The previous shared file is deleted first:
 * recipients have read it once `shareAsync` resolved.
 */
export async function shareText(fileName: string, body: string, mimeType: string, UTI: string) {
	for (const entry of Paths.cache.list()) {
		if (entry instanceof File && entry.name.startsWith(PREFIX)) entry.delete();
	}
	if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing unavailable");
	const file = new File(Paths.cache, `${PREFIX}${fileName.replace(/[^\w.-]+/g, "-")}`);
	await file.write(body);
	await Sharing.shareAsync(file.uri, { mimeType, UTI });
}
