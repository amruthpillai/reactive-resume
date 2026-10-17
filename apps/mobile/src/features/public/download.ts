import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { fetch as expoFetch } from "expo/fetch";
import { client } from "@/api/client";
import { getAccessToken, getServer } from "@/auth/session";

export class PasswordExpiredError extends Error {}

const segment = encodeURIComponent;

/** The shared address on the server, `/{username}/{slug}`, as web's share button copies it. */
export const publicResumeUrl = (username: string, slug: string) =>
	`${getServer()}/${segment(username)}/${segment(slug)}`;

/**
 * Downloads the server-rendered PDF (`GET /api/resumes/{username}/{slug}/pdf`, as web's fallback does) and hands it to
 * the share sheet. A password unlock rides along in the native cookie store (`resume_access_<id>`, 10 minutes); the
 * bearer token, when signed in, lets owners download their own private resumes.
 */
export async function downloadPublicPdf(username: string, slug: string, fallbackName: string, dialogTitle: string) {
	const token = await getAccessToken();
	const response = await expoFetch(`${getServer()}/api/resumes/${segment(username)}/${segment(slug)}/pdf`, {
		credentials: "include",
		headers: token ? { authorization: `Bearer ${token}` } : {},
	});
	if (response.status === 401) throw new PasswordExpiredError();
	if (!response.ok) throw new Error(`Public PDF download failed with ${response.status}`);

	const disposition = response.headers.get("content-disposition") ?? "";
	const name = (/filename="([^"]+)"/.exec(disposition)?.[1] ?? `${fallbackName}.pdf`).replace(/[/\\:*?"<>|]/g, "-");
	const bytes = new Uint8Array(await response.arrayBuffer());
	// Each download gets its own folder, so the file keeps its readable name and never overwrites one a share target
	// may still be reading. Older downloads are swept at the next one; the latest stays, as an Android recipient can
	// still be reading it after shareAsync resolves.
	const root = new Directory(Paths.cache, "public-resume-pdf");
	if (root.exists)
		for (const entry of root
			.list()
			.toSorted((a, b) => b.name.localeCompare(a.name))
			.slice(1))
			try {
				entry.delete();
			} catch {
				// A file still held open is swept next time.
			}
	const folder = new Directory(
		root,
		`${String(Date.now()).padStart(15, "0")}-${Math.random().toString(36).slice(2, 8)}`,
	);
	folder.create({ intermediates: true });
	const file = new File(folder, name);
	file.write(bytes);
	await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle });
	void client.resume.statistics.recordDownload({ username, slug }).catch(() => undefined);
}
