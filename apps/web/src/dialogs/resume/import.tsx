import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { DialogProps } from "../store";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { DownloadSimpleIcon, FileIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { JSONResumeImporter } from "@reactive-resume/import/json-resume";
import { ReactiveResumeJSONImporter } from "@reactive-resume/import/reactive-resume-json";
import { ReactiveResumeV4JSONImporter } from "@reactive-resume/import/reactive-resume-v4-json";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@reactive-resume/ui/components/dialog";
import { FormControl, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { Combobox } from "@/components/ui/combobox";
import { useHasUsableAiProvider } from "@/features/settings/integrations/hooks/use-has-usable-ai-provider";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { client, orpc } from "@/libs/orpc/client";
import { useAppForm } from "@/libs/tanstack-form";
import { useDialogStore } from "../store";

const formSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal(""),
		file: z.undefined(),
	}),
	z.object({
		type: z.literal("pdf"),
		file: z.instanceof(File).refine((file) => file.type === "application/pdf", { message: "File must be a PDF" }),
	}),
	z.object({
		type: z.literal("docx"),
		file: z
			.instanceof(File)
			.refine(
				(file) =>
					file.type === "application/msword" ||
					file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				{ message: "File must be a Microsoft Word document" },
			),
	}),
	z.object({
		type: z.literal("reactive-resume-json"),
		file: z
			.instanceof(File)
			.refine((file) => file.type === "application/json", { message: "File must be a JSON file" }),
	}),
	z.object({
		type: z.literal("reactive-resume-v4-json"),
		file: z
			.instanceof(File)
			.refine((file) => file.type === "application/json", { message: "File must be a JSON file" }),
	}),
	z.object({
		type: z.literal("json-resume-json"),
		file: z
			.instanceof(File)
			.refine((file) => file.type === "application/json", { message: "File must be a JSON file" }),
	}),
]);

type FormValues = z.infer<typeof formSchema>;
type ImportType = FormValues["type"];

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			// remove data URL prefix (e.g., "data:application/pdf;base64," or "data:application/vnd...;base64,")
			resolve(result.split(",")[1]);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

// #7: sniff the source format from magic bytes + JSON shape rather than trusting the extension/MIME
// (multiple resume interchange formats share the .json extension). Returns "" when unrecognized.
async function detectImportType(file: File): Promise<ImportType> {
	const name = file.name.toLowerCase();
	const mime = file.type;

	const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
	const isPdf = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46; // "%PDF"
	const isZip = header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04; // "PK\x03\x04"

	if (isPdf || mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
	if (
		isZip ||
		mime === "application/msword" ||
		mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
		name.endsWith(".docx") ||
		name.endsWith(".doc")
	) {
		return "docx";
	}

	if (mime === "application/json" || name.endsWith(".json")) {
		try {
			return detectJsonImportType(JSON.parse(await file.text()));
		} catch {
			return "";
		}
	}

	return "";
}

export function detectJsonImportType(parsed: unknown): ImportType {
	if (!parsed || typeof parsed !== "object") return "";
	const data = parsed as Record<string, unknown>;

	// JSON Resume standard: top-level `basics`, without Reactive Resume's `sections`/`metadata`.
	if ("basics" in data && !("sections" in data) && !("metadata" in data)) return "json-resume-json";

	// Reactive Resume exports carry `sections` + `metadata`; the current schema's metadata has a `page` key,
	// the legacy v4 schema does not. Best-effort guess — the user can override the type below.
	if ("sections" in data || "metadata" in data) {
		const metadata = data.metadata as Record<string, unknown> | undefined;
		if (metadata && !("page" in metadata)) return "reactive-resume-v4-json";
		return "reactive-resume-json";
	}

	return "";
}

export function ImportResumeDialog(_: DialogProps<"resume.import">) {
	const navigate = useNavigate();
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const inputRef = useRef<HTMLInputElement>(null);
	const [isImporting, setIsImporting] = useState<boolean>(false);

	const { mutateAsync: importResume } = useMutation(orpc.resume.import.mutationOptions());
	const { hasUsableProvider, isLoading: isLoadingAiProviders } = useHasUsableAiProvider();

	const form = useAppForm({
		defaultValues: {
			type: "" as ImportType,
			file: undefined as File | undefined,
		},
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			if (value.type === "" || !value.file) return;

			setIsImporting(true);

			const toastId = toast.loading(t`Importing your resume...`, {
				description: t`This may take a few minutes, depending on the response of the AI provider. Please do not close the window or refresh the page.`,
			});

			try {
				let data: ResumeData | undefined;

				if (value.type === "json-resume-json") {
					const json = await value.file.text();
					const importer = new JSONResumeImporter();
					data = importer.parse(json);
				}

				if (value.type === "reactive-resume-json") {
					const json = await value.file.text();
					const importer = new ReactiveResumeJSONImporter();
					data = importer.parse(json);
				}

				if (value.type === "reactive-resume-v4-json") {
					const json = await value.file.text();
					const importer = new ReactiveResumeV4JSONImporter();
					data = importer.parse(json);
				}

				if (value.type === "pdf") {
					if (isLoadingAiProviders) throw new Error(t`Loading AI providers. Please try again in a moment.`);
					if (!hasUsableProvider)
						throw new Error(t`This feature requires a connected AI provider. Please set one up in the settings.`);

					const base64 = await fileToBase64(value.file);

					data = await client.ai.parsePdf({
						file: { name: value.file.name, data: base64 },
					});
				}

				if (value.type === "docx") {
					if (isLoadingAiProviders) throw new Error(t`Loading AI providers. Please try again in a moment.`);
					if (!hasUsableProvider)
						throw new Error(t`This feature requires a connected AI provider. Please set one up in the settings.`);

					const base64 = await fileToBase64(value.file);

					const mediaType =
						value.file.type === "application/msword"
							? ("application/msword" as const)
							: ("application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const);

					data = await client.ai.parseDocx({
						mediaType,
						file: { name: value.file.name, data: base64 },
					});
				}

				if (!data) {
					throw new Error(
						t({
							comment: "Error shown when AI import endpoint returns no parsed resume data",
							message: "No data was returned from the AI provider.",
						}),
					);
				}

				const id = await importResume({ data });
				toast.success(t`Your resume has been imported successfully.`, { id: toastId, description: null });
				closeDialog();
				void navigate({ to: "/builder/$resumeId", params: { resumeId: id } });
			} catch (error: unknown) {
				toast.error(
					getOrpcErrorMessage(error, {
						byCode: {
							BAD_REQUEST: t({
								comment: "Error shown when AI parsing returns invalid resume structure during import",
								message: "The imported file could not be parsed into a valid resume.",
							}),
							BAD_GATEWAY: t({
								comment: "Error shown when AI provider is unreachable during PDF/DOCX resume import",
								message: "Could not reach the AI provider. Please try again.",
							}),
						},
						fallback: t({
							comment: "Fallback toast when importing a resume fails for an unknown reason",
							message: "An unknown error occurred while importing your resume.",
						}),
					}),
					{ id: toastId, description: null },
				);
			} finally {
				setIsImporting(false);
			}
		},
	});

	const type = useStore(form.store, (s) => s.values.type);
	const file = useStore(form.store, (s) => s.values.file);
	const aiRequired = type === "pdf" || type === "docx";

	const onSelectFile = () => {
		if (!inputRef.current) return;
		inputRef.current.click();
	};

	const onUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const selected = e.target.files?.[0];
		if (!selected) return;
		form.setFieldValue("file", selected);
		// #7: pre-select the source format from the file's content; the user can still override below.
		form.setFieldValue("type", await detectImportType(selected));
	};

	// #6: only warn about unsaved changes once a file has actually been chosen — not on a bare type selection.
	useFormBlocker(form, { shouldBlock: () => Boolean(file) });

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<DownloadSimpleIcon />
					<Trans>Import an existing resume</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>
						Continue where you left off by importing an existing resume you created using Reactive Resume or any another
						resume builder. Supported formats include PDF, Microsoft Word, as well as JSON files from Reactive Resume.
					</Trans>
				</DialogDescription>
			</DialogHeader>

			<form
				className="space-y-4"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<form.Field name="file">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>File</Trans>
							</FormLabel>
							<FormControl>
								<Input type="file" className="hidden" ref={inputRef} onChange={onUploadFile} />

								<Button
									variant="outline"
									className="h-auto w-full flex-col border-dashed py-8 font-normal"
									onClick={onSelectFile}
								>
									{field.state.value ? (
										<>
											<FileIcon weight="thin" size={32} />
											<p>{field.state.value.name}</p>
										</>
									) : (
										<>
											<UploadSimpleIcon weight="thin" size={32} />
											<Trans>Click here to select a file to import</Trans>
										</>
									)}
								</Button>
							</FormControl>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				{file && (
					<form.Field name="type">
						{(field) => (
							<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
								<FormLabel>
									<Trans>Type</Trans>
								</FormLabel>
								<FormControl
									render={
										<Combobox
											showClear={false}
											value={field.state.value}
											onValueChange={(value) => field.handleChange(value as ImportType)}
											options={[
												{
													value: "reactive-resume-json",
													label: t({
														comment: "Import source option for current Reactive Resume JSON format",
														message: "Reactive Resume (JSON)",
													}),
												},
												{
													value: "reactive-resume-v4-json",
													label: t({
														comment: "Import source option for legacy Reactive Resume v4 JSON format",
														message: "Reactive Resume v4 (JSON)",
													}),
												},
												{
													value: "json-resume-json",
													label: t({
														comment: "Import source option for standard JSON Resume format",
														message: "JSON Resume",
													}),
												},
												{
													value: "pdf",
													textValue: t({ comment: "File format label in import source selector", message: "PDF" }),
													label: (
														<div className="flex items-center gap-x-2">
															{t({ comment: "File format label in import source selector", message: "PDF" })}{" "}
															<Badge>{t`AI`}</Badge>
														</div>
													),
												},
												{
													value: "docx",
													textValue: t({
														comment: "File format label in import source selector",
														message: "Microsoft Word",
													}),
													label: (
														<div className="flex items-center gap-x-2">
															{t({
																comment: "File format label in import source selector",
																message: "Microsoft Word",
															})}{" "}
															<Badge>{t`AI`}</Badge>
														</div>
													),
												},
											]}
										/>
									}
								/>
								{!field.state.value && (
									<p className="text-muted-foreground text-xs">
										<Trans>We couldn't detect the format automatically — please choose it above.</Trans>
									</p>
								)}
								<FormMessage errors={field.state.meta.errors} />
							</FormItem>
						)}
					</form.Field>
				)}

				{aiRequired && !isLoadingAiProviders && !hasUsableProvider && (
					<div className="flex flex-col gap-3 rounded-md border border-dashed p-3 text-sm lg:flex-row lg:items-center lg:justify-between">
						<span className="text-muted-foreground">
							<Trans>Importing from PDF or Word requires a connected AI provider.</Trans>
						</span>
						<Button
							size="sm"
							variant="secondary"
							nativeButton={false}
							render={<Link to="/dashboard/settings/integrations">{t`Set up a provider`}</Link>}
						/>
					</div>
				)}

				<DialogFooter>
					<Button type="submit" disabled={!type || !file || isImporting || (aiRequired && !hasUsableProvider)}>
						{isImporting ? <Spinner /> : null}
						{isImporting ? t`Importing…` : t`Import`}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
