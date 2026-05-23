import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { FilmStripIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import JSZip from "jszip";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { Alert, AlertDescription } from "@reactive-resume/ui/components/alert";
import { Separator } from "@reactive-resume/ui/components/separator";
import { client, orpc } from "@/libs/orpc/client";
import { DashboardHeader } from "../-components/header";
import { ImportTemplateButton } from "./-components/import-button";
import { TemplateGalleryGrid } from "./-components/template-grid";

export const searchSchema = z.object({
	resume: z.string().optional(),
});

export const Route = createFileRoute("/dashboard/templates/")({
	component: RouteComponent,
	validateSearch: searchSchema,
});

function RouteComponent() {
	const { resume: resumeId } = Route.useSearch();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>();

	const { data: resumeData } = useQuery({
		...orpc.resume.getById.queryOptions({ input: { id: resumeId! } }),
		enabled: !!resumeId,
		select: (data: { data: { metadata: { template: string } } }) => data.data.metadata.template,
	});

	useEffect(() => {
		if (resumeData) setActiveTemplateId(resumeData);
	}, [resumeData]);

	const { data: templates, isError } = useQuery(orpc.templates.list.queryOptions());

	const { mutateAsync: deleteTemplate } = useMutation(orpc.templates.deleteTemplate.mutationOptions());

	const onExport = async (id: string) => {
		const toastId = toast.loading(t`Exporting template…`);
		try {
			const record = await client.templates.exportTemplate({ id });
			const zip = new JSZip();
			for (const [path, content] of Object.entries(record.files as Record<string, string>)) {
				zip.file(path, content);
			}
			const blob = await zip.generateAsync({ type: "blob" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${id}.rxt`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success(t`Template exported.`, { id: toastId });
		} catch {
			toast.error(t`Failed to export template.`, { id: toastId });
		}
	};

	const onDelete = async (id: string) => {
		const confirmed = window.confirm(t`Delete this template? This cannot be undone.`);
		if (!confirmed) return;
		try {
			await deleteTemplate({ id });
			await queryClient.invalidateQueries({ queryKey: orpc.templates.list.queryOptions().queryKey });
			toast.success(t`Template deleted.`);
		} catch {
			toast.error(t`Failed to delete template.`);
		}
	};

	const onActivate = async (id: string) => {
		if (!resumeId) return;
		try {
			await client.resume.patch({
				id: resumeId,
				operations: [{ op: "replace", path: "/metadata/template", value: id }],
			});
			setActiveTemplateId(id);
			toast.success(t`Template applied.`);
			void navigate({ to: "/builder/$resumeId", params: { resumeId } });
		} catch {
			toast.error(t`Failed to apply template.`);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<DashboardHeader icon={FilmStripIcon} title={t`Templates`} />
				<ImportTemplateButton />
			</div>

			<Separator />

			{resumeId && (
				<Alert>
					<AlertDescription>
						<Trans>Selecting a template will apply it to your resume and return you to the builder.</Trans>
					</AlertDescription>
				</Alert>
			)}

			{isError && (
				<Alert variant="destructive">
					<AlertDescription>
						<Trans>Could not load templates. Please refresh.</Trans>
					</AlertDescription>
				</Alert>
			)}

			{templates && (
				<TemplateGalleryGrid
					templates={templates}
					activeTemplateId={activeTemplateId}
					resumeId={resumeId}
					onActivate={onActivate}
					onExport={onExport}
					onDelete={onDelete}
				/>
			)}
		</div>
	);
}
