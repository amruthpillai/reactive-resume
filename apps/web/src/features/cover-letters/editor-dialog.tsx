import type { CoverLetter } from "@reactive-resume/schema/cover-letter/data";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientOnly, useBlocker } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useId, useMemo, useRef, useState } from "react";
import { createCoverLetterResumeData } from "@reactive-resume/resume/cover-letter";
import { Button } from "@reactive-resume/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@reactive-resume/ui/components/dialog";
import { Label } from "@reactive-resume/ui/components/label";
import { Separator } from "@reactive-resume/ui/components/separator";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { toast } from "@reactive-resume/ui/components/toast";
import { downloadWithAnchor, generateFilename } from "@reactive-resume/utils/file";
import { Combobox } from "@/components/ui/combobox";
import { useConfirm } from "@/hooks/use-confirm";
import { getReadableErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";
import { CoverLetterEditor } from "./editor";

const PdfViewer = lazy(() =>
	import("@/features/resume/public/pdf-viewer").then((module) => ({ default: module.PdfViewer })),
);

type CoverLetterEditorDialogProps = {
	letterId: string;
	onClose: () => void;
	activeResumeId?: string;
	resumeReady?: boolean;
};

export function CoverLetterEditorDialog({
	letterId,
	onClose,
	activeResumeId,
	resumeReady = true,
}: CoverLetterEditorDialogProps) {
	const queryClient = useQueryClient();
	const confirm = useConfirm();
	const [editState, setEditState] = useState({ dirty: false, pending: false });
	const [reloadVersion, setReloadVersion] = useState(0);
	const [busy, setBusy] = useState(false);
	const running = useRef(false);
	const query = useQuery(orpc.coverLetters.getById.queryOptions({ input: { id: letterId } }));
	const onDirtyChange = useCallback((dirty: boolean, pending: boolean) => setEditState({ dirty, pending }), []);

	const canClose = () => {
		if (editState.pending || running.current) return false;
		if (!editState.dirty) return true;
		return confirm(t`Discard unsaved changes?`, {
			description: t`Your saved cover letter will remain unchanged.`,
			confirmText: t`Discard`,
			cancelText: t`Keep editing`,
		});
	};
	const requestClose = async () => {
		if (await canClose()) onClose();
	};
	useBlocker({
		shouldBlockFn: async () => !(await canClose()),
		enableBeforeUnload: editState.dirty || editState.pending || busy,
	});

	const remember = (letter: CoverLetter) => {
		queryClient.setQueryData(orpc.coverLetters.getById.queryKey({ input: { id: letter.id } }), letter);
		void queryClient.invalidateQueries({ queryKey: orpc.coverLetters.list.key() });
	};
	const run = async (action: () => Promise<void>) => {
		if (running.current) return;
		running.current = true;
		setBusy(true);
		try {
			await action();
		} catch (error) {
			toast.add({
				type: "error",
				description: getReadableErrorMessage(error, t`Could not complete this action. Please try again.`),
			});
		} finally {
			running.current = false;
			setBusy(false);
		}
	};
	const reload = async () => {
		if (!(await canClose())) return;
		await run(async () => {
			remember(await orpc.coverLetters.getById.call({ id: letterId }));
			setReloadVersion((version) => version + 1);
		});
	};

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) void requestClose();
			}}
		>
			<DialogContent className="lg:max-w-3xl xl:max-w-4xl" showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>
						<Trans>Edit cover letter</Trans>
					</DialogTitle>
					<DialogDescription>
						<Trans>Changes are shared between your library and the resume builder.</Trans>
					</DialogDescription>
				</DialogHeader>
				{query.isPending ? (
					<Spinner />
				) : query.error ? (
					<div className="space-y-3">
						<p role="alert">{getReadableErrorMessage(query.error, t`Could not load this cover letter.`)}</p>
						<Button onClick={() => void query.refetch()}>
							<Trans>Retry</Trans>
						</Button>
						<Button variant="outline" onClick={onClose}>
							<Trans>Close</Trans>
						</Button>
					</div>
				) : (
					<>
						<CoverLetterEditor
							key={`${letterId}:${reloadVersion}`}
							letter={query.data}
							disabled={busy}
							onClose={() => void requestClose()}
							onDirtyChange={onDirtyChange}
							onSave={async (changes) => {
								const updated = await orpc.coverLetters.update.call({ id: letterId, ...changes });
								remember(updated);
								return updated;
							}}
							actions={(letter, disabled) => (
								<CoverLetterActions
									letter={letter}
									activeResumeId={activeResumeId}
									resumeReady={resumeReady}
									disabled={disabled || busy}
									run={run}
									onUpdated={remember}
									onDeleted={onClose}
								/>
							)}
						/>
						<Button variant="ghost" disabled={editState.pending || busy} onClick={() => void reload()}>
							<Trans>Reload latest version</Trans>
						</Button>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}

type CoverLetterActionsProps = {
	letter: CoverLetter;
	activeResumeId?: string;
	resumeReady: boolean;
	disabled: boolean;
	run: (action: () => Promise<void>) => Promise<void>;
	onUpdated: (letter: CoverLetter) => void;
	onDeleted: () => void;
};

function CoverLetterActions({
	letter,
	activeResumeId,
	resumeReady,
	disabled,
	run,
	onUpdated,
	onDeleted,
}: CoverLetterActionsProps) {
	const queryClient = useQueryClient();
	const confirm = useConfirm();
	const styleId = useId();
	const applicationId = useId();
	const [resumeId, setResumeId] = useState<string | null>(letter.sourceResumeId);
	const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(letter.sourceApplicationId);
	const [preview, setPreview] = useState(false);
	const sourceReady = resumeId !== activeResumeId || resumeReady;
	const resumes = useQuery(orpc.resume.list.queryOptions({ input: {} }));
	const applications = useQuery(orpc.applications.list.queryOptions({ input: { includeArchived: false } }));
	const data = useMemo(() => createCoverLetterResumeData(letter), [letter]);
	const createPdf = async () => {
		const { createResumePdfBlob } = await import("@/features/resume/export/pdf-document");
		return createResumePdfBlob(data, undefined, { includeCoverLetterHeader: true });
	};

	return (
		<div className="space-y-4">
			<Separator />
			<fieldset disabled={disabled} className="min-w-0 space-y-4">
				<div className="flex flex-wrap gap-2">
					<Button type="button" variant="outline" onClick={() => setPreview(!preview)}>
						{preview ? <Trans>Hide preview</Trans> : <Trans>Preview PDF</Trans>}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() =>
							void run(async () => downloadWithAnchor(await createPdf(), generateFilename(letter.name, "pdf")))
						}
					>
						<Trans>Download PDF</Trans>
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() =>
							void run(async () => {
								const document = await orpc.coverLetters.export.call({ id: letter.id });
								downloadWithAnchor(
									new Blob([JSON.stringify(document, null, 2)], { type: "application/json" }),
									generateFilename(letter.name, "json"),
								);
							})
						}
					>
						<Trans>Export JSON</Trans>
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() =>
							void run(async () => {
								await orpc.coverLetters.duplicate.call({ id: letter.id });
								await queryClient.invalidateQueries({ queryKey: orpc.coverLetters.list.key() });
								toast.add({ type: "success", description: t`Copy saved to your cover-letter library.` });
							})
						}
					>
						<Trans>Duplicate</Trans>
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={() =>
							void run(async () => {
								if (
									!(await confirm(t`Delete this cover letter?`, {
										description: t`PDFs already attached to applications will remain available.`,
										confirmText: t`Delete`,
									}))
								)
									return;
								await orpc.coverLetters.delete.call({ id: letter.id, expectedRevision: letter.revision });
								await queryClient.invalidateQueries({ queryKey: orpc.coverLetters.list.key() });
								onDeleted();
							})
						}
					>
						<Trans>Delete</Trans>
					</Button>
				</div>
				<div className="space-y-2">
					<Label htmlFor={styleId}>
						<Trans>Resume styling</Trans>
					</Label>
					<div className="flex flex-wrap gap-2">
						<Combobox
							id={styleId}
							className="min-w-48 flex-1"
							disabled={disabled}
							options={(resumes.data ?? []).map((resume) => ({ value: resume.id, label: resume.name }))}
							value={resumeId}
							onValueChange={setResumeId}
							placeholder={t`Choose a resume`}
						/>
						<Button
							type="button"
							variant="outline"
							disabled={disabled || !resumeId || !sourceReady}
							onClick={() =>
								void run(async () => {
									if (!resumeId || !sourceReady) return;
									onUpdated(
										await orpc.coverLetters.refreshStyle.call({
											id: letter.id,
											expectedRevision: letter.revision,
											resumeId,
										}),
									);
									toast.add({
										type: "success",
										description: t`Styling and sender details refreshed from the selected resume.`,
									});
								})
							}
						>
							<Trans>Refresh from resume</Trans>
						</Button>
					</div>
					<p className="text-muted-foreground text-xs">
						<Trans>Styling and sender details are copied. Future resume edits apply only when you refresh.</Trans>
					</p>
					{!sourceReady && (
						<p role="status" className="text-muted-foreground text-sm">
							<Trans>Save resume changes before copying its content or styling.</Trans>
						</p>
					)}
				</div>
				<div className="space-y-2">
					<Label htmlFor={applicationId}>
						<Trans>Application</Trans>
					</Label>
					<div className="flex flex-wrap gap-2">
						<Combobox
							id={applicationId}
							className="min-w-48 flex-1"
							disabled={disabled}
							options={(applications.data ?? []).map((application) => ({
								value: application.id,
								label: `${application.company} — ${application.role}`,
							}))}
							value={selectedApplicationId}
							onValueChange={setSelectedApplicationId}
							placeholder={t`Choose an application`}
						/>
						<Button
							type="button"
							variant="outline"
							disabled={disabled || !selectedApplicationId}
							onClick={() =>
								void run(async () => {
									if (!selectedApplicationId) return;
									const application = applications.data?.find((item) => item.id === selectedApplicationId);
									if (
										application?.coverLetterUrl &&
										!(await confirm(t`Replace the attached cover letter?`, { confirmText: t`Replace` }))
									)
										return;
									const file = new File([await createPdf()], generateFilename(letter.name, "pdf"), {
										type: "application/pdf",
									});
									await orpc.applications.attachDocument.call({
										id: selectedApplicationId,
										kind: "cover-letter",
										file,
									});
									await queryClient.invalidateQueries({ queryKey: orpc.applications.key() });
									toast.add({ type: "success", description: t`PDF snapshot attached to the application.` });
								})
							}
						>
							<Trans>Attach PDF</Trans>
						</Button>
					</div>
				</div>
			</fieldset>
			{preview && (
				<ClientOnly fallback={<Spinner />}>
					<Suspense fallback={<Spinner />}>
						<PdfViewer data={data} includeCoverLetterHeader />
					</Suspense>
				</ClientOnly>
			)}
		</div>
	);
}
