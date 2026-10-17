import type { Basics, CustomField } from "@reactive-resume/schema/resume/data";
import { useLingui } from "@lingui/react/macro";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { generateId } from "@reactive-resume/utils/string";
import { BoundText, LinkField, useValidators } from "./entry-fields";
import { EditorScreen } from "./entry-screen";
import { useUndoToast, useWriteData } from "./hooks";
import { IconPickerSheet, PromptSheet } from "./pickers";
import { resolvePictureUrl } from "./picture-screen";
import { useSession } from "@/auth/session";
import { useIsResumeLocked, useResumeStore } from "@/draft";
import { routes } from "@/routes";
import { Button, Icon, IconButton, Text, TextField, useTheme } from "@/ui";

type TextKey = "name" | "headline" | "email" | "phone" | "location";

function useBasicsWriter() {
	const update = useResumeStore((state) => state.update);
	return (key: string, mutate: (basics: Basics) => void) =>
		update((draft) => mutate(draft.basics), { coalesceKey: `basics.${key}` });
}

/** Basics: the photo row, contact fields, website and custom fields. */
export function BasicsScreen({ resumeId }: { resumeId: string }) {
	const { t } = useLingui();
	const { space } = useTheme();
	const basics = useWriteData((data) => data.basics, null);
	const locked = useIsResumeLocked();
	const write = useBasicsWriter();
	const validate = useValidators();
	if (!basics) return <EditorScreen title={t`Basics`}>{null}</EditorScreen>;

	const text = (key: TextKey) => ({
		value: basics[key],
		disabled: locked,
		onChange: (value: string) =>
			write(key, (target) => {
				target[key] = value;
			}),
	});

	return (
		<EditorScreen title={t`Basics`}>
			<PhotoRow resumeId={resumeId} locked={locked} />
			<View style={{ gap: space.s3 }}>
				<BoundText
					label={t`Full name`}
					autoComplete="name"
					// A blank resume opens straight into the name field.
					autoFocus={!locked && !basics.name}
					{...text("name")}
				/>
				<BoundText label={t`Headline`} {...text("headline")} />
				<BoundText
					label={t`Email`}
					keyboardType="email-address"
					autoComplete="email"
					validate={validate.email}
					{...text("email")}
				/>
				<BoundText label={t`Phone`} keyboardType="phone-pad" autoComplete="tel" {...text("phone")} />
				<BoundText label={t`Location`} {...text("location")} />
				<LinkField
					label={t`Website`}
					value={basics.website}
					allowInlineLink={false}
					disabled={locked}
					onChange={(website) =>
						write("website", (target) => {
							target.website = { url: website.url, label: website.label };
						})
					}
				/>
			</View>
			<CustomFields fields={basics.customFields} locked={locked} />
		</EditorScreen>
	);
}

function PhotoRow({ resumeId, locked }: { resumeId: string; locked: boolean }) {
	const { t } = useLingui();
	const { colors, radius, space } = useTheme();
	const { server } = useSession();
	const picture = useWriteData((data) => data.picture, null);
	const url = picture ? resolvePictureUrl(picture.url, server) : "";

	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "center",
				gap: space.s3,
				padding: space.s3,
				borderRadius: radius.rLg,
				backgroundColor: colors.surface,
				borderWidth: 1,
				borderColor: colors.line,
			}}
		>
			{url ? (
				<Image source={{ uri: url }} style={{ width: space.s10, height: space.s10, borderRadius: radius.rMd }} />
			) : (
				<View
					style={{
						width: space.s10,
						height: space.s10,
						borderRadius: radius.rMd,
						backgroundColor: colors.sunken,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Icon name="camera-plus" color={colors.ink3} />
				</View>
			)}
			<Text variant="caption" color="ink2" style={{ flex: 1 }}>
				{!url
					? t`No photo. Most ATS ignore photos; some regions expect one.`
					: picture?.hidden
						? t`Photo hidden from the page.`
						: t`Photo on the page.`}
			</Text>
			<Button
				variant="secondary"
				size="sm"
				label={url ? t`Edit` : t`Add`}
				disabled={locked}
				onPress={() => router.push(routes.entry(resumeId, "basics", "picture"))}
			/>
		</View>
	);
}

/** Extra contact details: icon, text and an optional link; move up and remove (with Undo). */
function CustomFields({ fields, locked }: { fields: CustomField[]; locked: boolean }) {
	const { t } = useLingui();
	const { colors, radius, space } = useTheme();
	const update = useResumeStore((state) => state.update);
	const undoToast = useUndoToast();
	const [iconFor, setIconFor] = useState<string | null>(null);
	const [linkFor, setLinkFor] = useState<string | null>(null);

	const edit = (key: string, mutate: (list: CustomField[]) => void) =>
		update((draft) => mutate(draft.basics.customFields), { coalesceKey: `basics.customFields.${key}` });
	const editField = (id: string, key: string, mutate: (field: CustomField) => void) =>
		edit(`${id}.${key}`, (list) => {
			const target = list.find((field) => field.id === id);
			if (target) mutate(target);
		});
	const linking = fields.find((field) => field.id === linkFor);

	return (
		<View style={{ gap: space.s2 }}>
			<Text variant="label">{t`Custom fields`}</Text>
			{fields.map((field, index) => (
				<View
					key={field.id}
					style={{
						gap: space.s1,
						padding: space.s2,
						borderRadius: radius.rLg,
						borderWidth: 1,
						borderColor: colors.line,
					}}
				>
					<TextField
						label={t`Field ${index + 1}`}
						value={field.text}
						editable={!locked}
						onChangeText={(text) =>
							editField(field.id, "text", (target) => {
								target.text = text;
							})
						}
					/>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<Button
							variant="ghost"
							size="sm"
							icon="bookmark-simple"
							label={field.icon || t`Icon`}
							disabled={locked}
							onPress={() => setIconFor(field.id)}
						/>
						<View style={{ flex: 1 }} />
						<IconButton
							icon={field.link ? "link-simple-horizontal" : "link-simple-horizontal-break"}
							label={field.link ? t`Edit link` : t`Add a link`}
							selected={!!field.link}
							disabled={locked}
							onPress={() => setLinkFor(field.id)}
						/>
						<IconButton
							icon="arrow-up"
							label={t`Move field up`}
							disabled={locked || index === 0}
							onPress={() => edit(`${field.id}.move`, (list) => list.splice(index - 1, 0, ...list.splice(index, 1)))}
						/>
						<IconButton
							icon="x"
							label={t`Remove field`}
							disabled={locked}
							onPress={() => {
								update((draft) => void draft.basics.customFields.splice(index, 1), { newStep: true });
								undoToast(t`Field removed`);
							}}
						/>
					</View>
				</View>
			))}
			{!locked ? (
				<Button
					variant="ghost"
					icon="plus"
					label={t`Add field`}
					onPress={() =>
						update(
							(draft) => void draft.basics.customFields.push({ id: generateId(), icon: "acorn", text: "", link: "" }),
							{
								newStep: true,
							},
						)
					}
				/>
			) : null}
			<IconPickerSheet
				open={iconFor !== null}
				value={fields.find((field) => field.id === iconFor)?.icon ?? ""}
				onClose={() => setIconFor(null)}
				onChange={(icon) => {
					if (iconFor)
						editField(iconFor, "icon", (target) => {
							target.icon = icon;
						});
					setIconFor(null);
				}}
			/>
			<PromptSheet
				open={linking !== undefined}
				title={linking?.link ? t`Edit link` : t`Add a link`}
				message={t`Leave it empty to remove the link.`}
				initialValue={linking?.link || "https://"}
				keyboardType="url"
				onClose={() => setLinkFor(null)}
				onSubmit={(link) => {
					const value = link.trim() === "https://" ? "" : link.trim();
					if (linkFor)
						editField(linkFor, "link", (target) => {
							target.link = value;
						});
					setLinkFor(null);
				}}
			/>
		</View>
	);
}
