import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { TemplateMetadata } from "@reactive-resume/schema/template-metadata";
import { render } from "@reactive-resume/renderer";

type BuilderPreviewRequestBody = {
	files: Record<string, string>;
	data: ResumeData;
	metadata: TemplateMetadata;
	templateId: string;
	baseUrl: string;
};

export async function handleBuilderPreview(request: Request): Promise<Response> {
	if (request.method !== "POST") {
		return new Response("Method Not Allowed", {
			status: 405,
			headers: { Allow: "POST" },
		});
	}

	let body: BuilderPreviewRequestBody;

	try {
		body = await request.json();
	} catch {
		return new Response("Invalid JSON body", { status: 400 });
	}

	const { files, data, metadata, templateId, baseUrl } = body;

	if (!files || typeof files !== "object") {
		return new Response("Missing or invalid 'files' field", { status: 400 });
	}

	if (!data || !metadata || !templateId || !baseUrl) {
		return new Response("Missing required fields: data, metadata, templateId, baseUrl", {
			status: 400,
		});
	}

	try {
		const html = render(files, data, metadata, templateId, baseUrl);

		return new Response(html, {
			headers: { "Content-Type": "text/html; charset=UTF-8" },
		});
	} catch (error) {
		console.error("[Builder Preview] Render error:", error);
		return new Response("Failed to render preview", { status: 500 });
	}
}
