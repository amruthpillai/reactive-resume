import type { ApplicationStatus, ApplicationTimelineEntry, Contact } from "@reactive-resume/schema/applications/data";
import type { Application } from "../types";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
	ArrowRightIcon,
	ArrowSquareOutIcon,
	PencilSimpleIcon,
	PlusIcon,
	TrashIcon,
	XCircleIcon,
	XIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { STAGES } from "@reactive-resume/schema/applications/data";
import { Button } from "@reactive-resume/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@reactive-resume/ui/components/dialog";
import { Input } from "@reactive-resume/ui/components/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@reactive-resume/ui/components/sheet";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { cn } from "@reactive-resume/utils/style";
import { useConfirm } from "@/hooks/use-confirm";
import { orpc } from "@/libs/orpc/client";
import { applicationsListQueryKey } from "../queries";
import { ApplicationAiCopilot } from "./application-ai-copilot";
import { FileAttachmentField } from "./file-attachment-field";

const stageIndex = (status: ApplicationStatus) => STAGES.findIndex((s) => s.value === status);
const stageOf = (status: ApplicationStatus) => STAGES.find((s) => s.value === status);

const dateInputValue = (value: Date | string) => {
	const date = new Date(value);
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

const formatDate = (value: Date | string) =>
	new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC", year: "numeric" });

const byNewest = (a: ApplicationTimelineEntry, b: ApplicationTimelineEntry) =>
	new Date(b.at).getTime() - new Date(a.at).getTime();

const currentStageAnchorId = (activity: ApplicationTimelineEntry[], status: ApplicationStatus) =>
	[...activity].sort(byNewest).find((entry) => entry.type === "stage" && entry.stage === status)?.id;

const latestStageDate = (activity: ApplicationTimelineEntry[], status: ApplicationStatus) =>
	[...activity].sort(byNewest).find((entry) => entry.type === "stage" && entry.stage === status)?.at;

type Props = {
	application: Application | null;
	onOpenChange: (open: boolean) => void;
	onEdit: (application: Application) => void;
};

export function ApplicationDetailSheet({ application, onOpenChange, onEdit }: Props) {
	const queryClient = useQueryClient();
	const confirm = useConfirm();
	const id = application?.id;

	const { data } = useQuery({
		...orpc.applications.getById.queryOptions({ input: { id: id ?? "" } }),
		enabled: !!id,
		...(application ? { initialData: application } : {}),
	});

	const current = data ?? application;

	const invalidate = () => {
		void queryClient.invalidateQueries({ queryKey: applicationsListQueryKey() });
		void queryClient.invalidateQueries({ queryKey: orpc.applications.stats.queryKey() });
		if (id) void queryClient.invalidateQueries({ queryKey: orpc.applications.getById.queryKey({ input: { id } }) });
	};

	const update = useMutation(
		orpc.applications.update.mutationOptions({
			onSuccess: invalidate,
			onError: () => toast.error(t`Something went wrong. Please try again.`),
		}),
	);

	const addNote = useMutation(
		orpc.applications.addNote.mutationOptions({
			onSuccess: invalidate,
			onError: () => toast.error(t`Couldn't save the note.`),
		}),
	);

	const updateTimelineEntry = useMutation(
		orpc.applications.updateTimelineEntry.mutationOptions({
			onSuccess: invalidate,
			onError: () => toast.error(t`Couldn't update the timeline entry.`),
		}),
	);

	const deleteTimelineEntry = useMutation(
		orpc.applications.deleteTimelineEntry.mutationOptions({
			onSuccess: invalidate,
			onError: () => toast.error(t`Couldn't delete the timeline entry.`),
		}),
	);

	const remove = useMutation(
		orpc.applications.delete.mutationOptions({
			onSuccess: () => {
				invalidate();
				toast.success(t`Application deleted.`);
				onOpenChange(false);
			},
			onError: () => toast.error(t`Couldn't delete the application.`),
		}),
	);

	if (!current) return null;

	const idx = stageIndex(current.status);
	const nextStage = idx >= 0 && idx < STAGES.length - 2 ? STAGES[idx + 1] : null;

	return (
		<Sheet open={!!application} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full gap-0 data-[side=right]:sm:max-w-lg">
				<SheetHeader className="gap-3">
					<div className="flex items-start justify-between gap-2 pe-8">
						<div className="min-w-0">
							<SheetTitle className="truncate">{current.role}</SheetTitle>
							<div className="truncate text-muted-foreground text-sm">
								{current.company}
								{current.location ? ` · ${current.location}` : ""}
							</div>
						</div>
						<Button size="sm" variant="outline" className="shrink-0" onClick={() => onEdit(current)}>
							<PencilSimpleIcon />
							<Trans>Edit</Trans>
						</Button>
					</div>

					{/* stage stepper */}
					<div className="flex gap-1.5">
						{STAGES.map((stage, i) => (
							<span
								key={stage.value}
								title={stage.label}
								className={cn("h-1.5 flex-1 rounded-full", i <= idx ? "" : "bg-muted")}
								style={i <= idx ? { background: stage.color } : undefined}
							/>
						))}
					</div>
					<div className="flex items-center justify-between">
						<span className="font-medium text-sm">{STAGES[idx]?.label ?? current.status}</span>
						{nextStage && (
							<Button
								size="sm"
								variant="outline"
								disabled={update.isPending}
								onClick={() => update.mutate({ id: current.id, status: nextStage.value })}
							>
								<Trans>Move to</Trans> {nextStage.label}
								<ArrowRightIcon />
							</Button>
						)}
					</div>
				</SheetHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 [&>*]:shrink-0">
					{/* key facts */}
					<dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
						<Fact label={t`Salary`} value={current.salary} />
						<Fact label={t`Source`} value={current.source} />
						<Fact
							label={t`Applied on`}
							value={formatDate(latestStageDate(current.activity, "applied") ?? current.appliedAt)}
						/>
					</dl>

					{current.sourceUrl && (
						<a
							href={current.sourceUrl}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1.5 text-primary text-sm hover:underline"
						>
							<ArrowSquareOutIcon />
							<Trans>Job posting</Trans>
						</a>
					)}

					{/* documents: linked resume + cover letter */}
					<Section title={t`Documents sent`}>
						{current.resumeId ? (
							<Link
								to="/builder/$resumeId"
								params={{ resumeId: current.resumeId }}
								className="flex items-center gap-3 rounded-lg border border-border p-2.5 hover:bg-muted/50"
							>
								<span className="flex size-8 items-center justify-center rounded-md bg-primary/10 font-bold text-[10px] text-primary">
									RXR
								</span>
								<span className="min-w-0 flex-1 truncate text-sm">
									<Trans>Linked Reactive Resume</Trans>
								</span>
								<ArrowSquareOutIcon className="text-muted-foreground" />
							</Link>
						) : (
							<p className="text-muted-foreground text-sm">
								<Trans>No resume linked.</Trans>
							</p>
						)}

						<FileAttachmentField
							value={
								current.resumeFileUrl
									? { url: current.resumeFileUrl, name: current.resumeFileName || t`Resume file` }
									: null
							}
							attachLabel={t`Attach a resume file (PDF)`}
							disabled={update.isPending}
							onChange={(value) =>
								update.mutate({
									id: current.id,
									resumeFileUrl: value?.url ?? null,
									resumeFileName: value?.name ?? null,
								})
							}
						/>

						<FileAttachmentField
							value={
								current.coverLetterUrl
									? { url: current.coverLetterUrl, name: current.coverLetterName || t`Cover letter` }
									: null
							}
							attachLabel={t`Attach a cover letter (PDF)`}
							disabled={update.isPending}
							onChange={(value) =>
								update.mutate({
									id: current.id,
									coverLetterUrl: value?.url ?? null,
									coverLetterName: value?.name ?? null,
								})
							}
						/>
					</Section>

					{/* AI copilot — placed high so it's discoverable without scrolling past the timeline */}
					<ApplicationAiCopilot application={current} />

					{/* contacts */}
					<Section title={t`Contacts`}>
						<ContactsEditor
							key={current.id}
							contacts={current.contacts}
							pending={update.isPending}
							onChange={(contacts) => update.mutate({ id: current.id, contacts })}
						/>
					</Section>

					{/* follow-up */}
					{current.followUpAt && (
						<Section title={t`Follow-up`}>
							<div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-sm">
								<span className="font-medium">{new Date(current.followUpAt).toLocaleDateString()}</span>
								{current.followUpNote ? ` — ${current.followUpNote}` : ""}
							</div>
						</Section>
					)}

					<ApplicationTimeline
						key={current.id}
						application={current}
						pending={addNote.isPending || updateTimelineEntry.isPending || deleteTimelineEntry.isPending}
						onAddNote={(text) => addNote.mutateAsync({ id: current.id, text })}
						onUpdateEntry={(entryId, input) => updateTimelineEntry.mutateAsync({ id: current.id, entryId, ...input })}
						onDeleteEntry={(entryId) => {
							void confirm(t`Delete this timeline entry?`, {
								description: t`This entry will be permanently deleted. This can't be undone.`,
								confirmText: t`Delete`,
							}).then((confirmed) => {
								if (confirmed) deleteTimelineEntry.mutate({ id: current.id, entryId });
							});
						}}
					/>
				</div>

				<div className="flex items-center gap-1 border-border border-t p-4">
					{current.status !== "rejected" && (
						<Button
							size="sm"
							variant="ghost"
							disabled={update.isPending}
							onClick={() => update.mutate({ id: current.id, status: "rejected" })}
						>
							<XCircleIcon />
							<Trans>Mark rejected</Trans>
						</Button>
					)}
					<Button
						size="sm"
						variant="ghost"
						onClick={() => update.mutate({ id: current.id, archived: !current.archived })}
					>
						{current.archived ? <Trans>Unarchive</Trans> : <Trans>Archive</Trans>}
					</Button>
					<Button
						size="sm"
						variant="ghost"
						className="ms-auto text-destructive"
						disabled={remove.isPending}
						onClick={async () => {
							const confirmed = await confirm(t`Delete this application?`, {
								description: t`"${current.role} · ${current.company}" and its full timeline will be permanently deleted. This can't be undone.`,
								confirmText: t`Delete`,
							});
							if (confirmed) remove.mutate({ id: current.id });
						}}
					>
						<TrashIcon />
						<Trans>Delete</Trans>
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}

type ApplicationTimelineProps = {
	application: Application;
	pending: boolean;
	onAddNote: (text: string) => Promise<unknown>;
	onUpdateEntry: (entryId: string, input: { date?: string; text?: string }) => Promise<unknown>;
	onDeleteEntry: (entryId: string) => void;
};

function ApplicationTimeline({
	application,
	pending,
	onAddNote,
	onUpdateEntry,
	onDeleteEntry,
}: ApplicationTimelineProps) {
	const [note, setNote] = useState("");
	const [editingDate, setEditingDate] = useState<ApplicationTimelineEntry | null>(null);
	const [editingNote, setEditingNote] = useState<(ApplicationTimelineEntry & { type: "note" }) | null>(null);
	const [dateDraft, setDateDraft] = useState("");
	const [noteDraft, setNoteDraft] = useState("");
	const anchorId = currentStageAnchorId(application.activity, application.status);
	const sorted = [...application.activity].sort(byNewest);

	const openDate = (entry: ApplicationTimelineEntry) => {
		setEditingDate(entry);
		setDateDraft(dateInputValue(entry.at));
	};

	const openNote = (entry: ApplicationTimelineEntry & { type: "note" }) => {
		setEditingNote(entry);
		setNoteDraft(entry.text);
	};

	const add = () => {
		if (pending) return;
		const text = note.trim();
		if (!text) return;
		void onAddNote(text)
			.then(() => setNote(""))
			.catch(() => false);
	};

	return (
		<Section title={t`Timeline`}>
			<div className="flex flex-col gap-3">
				<div className="flex gap-2">
					<Input
						data-timeline-note-input
						value={note}
						disabled={pending}
						placeholder={t`Add a note…`}
						onChange={(event) => setNote(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !event.shiftKey) {
								event.preventDefault();
								add();
							}
						}}
					/>
					<Button type="button" variant="outline" disabled={!note.trim() || pending} onClick={add}>
						<Trans>Add</Trans>
					</Button>
				</div>

				<div className="relative flex flex-col gap-2 ps-4 before:absolute before:inset-y-2 before:start-1 before:w-px before:bg-border">
					{sorted.map((entry) => {
						const stage = entry.type === "stage" ? stageOf(entry.stage) : null;
						const isAnchor = entry.id === anchorId;
						return (
							<div
								key={entry.id}
								data-timeline-entry={entry.type}
								data-stage={entry.type === "stage" ? entry.stage : undefined}
								className="group relative rounded-lg border border-border bg-card p-3 text-sm"
							>
								<span
									className={cn(
										"absolute start-[-17px] top-4 size-2.5 rounded-full border-2 border-card",
										entry.type === "note" && "bg-primary/70",
									)}
									style={stage ? { background: stage.color } : undefined}
								/>
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0 flex-1">
										{entry.type === "stage" ? (
											<div className="font-medium">
												<Trans>Moved to</Trans> {stage?.label ?? entry.stage}
											</div>
										) : (
											<button
												type="button"
												className="block w-full rounded-sm text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
												onClick={() => openNote(entry)}
											>
												{entry.text}
											</button>
										)}
										{isAnchor && (
											<div className="mt-1 text-muted-foreground text-xs">
												<Trans>Current stage</Trans>
											</div>
										)}
									</div>
									<div className="flex shrink-0 items-center gap-1">
										<button
											type="button"
											className="rounded-md border border-border px-2 py-1 text-muted-foreground text-xs hover:bg-muted hover:text-foreground"
											onClick={() => openDate(entry)}
										>
											{formatDate(entry.at)}
										</button>
										{!isAnchor && (
											<button
												type="button"
												title={t`Delete timeline entry`}
												disabled={pending}
												className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 disabled:opacity-40 group-hover:opacity-100"
												onClick={() => onDeleteEntry(entry.id)}
											>
												<TrashIcon className="size-4" />
											</button>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			<Dialog open={!!editingDate} onOpenChange={(open) => !open && setEditingDate(null)}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>
							<Trans>Edit date</Trans>
						</DialogTitle>
						<DialogDescription>
							<Trans>Update the calendar date for this timeline entry.</Trans>
						</DialogDescription>
					</DialogHeader>
					<Input
						type="date"
						value={dateDraft}
						onInput={(event) => setDateDraft(event.currentTarget.value)}
						onChange={(event) => setDateDraft(event.target.value)}
					/>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setEditingDate(null)}>
							<Trans>Cancel</Trans>
						</Button>
						<Button
							type="button"
							disabled={!dateDraft || pending}
							onClick={() => {
								if (!editingDate) return;
								void onUpdateEntry(editingDate.id, { date: dateDraft })
									.then(() => setEditingDate(null))
									.catch(() => false);
							}}
						>
							<Trans>Save</Trans>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={!!editingNote} onOpenChange={(open) => !open && setEditingNote(null)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							<Trans>Edit note</Trans>
						</DialogTitle>
						<DialogDescription>
							<Trans>Update this timeline note.</Trans>
						</DialogDescription>
					</DialogHeader>
					<Textarea value={noteDraft} rows={4} onChange={(event) => setNoteDraft(event.target.value)} />
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setEditingNote(null)}>
							<Trans>Cancel</Trans>
						</Button>
						<Button
							type="button"
							disabled={!noteDraft.trim() || pending}
							onClick={() => {
								if (!editingNote) return;
								void onUpdateEntry(editingNote.id, { text: noteDraft.trim() })
									.then(() => setEditingNote(null))
									.catch(() => false);
							}}
						>
							<Trans>Save</Trans>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Section>
	);
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
	return (
		<div>
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="mt-0.5 font-medium">{value || "—"}</dd>
		</div>
	);
}

type ContactsEditorProps = {
	contacts: Contact[];
	pending: boolean;
	onChange: (contacts: Contact[]) => void;
};

function ContactsEditor({ contacts, pending, onChange }: ContactsEditorProps) {
	const [adding, setAdding] = useState(false);
	const [draft, setDraft] = useState({ name: "", role: "", type: "" });

	const reset = () => {
		setDraft({ name: "", role: "", type: "" });
		setAdding(false);
	};

	const add = () => {
		const name = draft.name.trim();
		if (!name) return;
		onChange([...contacts, { name, role: draft.role.trim(), type: draft.type.trim() }]);
		reset();
	};

	const removeAt = (index: number) => onChange(contacts.filter((_, i) => i !== index));

	return (
		<div className="flex flex-col gap-2">
			{contacts.map((contact, i) => (
				<div key={`${contact.name}-${i}`} className="group flex items-center gap-3 text-sm">
					<span className="flex size-8 items-center justify-center rounded-full bg-muted font-medium text-xs">
						{contact.name.slice(0, 2).toUpperCase()}
					</span>
					<div className="min-w-0 flex-1">
						<div className="truncate font-medium">{contact.name}</div>
						{contact.role && <div className="truncate text-muted-foreground text-xs">{contact.role}</div>}
					</div>
					{contact.type && (
						<span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{contact.type}</span>
					)}
					<button
						type="button"
						title={t`Remove contact`}
						disabled={pending}
						className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive disabled:opacity-40 group-hover:opacity-100"
						onClick={() => removeAt(i)}
					>
						<XIcon />
					</button>
				</div>
			))}

			{adding ? (
				<div className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
					<Input
						value={draft.name}
						placeholder={t`Name`}
						autoFocus
						onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
						onKeyDown={(event) => {
							if (event.key === "Enter") add();
						}}
					/>
					<div className="grid grid-cols-2 gap-2">
						<Input
							value={draft.role}
							placeholder={t`Role (optional)`}
							onChange={(event) => setDraft((d) => ({ ...d, role: event.target.value }))}
						/>
						<Input
							value={draft.type}
							list="contact-types"
							placeholder={t`Label`}
							onChange={(event) => setDraft((d) => ({ ...d, type: event.target.value }))}
						/>
					</div>
					<datalist id="contact-types">
						<option value="Recruiter" />
						<option value="Hiring Manager" />
						<option value="Referral" />
						<option value="Interviewer" />
					</datalist>
					<div className="flex justify-end gap-2">
						<Button type="button" size="sm" variant="ghost" onClick={reset}>
							<Trans>Cancel</Trans>
						</Button>
						<Button type="button" size="sm" disabled={!draft.name.trim() || pending} onClick={add}>
							<Trans>Add</Trans>
						</Button>
					</div>
				</div>
			) : (
				<button
					type="button"
					onClick={() => setAdding(true)}
					className="flex items-center gap-1.5 self-start text-muted-foreground text-xs hover:text-foreground"
				>
					<PlusIcon /> <Trans>Add contact</Trans>
				</button>
			)}
		</div>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="flex flex-col gap-2">
			<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{title}</h3>
			{children}
		</section>
	);
}
