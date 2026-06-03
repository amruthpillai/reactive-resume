import type { ItemLogo } from "@reactive-resume/schema/resume/data";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { EyeIcon, EyeSlashIcon, TrashSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@reactive-resume/ui/components/button";
import { FormControl, FormItem, FormLabel } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@reactive-resume/ui/components/input-group";
import { getReadableErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

interface LogoUploadFieldProps {
	value: ItemLogo;
	onChange: (value: ItemLogo) => void;
	onAutoSave?: () => void;
}

export function LogoUploadField({ value, onChange, onAutoSave }: LogoUploadFieldProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { mutate: uploadFile } = useMutation(orpc.storage.uploadFile.mutationOptions({ meta: { noInvalidate: true } }));
	const { mutate: deleteFile } = useMutation(orpc.storage.deleteFile.mutationOptions({ meta: { noInvalidate: true } }));

	const onSelectLogo = () => {
		fileInputRef.current?.click();
	};

	const onDeleteLogo = () => {
		if (!value.url) return;

		const appOrigin = window.location.origin;
		try {
			const logoUrl = new URL(value.url, appOrigin);
			if (logoUrl.origin === appOrigin) {
				const filename = logoUrl.pathname.split("/").pop();
				if (filename) deleteFile({ filename });
			}
		} catch {
			// ignore invalid URLs
		}

		onChange({ ...value, url: "" });
		onAutoSave?.();
	};

	const onUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const toastId = toast.loading(t`Uploading logo…`);

		uploadFile(file, {
			onSuccess: ({ url }) => {
				onChange({ ...value, url });
				onAutoSave?.();
				toast.dismiss(toastId);
				if (fileInputRef.current) fileInputRef.current.value = "";
			},
			onError: (error) => {
				toast.error(getReadableErrorMessage(error, t`Failed to upload logo. Please try again.`), {
					id: toastId,
				});
			},
		});
	};

	return (
		<div className="space-y-3">
			{/* Preview + URL row */}
			<div className="flex items-end gap-x-3">
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					aria-label={t`Upload logo`}
					className="hidden"
					onChange={onUploadLogo}
				/>

				{/* Logo preview / upload button */}
				<button
					type="button"
					onClick={value.url ? onDeleteLogo : onSelectLogo}
					aria-label={value.url ? t`Delete logo` : t`Upload logo`}
					className="group/logo relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-md bg-secondary transition-colors hover:bg-secondary/50"
				>
					{value.url && (
						<img
							alt=""
							src={value.url}
							className="fade-in relative z-10 size-full animate-in rounded-md object-contain transition-opacity group-hover/logo:opacity-20"
						/>
					)}
					<div className="absolute inset-0 z-0 flex size-full items-center justify-center">
						{value.url ? <TrashSimpleIcon className="size-4" /> : <UploadSimpleIcon className="size-4" />}
					</div>
				</button>

				{/* URL input */}
				<FormItem className="flex-1">
					<FormLabel>
						<Trans>Logo URL</Trans>
					</FormLabel>
					<FormControl
						render={
							<Input
								value={value.url}
								placeholder="e.g. /uploads/..."
								onChange={(e) => {
									onChange({ ...value, url: e.target.value });
									onAutoSave?.();
								}}
							/>
						}
					/>
				</FormItem>

				{/* Hide / show toggle */}
				<Button
					size="icon"
					type="button"
					variant="ghost"
					title={value.hidden ? t`Show logo` : t`Hide logo`}
					onClick={() => {
						onChange({ ...value, hidden: !value.hidden });
						onAutoSave?.();
					}}
				>
					{value.hidden ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
				</Button>
			</div>

			{/* Size + border radius row */}
			<div className="grid grid-cols-2 gap-3">
				<FormItem>
					<FormLabel>
						<Trans>Logo Size (pt)</Trans>
					</FormLabel>
					<InputGroup>
						<InputGroupInput
							type="number"
							min={16}
							max={128}
							value={value.size}
							onChange={(e) => {
								onChange({ ...value, size: Number(e.target.value) });
								onAutoSave?.();
							}}
						/>
						<InputGroupAddon align="inline-end">
							<InputGroupText>pt</InputGroupText>
						</InputGroupAddon>
					</InputGroup>
				</FormItem>

				<FormItem>
					<FormLabel>
						<Trans>Border Radius (pt)</Trans>
					</FormLabel>
					<InputGroup>
						<InputGroupInput
							type="number"
							min={0}
							max={50}
							value={value.borderRadius}
							onChange={(e) => {
								onChange({ ...value, borderRadius: Number(e.target.value) });
								onAutoSave?.();
							}}
						/>
						<InputGroupAddon align="inline-end">
							<InputGroupText>pt</InputGroupText>
						</InputGroupAddon>
					</InputGroup>
				</FormItem>
			</div>
		</div>
	);
}
