import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { createResumePdfBlob } from "@/features/resume/export/pdf-document";

export type PublicResumePdfOptions = {
	publicResume: {
		username: string;
		slug: string;
	};
};

const fetchPublicResumePdf = async ({ username, slug }: PublicResumePdfOptions["publicResume"]) => {
	const response = await fetch(`/api/resumes/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/pdf`, {
		credentials: "include",
	});
	if (!response.ok) throw new Error(`Public PDF fallback failed with ${response.status}`);
	return response.blob();
};

export async function resolvePublicResumePdfBlob({
	data,
	publicResume,
}: PublicResumePdfOptions & { data: ResumeData }): Promise<Blob> {
	try {
		return await createResumePdfBlob(data);
	} catch {
		return fetchPublicResumePdf(publicResume);
	}
}
