import type { DialogProps } from "@/dialogs/store";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ORPCError } from "@orpc/client";
import { FileZipIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@reactive-resume/ui/components/alert";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@reactive-resume/ui/components/dialog";
import { cn } from "@reactive-resume/utils/style";
import { orpc } from "@/libs/orpc/client";
import { useDialogStore } from "../store";

export function ImportTemplateDialog(_: DialogProps<"template.import">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const queryClient = useQueryClient();
	const inputRef = useRef<HTMLInputElement>(null);
	const [file, setFile] = useState<File | undefined>();
	const [validationError, setValidationError] = useState<string | undefined>();
	const [isDragging, setIsDragging] = useState(false);

	const { mutateAsync: importTemplate, isPending } = useMutation(orpc.templates.importTemplate.mutationOptions());

	const pickFile = (f: File) => {
		setFile(f);
		setValidationError(undefined);
	};

	const onSelectFile = () => inputRef.current?.click();

	const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (f) pickFile(f);
	};

	const onDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const onDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const onDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const f = e.dataTransfer.files[0];
		if (f) pickFile(f);
	};

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!file) return;

		const buffer = await file.arrayBuffer();
		const bytes = new Uint8Array(buffer);
		let binary = "";
		for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
		const base64 = btoa(binary);

		try {
			await importTemplate({ zipBase64: base64 });
			await queryClient.invalidateQueries({ queryKey: orpc.templates.list.queryOptions().queryKey });
			toast.success(t`Template imported successfully.`);
			closeDialog();
		} catch (error: unknown) {
			if (error instanceof ORPCError && (error.status === 400 || error.code === "BAD_REQUEST")) {
				setValidationError(error.message || t`The file is not a valid .rxt template.`);
			} else {
				toast.error(t`An unknown error occurred while importing the template.`);
				closeDialog();
			}
		}
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<FileZipIcon />
					<Trans>Import Template</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>
						Upload a <code>.rxt</code> template archive. The file will be validated before import.
					</Trans>
				</DialogDescription>
			</DialogHeader>

			<form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
				<div>
					<input ref={inputRef} type="file" accept=".rxt" className="hidden" onChange={onFileChange} />
					<Button
						type="button"
						variant="outline"
						className={cn(
							"h-auto w-full flex-col border-dashed py-8 font-normal transition-colors",
							isDragging && "border-primary bg-primary/5",
						)}
						onClick={onSelectFile}
						onDragOver={onDragOver}
						onDragLeave={onDragLeave}
						onDrop={onDrop}
					>
						{file ? (
							<>
								<FileZipIcon weight="thin" size={32} />
								<p>{file.name}</p>
							</>
						) : (
							<>
								<UploadSimpleIcon weight="thin" size={32} />
								<Trans>Click or drag a .rxt file here to import</Trans>
							</>
						)}
					</Button>
				</div>

				{validationError && (
					<Alert variant="destructive">
						<AlertDescription>{validationError}</AlertDescription>
					</Alert>
				)}

				<DialogFooter>
					<Button type="submit" disabled={!file || isPending}>
						{isPending ? t`Importing...` : t`Import`}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
