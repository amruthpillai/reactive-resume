import type z from "zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { EyeIcon, EyeSlashIcon, TrashSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { pictureSchema } from "@reactive-resume/schema/resume/data";
import { Button } from "@reactive-resume/ui/components/button";
import { ButtonGroup } from "@reactive-resume/ui/components/button-group";
import { FormControl, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@reactive-resume/ui/components/input-group";
import { ColorPicker } from "@/components/input/color-picker";
import { useCurrentResume, useUpdateResumeData } from "@/components/resume/use-resume";
import { getReadableErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";
import { useAppForm } from "@/libs/tanstack-form";
import { SectionBase } from "../shared/section-base";

export function PictureSectionBuilder() {
	return (
		<SectionBase type="picture">
			<PictureSectionForm />
		</SectionBase>
	);
}

type PictureValues = z.infer<typeof pictureSchema>;

function normalizePictureUrl(url: string, origin: string): string {
	if (!url) return url;
	if (url.startsWith("/uploads/")) return `/api${url}`;

	try {
		const parsed = new URL(url, origin);
		if (parsed.origin !== origin) return url;
		if (!parsed.pathname.startsWith("/uploads/")) return url;
		return `/api${parsed.pathname}${parsed.search}${parsed.hash}`;
	} catch {
		return url;
	}
}

function PictureSectionForm() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const appOrigin = typeof window === "undefined" ? "" : window.location.origin;

	const resume = useCurrentResume();
	const picture = resume.data.picture;
	const normalizedPictureUrl = normalizePictureUrl(picture.url, appOrigin);
	const [pictureSrc, setPictureSrc] = useState("");
	const updateResumeData = useUpdateResumeData();

	const { mutate: uploadFile } = useMutation(orpc.storage.uploadFile.mutationOptions({ meta: { noInvalidate: true } }));
	const { mutate: deleteFile } = useMutation(orpc.storage.deleteFile.mutationOptions({ meta: { noInvalidate: true } }));

	const persist = (data: PictureValues) => {
		updateResumeData((draft) => {
			draft.picture = data;
		});
	};

	const form = useAppForm({
		defaultValues: picture,
		validators: { onChange: pictureSchema },
		onSubmit: ({ value }) => {
			persist(value);
		},
	});

	const handleAutoSave = () => {
		persist(form.state.values);
	};

	const onSelectPicture = () => {
		if (!fileInputRef.current) return;
		fileInputRef.current?.click();
	};

	const onDeletePicture = () => {
		if (!picture.url) return;

		const appOrigin = window.location.origin;
		const pictureUrl = new URL(picture.url, appOrigin);
		const pictureOrigin = pictureUrl.origin;

		const filename = pictureUrl.pathname.split("/").pop();
		if (!filename) return;

		// If the picture is from the same origin, attempt to delete it
		if (pictureOrigin === appOrigin) deleteFile({ filename });

		form.setFieldValue("url", "");
		handleAutoSave();
	};

	const onUploadPicture = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const toastId = toast.loading(t`Uploading picture...`);

		uploadFile(file, {
			onSuccess: ({ url }) => {
				form.setFieldValue("url", url);
				handleAutoSave();
				toast.dismiss(toastId);
				if (fileInputRef.current) fileInputRef.current.value = "";
			},
			onError: (error) => {
				toast.error(
					getReadableErrorMessage(
						error,
						t({
							comment: "Fallback toast when uploading profile picture for resume fails",
							message: "Failed to upload picture. Please try again.",
						}),
					),
					{ id: toastId },
				);
			},
		});
	};

	useEffect(() => {
		if (!normalizedPictureUrl) {
			setPictureSrc("");
			return;
		}

		const controller = new AbortController();
		let objectUrl = "";

		void fetch(normalizedPictureUrl, { signal: controller.signal })
			.then(async (response) => {
				if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

				const blob = await response.blob();
				objectUrl = URL.createObjectURL(blob);
				setPictureSrc(objectUrl);
			})
			.catch(() => {
				if (controller.signal.aborted) return;

				setPictureSrc(normalizedPictureUrl);
			});

		return () => {
			controller.abort();
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [normalizedPictureUrl]);

	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<div className="flex items-center gap-x-4">
				<input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onUploadPicture} />

				<button
					type="button"
					onClick={picture.url ? onDeletePicture : onSelectPicture}
					aria-label={picture.url ? t`Delete picture` : t`Upload picture`}
					className="group/picture relative size-18 cursor-pointer overflow-hidden rounded-md bg-secondary transition-colors hover:bg-secondary/50"
				>
					{(pictureSrc || normalizedPictureUrl) && (
						<img
							alt=""
							src={pictureSrc || normalizedPictureUrl}
							className="fade-in relative z-10 size-full animate-in rounded-md object-cover transition-opacity group-hover/picture:opacity-20"
						/>
					)}

					<div className="absolute inset-0 z-0 flex size-full items-center justify-center">
						{picture.url ? <TrashSimpleIcon className="size-6" /> : <UploadSimpleIcon className="size-6" />}
					</div>
				</button>

				<form.Field name="url">
					{(field) => (
						<FormItem className="flex-1" hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>URL</Trans>
							</FormLabel>
							<div className="flex items-center gap-x-2">
								<FormControl
									render={
										<Input
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => {
												field.handleChange(event.target.value);
												handleAutoSave();
											}}
										/>
									}
								/>

								<Button
									size="icon"
									variant="ghost"
									onClick={() => {
										form.setFieldValue("hidden", !picture.hidden);
										handleAutoSave();
									}}
								>
									{picture.hidden ? <EyeSlashIcon /> : <EyeIcon />}
								</Button>
							</div>
						</FormItem>
					)}
				</form.Field>
			</div>

			<div className="grid @md:grid-cols-2 grid-cols-1 gap-4">
				<form.Field name="size">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Size</Trans>
							</FormLabel>
							<InputGroup>
								<InputGroupInput
									name={field.name}
									value={field.state.value}
									type="number"
									min={32}
									max={512}
									step={1}
									onBlur={field.handleBlur}
									onChange={(e) => {
										const value = e.target.value;
										if (value === "") field.handleChange("" as unknown as number);
										else field.handleChange(Number(value));
										handleAutoSave();
									}}
								/>

								<InputGroupAddon align="inline-end">
									<InputGroupText>pt</InputGroupText>
								</InputGroupAddon>
							</InputGroup>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<form.Field name="rotation">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Rotation</Trans>
							</FormLabel>
							<InputGroup>
								<FormControl
									render={
										<InputGroupInput
											name={field.name}
											value={field.state.value}
											type="number"
											min={0}
											max={360}
											step={5}
											onBlur={field.handleBlur}
											onChange={(e) => {
												const value = e.target.value;
												if (value === "") field.handleChange("" as unknown as number);
												else field.handleChange(Number(value));
												handleAutoSave();
											}}
										/>
									}
								/>
								<InputGroupAddon align="inline-end">
									<InputGroupText>°</InputGroupText>
								</InputGroupAddon>
							</InputGroup>
						</FormItem>
					)}
				</form.Field>

				<form.Field name="aspectRatio">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Aspect Ratio</Trans>
							</FormLabel>
							<div className="flex items-center gap-x-2">
								<FormControl
									render={
										<Input
											name={field.name}
											value={field.state.value}
											type="number"
											min={0.5}
											max={2.5}
											step={0.1}
											onBlur={field.handleBlur}
											onChange={(e) => {
												const value = e.target.value;
												if (value === "") field.handleChange("" as unknown as number);
												else field.handleChange(Number(value));
												handleAutoSave();
											}}
										/>
									}
								/>

								<ButtonGroup className="shrink-0">
									<Button
										size="icon"
										variant="outline"
										title={t({
											comment: "Preset button for setting picture aspect ratio to square",
											message: "Square",
										})}
										onClick={() => {
											field.handleChange(1);
											handleAutoSave();
										}}
									>
										<div className="aspect-square min-h-3 min-w-3 border border-primary" />
									</Button>
									<Button
										size="icon"
										variant="outline"
										title={t({
											comment: "Preset button for setting picture aspect ratio to landscape orientation",
											message: "Landscape",
										})}
										onClick={() => {
											field.handleChange(1.5);
											handleAutoSave();
										}}
									>
										<div className="aspect-1.5/1 min-h-3 min-w-3 border border-primary" />
									</Button>
									<Button
										size="icon"
										variant="outline"
										title={t({
											comment: "Preset button for setting picture aspect ratio to portrait orientation",
											message: "Portrait",
										})}
										onClick={() => {
											field.handleChange(0.5);
											handleAutoSave();
										}}
									>
										<div className="aspect-1/1.5 min-h-3 min-w-3 border border-primary" />
									</Button>
								</ButtonGroup>
							</div>
						</FormItem>
					)}
				</form.Field>

				<form.Field name="borderRadius">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Border Radius</Trans>
							</FormLabel>
							<div className="flex items-center gap-x-2">
								<InputGroup>
									<FormControl
										render={
											<InputGroupInput
												name={field.name}
												value={field.state.value}
												type="number"
												min={0}
												max={100}
												step={1}
												onBlur={field.handleBlur}
												onChange={(e) => {
													const value = Number(e.target.value);
													field.handleChange(value);
													handleAutoSave();
												}}
											/>
										}
									/>
									<InputGroupAddon align="inline-end">pt</InputGroupAddon>
								</InputGroup>

								<ButtonGroup className="shrink-0">
									<Button
										size="icon"
										variant="outline"
										title="0pt"
										onClick={() => {
											field.handleChange(0);
											handleAutoSave();
										}}
									>
										<div className="size-3 rounded-none border border-primary" />
									</Button>
									<Button
										size="icon"
										variant="outline"
										title="10pt"
										onClick={() => {
											field.handleChange(10);
											handleAutoSave();
										}}
									>
										<div className="size-3 rounded-[10%] border border-primary" />
									</Button>
									<Button
										size="icon"
										variant="outline"
										title="100pt"
										onClick={() => {
											field.handleChange(100);
											handleAutoSave();
										}}
									>
										<div className="size-3 rounded-full border border-primary" />
									</Button>
								</ButtonGroup>
							</div>
						</FormItem>
					)}
				</form.Field>

				<div className="flex items-end gap-x-3">
					<form.Field name="borderColor">
						{(field) => (
							<FormItem
								className="mb-1.5 shrink-0"
								hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
							>
								<FormControl
									render={
										<ColorPicker
											defaultValue={field.state.value}
											onChange={(color) => {
												field.handleChange(color);
												handleAutoSave();
											}}
										/>
									}
								/>
							</FormItem>
						)}
					</form.Field>

					<form.Field name="borderWidth">
						{(field) => (
							<FormItem className="flex-1" hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
								<FormLabel>
									<Trans>Border Width</Trans>
								</FormLabel>
								<InputGroup>
									<FormControl
										render={
											<InputGroupInput
												name={field.name}
												value={field.state.value}
												type="number"
												min={0}
												step={1}
												onBlur={field.handleBlur}
												onChange={(e) => {
													const value = e.target.value;
													if (value === "") field.handleChange("" as unknown as number);
													else field.handleChange(Number(value));
													handleAutoSave();
												}}
											/>
										}
									/>
									<InputGroupAddon align="inline-end">
										<InputGroupText>pt</InputGroupText>
									</InputGroupAddon>
								</InputGroup>
							</FormItem>
						)}
					</form.Field>
				</div>

				<div className="flex items-end gap-x-3">
					<form.Field name="shadowColor">
						{(field) => (
							<FormItem
								className="mb-1.5 shrink-0"
								hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
							>
								<FormControl
									render={
										<ColorPicker
											defaultValue={field.state.value}
											onChange={(color) => {
												field.handleChange(color);
												handleAutoSave();
											}}
										/>
									}
								/>
							</FormItem>
						)}
					</form.Field>

					<form.Field name="shadowWidth">
						{(field) => (
							<FormItem className="flex-1" hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
								<FormLabel>
									<Trans>Shadow Width</Trans>
								</FormLabel>
								<InputGroup>
									<FormControl
										render={
											<InputGroupInput
												name={field.name}
												value={field.state.value}
												type="number"
												min={0}
												step={0.5}
												onBlur={field.handleBlur}
												onChange={(e) => {
													const value = e.target.value;
													if (value === "") field.handleChange("" as unknown as number);
													else field.handleChange(Number(value));
													handleAutoSave();
												}}
											/>
										}
									/>
									<InputGroupAddon align="inline-end">
										<InputGroupText>pt</InputGroupText>
									</InputGroupAddon>
								</InputGroup>
							</FormItem>
						)}
					</form.Field>
				</div>
			</div>
		</form>
	);
}
