import type { ApplicationStatus } from "@reactive-resume/schema/applications/data";
import type { Application } from "../types";
import type { FileAttachment } from "./file-attachment-field";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { SparkleIcon, XIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { STAGES } from "@reactive-resume/schema/applications/data";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
import { Label } from "@reactive-resume/ui/components/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@reactive-resume/ui/components/sheet";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { Combobox } from "@/components/ui/combobox";
import { orpc } from "@/libs/orpc/client";
import { applicationsListQueryKey } from "../queries";
import { FileAttachmentField } from "./file-attachment-field";

// Preset source suggestions surfaced via a <datalist>; the field itself stays free-text.
const SOURCE_OPTIONS = ["LinkedIn", "Indeed", "Company Website", "Referral", "Recruiter", "Other"];
const todayInputValue = () => {
	const now = new Date();
	return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
};

const emptyForm = () => ({
	company: "",
	role: "",
	location: "",
	salary: "",
	source: "",
	status: "saved" as ApplicationStatus,
	resumeId: "",
	tags: [] as string[],
	sourceUrl: "",
	stageEnteredAt: todayInputValue(),
	jobDescription: "",
	followUpAt: "",
	followUpNote: "",
	notes: "",
	resumeFile: null as FileAttachment | null,
	coverLetter: null as FileAttachment | null,
});

type FormState = ReturnType<typeof emptyForm>;

const toAttachment = (url: string | null, name: string | null): FileAttachment | null =>
	url ? { url, name: name ?? url } : null;

function toForm(app: Application): FormState {
	return {
		company: app.company,
		role: app.role,
		location: app.location ?? "",
		salary: app.salary ?? "",
		source: app.source ?? "",
		status: app.status,
		resumeId: app.resumeId ?? "",
		tags: app.tags,
		sourceUrl: app.sourceUrl ?? "",
		stageEnteredAt: "",
		jobDescription: app.jobDescription ?? "",
		followUpAt: app.followUpAt ? new Date(app.followUpAt).toISOString().slice(0, 10) : "",
		followUpNote: app.followUpNote ?? "",
		notes: app.notes ?? "",
		resumeFile: toAttachment(app.resumeFileUrl, app.resumeFileName),
		coverLetter: toAttachment(app.coverLetterUrl, app.coverLetterName),
	};
}

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	// When provided, the sheet edits this application instead of creating a new one.
	application?: Application | null;
};

export function ApplicationFormSheet({ open, onOpenChange, application }: Props) {
	const queryClient = useQueryClient();
	const isEditing = !!application;

	const [form, setForm] = useState<FormState>(() => (application ? toForm(application) : emptyForm()));

	// Re-sync the form when the sheet's target changes (a different app, or create ↔ edit).
	const [syncedId, setSyncedId] = useState(application?.id ?? null);
	if ((application?.id ?? null) !== syncedId) {
		setSyncedId(application?.id ?? null);
		setForm(application ? toForm(application) : emptyForm());
	}

	const { data: resumes } = useQuery(orpc.resume.list.queryOptions());
	const resumeOptions = (resumes ?? []).map((resume) => ({ value: resume.id, label: resume.name }));

	const { data: allTags } = useQuery(orpc.applications.tags.queryOptions());

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
		setForm((prev) => ({ ...prev, [key]: value }));

	const invalidate = () => {
		void queryClient.invalidateQueries({ queryKey: applicationsListQueryKey() });
		void queryClient.invalidateQueries({ queryKey: orpc.applications.stats.queryKey() });
		void queryClient.invalidateQueries({ queryKey: orpc.applications.tags.queryKey() });
		if (application) {
			void queryClient.invalidateQueries({
				queryKey: orpc.applications.getById.queryKey({ input: { id: application.id } }),
			});
		}
	};

	const create = useMutation(
		orpc.applications.create.mutationOptions({
			onSuccess: () => {
				invalidate();
				toast.success(t`Application added to your pipeline.`);
				setForm(emptyForm());
				onOpenChange(false);
			},
			onError: () => toast.error(t`Couldn't add the application. Please try again.`),
		}),
	);

	const update = useMutation(
		orpc.applications.update.mutationOptions({
			onSuccess: () => {
				invalidate();
				toast.success(t`Application updated.`);
				onOpenChange(false);
			},
			onError: () => toast.error(t`Couldn't save your changes. Please try again.`),
		}),
	);

	const autofill = useMutation(
		orpc.applications.ai.autofill.mutationOptions({
			onSuccess: (result) => {
				setForm((prev) => ({
					...prev,
					company: result.company || prev.company,
					role: result.role || prev.role,
					location: result.location || prev.location,
					salary: result.salary || prev.salary,
					jobDescription: result.jobDescription || prev.jobDescription,
				}));
				toast.success(t`Filled in what we could from the posting.`);
			},
			onError: (error) => toast.error(error.message || t`Auto-fill failed. Paste the description instead.`),
		}),
	);

	const pending = create.isPending || update.isPending;

	const submit = () => {
		if (!form.company.trim() || !form.role.trim()) return;
		const payload = {
			company: form.company.trim(),
			role: form.role.trim(),
			status: form.status,
			location: form.location.trim() || null,
			salary: form.salary.trim() || null,
			source: form.source.trim() || null,
			resumeId: form.resumeId || null,
			tags: form.tags,
			sourceUrl: form.sourceUrl.trim() || null,
			jobDescription: form.jobDescription.trim() || null,
			notes: form.notes.trim() || null,
			followUpNote: form.followUpNote.trim() || null,
			followUpAt: form.followUpAt ? new Date(form.followUpAt) : null,
			resumeFileUrl: form.resumeFile?.url ?? null,
			resumeFileName: form.resumeFile?.name ?? null,
			coverLetterUrl: form.coverLetter?.url ?? null,
			coverLetterName: form.coverLetter?.name ?? null,
		};
		if (application) update.mutate({ id: application.id, ...payload });
		else create.mutate({ ...payload, stageEnteredAt: form.stageEnteredAt || undefined });
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full gap-0 data-[side=right]:sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>{isEditing ? <Trans>Edit application</Trans> : <Trans>Add application</Trans>}</SheetTitle>
					<SheetDescription>
						{isEditing ? (
							<Trans>Update this application's details.</Trans>
						) : (
							<Trans>Track a job you're applying to and link the resume you sent.</Trans>
						)}
					</SheetDescription>
				</SheetHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 [&>*]:shrink-0">
					{/* AI job-posting autofill: extracts the fields below from a posting URL. */}
					{!isEditing && (
						<div className="rounded-lg border border-border border-dashed p-3">
							<Label className="text-muted-foreground text-xs">
								<Trans>Paste a job posting URL</Trans>
							</Label>
							<div className="mt-1.5 flex gap-2">
								<Input
									value={form.sourceUrl}
									placeholder="https://…"
									onChange={(event) => set("sourceUrl", event.target.value)}
								/>
								<Button
									type="button"
									variant="outline"
									disabled={!form.sourceUrl.trim() || autofill.isPending}
									onClick={() => autofill.mutate({ sourceUrl: form.sourceUrl.trim() })}
								>
									<SparkleIcon />
									{autofill.isPending ? <Trans>Reading…</Trans> : <Trans>Auto-fill</Trans>}
								</Button>
							</div>
							<p className="mt-1.5 text-[11px] text-muted-foreground">
								<Trans>Let AI read the posting and fill the fields below.</Trans>
							</p>
						</div>
					)}

					<Field label={t`Company`} required>
						<Input value={form.company} onChange={(event) => set("company", event.target.value)} />
					</Field>
					<Field label={t`Role / title`} required>
						<Input value={form.role} onChange={(event) => set("role", event.target.value)} />
					</Field>

					<div className="grid grid-cols-2 gap-3">
						<Field label={t`Location`}>
							<Input
								value={form.location}
								list="application-locations"
								placeholder={t`Remote, Hybrid, a city…`}
								onChange={(event) => set("location", event.target.value)}
							/>
							<datalist id="application-locations">
								<option value="Remote" />
								<option value="Hybrid" />
								<option value="In-office" />
							</datalist>
						</Field>
						<Field label={t`Salary range`}>
							<Input value={form.salary} onChange={(event) => set("salary", event.target.value)} />
						</Field>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<Field label={t`Source`}>
							<Input
								value={form.source}
								list="application-sources"
								placeholder={t`LinkedIn, Referral…`}
								onChange={(event) => set("source", event.target.value)}
							/>
							<datalist id="application-sources">
								{SOURCE_OPTIONS.map((option) => (
									<option key={option} value={option} />
								))}
							</datalist>
						</Field>
						<Field label={t`Stage`}>
							<Combobox
								className="w-full"
								value={form.status}
								options={STAGES.map((s) => ({ value: s.value, label: s.label }))}
								onValueChange={(value) => value && set("status", value)}
							/>
						</Field>
					</div>

					{!isEditing && (
						<Field label={t`Stage date`}>
							<Input
								type="date"
								value={form.stageEnteredAt}
								onChange={(event) => set("stageEnteredAt", event.target.value)}
							/>
						</Field>
					)}

					{/* Resume: link a live Reactive Resume (unlocks AI) or upload the exact PDF you sent. */}
					<Field label={t`Resume`}>
						<div className="flex flex-col gap-2">
							<Combobox
								className="w-full"
								value={form.resumeId || null}
								options={resumeOptions}
								placeholder={t`Link a Reactive Resume (recommended)`}
								showClear
								emptyMessage={t`No resumes yet.`}
								onValueChange={(value) => set("resumeId", value ?? "")}
							/>
							<FileAttachmentField
								value={form.resumeFile}
								attachLabel={t`Or upload a resume PDF`}
								onChange={(value) => set("resumeFile", value)}
							/>
							<p className="text-[11px] text-muted-foreground">
								<Trans>Linking a Reactive Resume enables AI match scoring and tailoring.</Trans>
							</p>
						</div>
					</Field>

					<Field label={t`Cover letter`}>
						<FileAttachmentField
							value={form.coverLetter}
							attachLabel={t`Attach a cover letter (PDF)`}
							onChange={(value) => set("coverLetter", value)}
						/>
					</Field>

					<Field label={t`Tags`}>
						<TagsField value={form.tags} suggestions={allTags ?? []} onChange={(tags) => set("tags", tags)} />
					</Field>

					<div className="grid grid-cols-2 gap-3">
						<Field label={t`Follow-up date`}>
							<Input type="date" value={form.followUpAt} onChange={(event) => set("followUpAt", event.target.value)} />
						</Field>
						<Field label={t`Follow-up note`}>
							<Input value={form.followUpNote} onChange={(event) => set("followUpNote", event.target.value)} />
						</Field>
					</div>

					<Field label={t`Job description`}>
						<Textarea
							value={form.jobDescription}
							rows={3}
							placeholder={t`Paste the posting — powers AI match scoring and tailoring.`}
							onChange={(event) => set("jobDescription", event.target.value)}
						/>
					</Field>

					<Field label={t`Notes`}>
						<Textarea
							value={form.notes}
							rows={3}
							placeholder={t`Referred by…, things to emphasize, etc.`}
							onChange={(event) => set("notes", event.target.value)}
						/>
					</Field>
				</div>

				<SheetFooter className="flex-row justify-end gap-2">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						<Trans>Cancel</Trans>
					</Button>
					<Button type="button" disabled={!form.company.trim() || !form.role.trim() || pending} onClick={submit}>
						{isEditing ? <Trans>Save changes</Trans> : <Trans>Add to pipeline</Trans>}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
	return (
		<div className="grid gap-1.5">
			<Label className="text-muted-foreground text-xs">
				{label}
				{required && <span className="text-destructive"> *</span>}
			</Label>
			{children}
		</div>
	);
}

type TagsFieldProps = {
	value: string[];
	suggestions: string[];
	onChange: (tags: string[]) => void;
};

// Type-and-Enter tag input with chips + an autocomplete datalist of the user's existing tags.
function TagsField({ value, suggestions, onChange }: TagsFieldProps) {
	const [draft, setDraft] = useState("");

	const add = () => {
		const tag = draft.trim();
		if (!tag || value.includes(tag)) {
			setDraft("");
			return;
		}
		onChange([...value, tag]);
		setDraft("");
	};

	return (
		<div className="flex flex-col gap-2">
			<Input
				value={draft}
				list="application-tags"
				placeholder={t`Add a tag and press Enter…`}
				onChange={(event) => setDraft(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						add();
					}
				}}
				onBlur={add}
			/>
			<datalist id="application-tags">
				{suggestions.map((tag) => (
					<option key={tag} value={tag} />
				))}
			</datalist>
			{value.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{value.map((tag) => (
						<span
							key={tag}
							className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs"
						>
							{tag}
							<button
								type="button"
								title={t`Remove tag`}
								className="hover:text-destructive"
								onClick={() => onChange(value.filter((t) => t !== tag))}
							>
								<XIcon className="size-3" />
							</button>
						</span>
					))}
				</div>
			)}
		</div>
	);
}
