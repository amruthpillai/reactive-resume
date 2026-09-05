import type { CoverLetter } from "@reactive-resume/schema/cover-letter/data";
import type { ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ORPCError } from "@orpc/client";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
import { Label } from "@reactive-resume/ui/components/label";
import { RichInput } from "@/components/input/rich-input";
import { getReadableErrorMessage } from "@/libs/error-message";

export type CoverLetterChanges = Pick<CoverLetter, "name" | "recipient" | "content"> & { expectedRevision: number };
export type CoverLetterEditorProps = {
	letter: CoverLetter;
	disabled?: boolean;
	onSave: (changes: CoverLetterChanges) => Promise<CoverLetter>;
	onClose: () => void;
	onDirtyChange?: (dirty: boolean, pending: boolean) => void;
	actions?: (letter: CoverLetter, disabled: boolean) => ReactNode;
};

const editableFields = (letter: CoverLetter) => ({
	name: letter.name,
	recipient: letter.recipient,
	content: letter.content,
});

export function CoverLetterEditor({
	letter,
	disabled = false,
	onSave,
	onClose,
	onDirtyChange,
	actions,
}: CoverLetterEditorProps) {
	const nameId = useId();
	const [saved, setSaved] = useState(letter);
	const [draft, setDraft] = useState(() => editableFields(letter));
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	const saving = useRef(false);
	const dirty = draft.name !== saved.name || draft.recipient !== saved.recipient || draft.content !== saved.content;

	useEffect(() => {
		onDirtyChange?.(dirty, pending);
	}, [dirty, pending, onDirtyChange]);

	useEffect(() => {
		// Refresh saved styling only when no local edit would be overwritten.
		if (!dirty && !pending && letter.revision > saved.revision) {
			setSaved(letter);
			setDraft(editableFields(letter));
		}
	}, [letter, saved.revision, dirty, pending]);

	const save = async () => {
		if (saving.current || disabled || !dirty) return;
		if (!draft.name.trim()) {
			setError(t`Enter a name for this cover letter.`);
			return;
		}
		saving.current = true;
		setPending(true);
		setError("");
		try {
			const updated = await onSave({ ...draft, name: draft.name.trim(), expectedRevision: saved.revision });
			setSaved(updated);
			setDraft(editableFields(updated));
		} catch (cause) {
			setError(
				cause instanceof ORPCError && cause.code === "CONFLICT"
					? t`This cover letter changed elsewhere. Your edits are still here. Reload the latest version before saving again.`
					: getReadableErrorMessage(cause, t`Could not save the cover letter. Please try again.`),
			);
		} finally {
			saving.current = false;
			setPending(false);
		}
	};

	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				void save();
			}}
		>
			<fieldset disabled={pending || disabled} className="min-w-0 space-y-4">
				<div className="space-y-2">
					<Label htmlFor={nameId}>
						<Trans>Name</Trans>
					</Label>
					<Input
						id={nameId}
						value={draft.name}
						maxLength={100}
						required
						onChange={(event) => setDraft({ ...draft, name: event.target.value })}
					/>
				</div>
				<fieldset className="min-w-0 space-y-2">
					<legend className="font-medium text-sm">
						<Trans>Recipient</Trans>
					</legend>
					<RichInput
						aria-label={t`Recipient`}
						value={draft.recipient}
						editable={!pending && !disabled}
						onChange={(recipient) => setDraft((current) => ({ ...current, recipient }))}
					/>
				</fieldset>
				<fieldset className="min-w-0 space-y-2">
					<legend className="font-medium text-sm">
						<Trans>Content</Trans>
					</legend>
					<RichInput
						aria-label={t`Content`}
						value={draft.content}
						editable={!pending && !disabled}
						onChange={(content) => setDraft((current) => ({ ...current, content }))}
					/>
				</fieldset>
			</fieldset>
			{error && (
				<p role="alert" className="text-destructive text-sm">
					{error}
				</p>
			)}
			<div className="flex flex-wrap justify-end gap-2">
				<Button type="button" variant="outline" disabled={pending || disabled} onClick={onClose}>
					<Trans>Close</Trans>
				</Button>
				<Button type="submit" disabled={!dirty || pending || disabled}>
					<Trans>Save Changes</Trans>
				</Button>
			</div>
			{dirty && (
				<p className="text-muted-foreground text-sm">
					<Trans>Save changes before previewing, exporting, or changing styling.</Trans>
				</p>
			)}
			{actions?.(saved, dirty || pending || disabled)}
		</form>
	);
}
