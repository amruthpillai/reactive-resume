import type { RouterOutput } from "@/api/client";
import type { ResumeDocument } from "@/draft/types";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { client, orpc } from "@/api/client";
import { useResumeStore } from "@/draft";
import { useDocumentOperations } from "@/features/documents/queries";
import { flushResume } from "@/features/share/document";
import { usePreview } from "@/preview/usePreview";
import {
	Banner,
	Button,
	ConfirmDialog,
	IconButton,
	ListRow,
	Sheet,
	Skeleton,
	Text,
	TextField,
	showToast,
	useTheme,
} from "@/ui";

type Version = RouterOutput["resume"]["listVersions"][number];
function versionTitle(version: Version) {
	switch (version.kind) {
		case "named":
			return version.name || t`Named version`;
		case "created":
			return t`Created`;
		case "import":
			return t`Imported`;
		case "auto":
			return t`Editing session`;
		case "before-restore":
			return t`Before restore`;
		case "restored":
			return t`Restored a version`;
		case "ai":
			return t`AI edit`;
		case "sent":
			return version.name ? t`Sent to ${version.name}` : t`Sent`;
	}
}

type HistoryProps = { resume: ResumeDocument; offline: boolean };
export function HistoryPanel({ resume, offline }: HistoryProps) {
	const { t, i18n } = useLingui();
	const { space, colors, size } = useTheme();
	const window = useWindowDimensions();
	const operations = useDocumentOperations();
	const list = useQuery({
		...orpc.resume.listVersions.queryOptions({ input: { resumeId: resume.id } }),
		enabled: !offline,
	});
	const [selected, setSelected] = useState<Version | null>(null);
	const [menu, setMenu] = useState<Version | null>(null);
	const [mode, setMode] = useState<"menu" | "rename" | "delete">("menu");
	const [name, setName] = useState("");
	const [rename, setRename] = useState("");
	const [restoring, setRestoring] = useState(false);
	const disabled = operations.busy || offline;
	const save = async () => {
		if (
			await operations.run(async () => {
				await flushResume(resume.id);
				await client.resume.createVersion({ resumeId: resume.id, name: name.trim() });
			})
		) {
			setName("");
			void list.refetch();
			showToast({ message: t`Version saved` });
		}
	};
	const restore = async () => {
		setRestoring(false);
		if (!selected || resume.isLocked) return;
		if (
			await operations.run(async () => {
				await flushResume(resume.id);
				// The server writes "Before restore" before changing data. Reopen resets the draft baseline and undo.
				await client.resume.restoreVersion({ resumeId: resume.id, versionId: selected.id });
				await useResumeStore.getState().open(resume.id);
			})
		) {
			setSelected(null);
			void list.refetch();
			showToast({ message: t`Version restored. Your previous state is saved as “Before restore”.` });
		}
	};
	const mutateVersion = async (remove: boolean) => {
		if (!menu) return;
		const target = menu;
		if (
			await operations.run(async () => {
				if (remove) await client.resume.deleteVersion({ resumeId: resume.id, versionId: target.id });
				else await client.resume.renameVersion({ resumeId: resume.id, versionId: target.id, name: rename.trim() });
			})
		) {
			if (selected?.id === target.id) setSelected(remove ? null : { ...target, name: rename.trim() });
			setMenu(null);
			void list.refetch();
		}
	};
	return (
		<View
			style={{
				flex: 1,
				backgroundColor: colors.bg,
				flexDirection: selected && window.width >= size.panel * 2 ? "row-reverse" : "column",
			}}
		>
			{selected && (
				<View style={{ flex: 1 }}>
					<Banner tone="info" message={t`Viewing ${versionTitle(selected)} · read-only`} />
					<VersionPage key={selected.id} resumeId={resume.id} versionId={selected.id} offline={offline} />
					<View style={{ padding: space.s3, flexDirection: "row", flexWrap: "wrap", gap: space.s2 }}>
						<Button
							label={t`Restore this version`}
							disabled={disabled || resume.isLocked}
							onPress={() => setRestoring(true)}
						/>
						<Button
							label={t`Back to now`}
							variant="ghost"
							disabled={operations.busy}
							onPress={() => setSelected(null)}
						/>
					</View>
				</View>
			)}
			<ScrollView
				style={{ flex: 1 }}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{ padding: space.s4, gap: space.s3 }}
			>
				{offline && <Banner tone="info" message={t`You're offline. History needs a connection.`} />}
				{operations.error && <Banner tone="danger" message={operations.error} />}
				{!selected && (
					<>
						<TextField
							label={t`Name this version`}
							placeholder={t`For example, Sent to Lumen`}
							value={name}
							onChangeText={setName}
							maxLength={80}
							editable={!disabled}
							onSubmitEditing={() => {
								if (name.trim() && !disabled) void save();
							}}
						/>
						<Button
							label={t`Save`}
							variant="secondary"
							disabled={disabled || !name.trim()}
							loading={operations.busy}
							onPress={() => void save()}
						/>
					</>
				)}
				<ListRow
					title={t`Now`}
					subtitle={t`The resume as it is`}
					selected={!selected}
					disabled={operations.busy}
					onPress={() => setSelected(null)}
				/>
				{list.isError ? (
					<Banner
						tone="danger"
						message={t`Couldn't load versions.`}
						action={{ label: t`Retry`, onPress: () => void list.refetch() }}
					/>
				) : list.isPending && !offline ? (
					<Skeleton height={space.s12} />
				) : (
					list.data?.map((version) => (
						<ListRow
							key={version.id}
							title={versionTitle(version)}
							subtitle={version.createdAt.toLocaleString(i18n.locale)}
							selected={version.id === selected?.id}
							disabled={disabled}
							leading={version.kind === "named" ? "bookmark-simple" : "clock-counter-clockwise"}
							onPress={() => setSelected(version)}
							trailing={
								version.kind === "named" ? (
									<IconButton
										icon="dots-three"
										label={t`Options for ${versionTitle(version)}`}
										disabled={disabled}
										onPress={() => {
											setMenu(version);
											setRename(version.name ?? "");
											setMode("menu");
										}}
									/>
								) : undefined
							}
						/>
					))
				)}
				{list.isSuccess && list.data.length <= 1 && (
					<Text color="ink2">{t`Only one version so far. Every editing session adds one automatically.`}</Text>
				)}
				<Text
					variant="caption"
					color="ink3"
				>{t`Autosaves are grouped by session and kept for 90 days. Named versions are kept until you delete them. Restoring saves the current state first.`}</Text>
			</ScrollView>
			<Sheet
				open={!!menu && mode !== "delete"}
				title={mode === "rename" ? t`Rename version` : t`Version options`}
				onClose={() => {
					if (!operations.busy) setMenu(null);
				}}
				detents={[0.5, 0.9]}
			>
				<View style={{ padding: space.s4, gap: space.s3 }}>
					{operations.error && <Banner tone="danger" message={operations.error} />}
					{mode === "menu" ? (
						<>
							<ListRow title={t`Rename…`} leading="pencil-simple" onPress={() => setMode("rename")} />
							<ListRow title={t`Delete`} destructive leading="trash" onPress={() => setMode("delete")} />
						</>
					) : (
						<>
							<TextField label={t`Name`} value={rename} onChangeText={setRename} maxLength={80} editable={!disabled} />
							<Button
								label={t`Save`}
								loading={operations.busy}
								disabled={disabled || !rename.trim()}
								onPress={() => void mutateVersion(false)}
							/>
						</>
					)}
				</View>
			</Sheet>
			<ConfirmDialog
				open={!!menu && mode === "delete"}
				title={t`Delete this version?`}
				message={t`Named versions are kept until you delete them. This can't be undone.`}
				destructive
				confirmLabel={t`Delete`}
				onCancel={() => setMenu(null)}
				onConfirm={() => {
					setMode("menu");
					void mutateVersion(true);
				}}
			/>
			<ConfirmDialog
				open={restoring}
				title={t`Restore this version?`}
				message={t`The current state will be saved as “Before restore” first.`}
				confirmLabel={t`Restore`}
				onCancel={() => setRestoring(false)}
				onConfirm={() => void restore()}
			/>
		</View>
	);
}

type VersionPageProps = { resumeId: string; versionId: string; offline: boolean };
function VersionPage({ resumeId, versionId, offline }: VersionPageProps) {
	const { t } = useLingui();
	const { space, colors, size } = useTheme();
	const window = useWindowDimensions();
	const version = useQuery({
		...orpc.resume.getVersion.queryOptions({ input: { resumeId, versionId } }),
		enabled: !offline,
	});
	const preview = usePreview(version.data?.data ?? null);
	const width = Math.max(size.hit, window.width - space.s8);
	return (
		<ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.s4, gap: space.s3, alignItems: "center" }}>
			{version.isError || preview.error ? (
				<Banner
					tone="danger"
					message={t`Couldn't load this version's page.`}
					action={{
						label: t`Retry`,
						onPress: () => {
							void version.refetch();
							preview.retry();
						},
					}}
				/>
			) : !preview.result ? (
				<Skeleton height={size.hit * 3} />
			) : (
				preview.result.pages.map((page) => (
					<Image
						key={page.index}
						source={{ uri: page.uri }}
						accessibilityLabel={t`Page ${page.index + 1} · read-only`}
						style={{ width, maxWidth: "100%", aspectRatio: page.width / page.height, backgroundColor: colors.paper }}
						contentFit="contain"
					/>
				))
			)}
			{preview.result?.hasTextLoss && <Banner tone="warn" message={t`Some text couldn't be rendered.`} />}
		</ScrollView>
	);
}
