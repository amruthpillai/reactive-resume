import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { FilePdfIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { toast } from "@reactive-resume/ui/components/toast";
import { hasPdfMagicBytes, MAX_UPLOAD_BYTES } from "./extract-client";

type UploaderProps = {
	onSelect: (file: File) => void;
	disabled?: boolean;
	selectedFileName?: string | null;
};

/**
 * PDF only, and decided from the bytes rather than the extension: a `.docx` renamed `.pdf` is
 * rejected here rather than failing deep inside PDF.js with an unhelpful error.
 */
export function AtsUploader({ onSelect, disabled, selectedFileName }: UploaderProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [isChecking, setIsChecking] = useState(false);

	const onChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const selected = event.target.files?.[0];
		// Reset so re-picking the same file still fires a change event.
		event.target.value = "";
		if (!selected) return;

		setIsChecking(true);
		try {
			if (selected.size > MAX_UPLOAD_BYTES) {
				toast.add({ type: "error", description: t`That file is too large to check in the browser.` });
				return;
			}

			if (!(await hasPdfMagicBytes(selected))) {
				toast.add({
					type: "error",
					description: t`That file is not a PDF. Export your resume as a PDF and try again.`,
				});
				return;
			}

			onSelect(selected);
		} finally {
			setIsChecking(false);
		}
	};

	return (
		<div className="space-y-2">
			<input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onChange} />

			<Button
				variant="outline"
				disabled={disabled || isChecking}
				className="h-auto w-full flex-col gap-2 border-dashed py-6"
				onClick={() => inputRef.current?.click()}
			>
				<UploadSimpleIcon className="size-5" />
				<span className="font-medium text-sm">
					<Trans>Choose a PDF</Trans>
				</span>
				<span className="font-normal text-muted-foreground text-xs">
					<Trans>Checked in your browser. The file is never uploaded.</Trans>
				</span>
			</Button>

			{selectedFileName && (
				<p className="flex items-center gap-1.5 text-muted-foreground text-xs">
					<FilePdfIcon className="size-3.5 shrink-0" />
					<span className="min-w-0 truncate">{selectedFileName}</span>
				</p>
			)}
		</div>
	);
}
