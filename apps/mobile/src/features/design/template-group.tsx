import type { DesignWrite } from "./draft";
import type { TemplateFilter } from "./presets";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { useLingui } from "@lingui/react/macro";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { PixelRatio, Pressable, ScrollView, View } from "react-native";
import { templateLayouts } from "@reactive-resume/schema/templates";
import { isRTL } from "@reactive-resume/utils/locale";
import { Field, Slider } from "./controls";
import { TEMPLATES, matchesFilter, templateName } from "./presets";
import { useSession } from "@/auth/session";
import { usePreview } from "@/preview/usePreview";
import { Chip, Icon, Segmented, Text, useTheme } from "@/ui";

const A4_WIDTH_PT = 595.28;

type TemplateGroupProps = {
	data: ResumeData;
	write: DesignWrite;
	/** Half sheet: one sideways strip. Full sheet and tablet: a grid of `columns`. */
	layout: "strip" | "grid";
	columns?: number | undefined;
	width: number;
	disabled: boolean;
	preview: Template | null;
	/** Press and hold shows a template on the page; null clears it. */
	onPreview: (template: Template | null) => void;
	onApply: (template: Template) => void;
};

/** Template: filter chips, then thumbnails rendered from the user's own resume, one at a time. */
export function TemplateGroup(props: TemplateGroupProps) {
	const { data, layout, columns = 3, width, disabled, preview, onPreview, onApply } = props;
	const { t } = useLingui();
	const { space } = useTheme();
	const [filter, setFilter] = useState<TemplateFilter>("all");
	// Thumbnails render from the resume as it was when Template opened, so every edit doesn't redraw 17 pages.
	const [snapshot] = useState(data);
	const [rendered, setRendered] = useState(0);
	const shown = TEMPLATES.filter((id) => matchesFilter(id, filter));
	const current = data.metadata.template;
	const cardWidth =
		layout === "strip" ? space.s12 * 2 + space.s4 : (width - space.s3 * (columns - 1)) / Math.max(1, columns);
	const filters: { id: TemplateFilter; label: string }[] = [
		{ id: "all", label: t`All` },
		{ id: "one", label: t`One column` },
		{ id: "two", label: t`Two columns` },
		{ id: "ats", label: t`ATS-safe` },
	];
	const cards = shown.map((id, index) => (
		<TemplateCard
			key={id}
			id={id}
			data={snapshot}
			width={cardWidth}
			// Renders wait their turn: card n starts once the n cards before it have finished.
			enabled={index <= rendered}
			onRendered={() => setRendered((value) => Math.max(value, index + 1))}
			selected={id === current}
			previewing={id === preview}
			disabled={disabled}
			onPreview={onPreview}
			onApply={onApply}
		/>
	));

	return (
		<View style={{ gap: space.s3 }}>
			<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.s2 }}>
				{filters.map((option) => (
					<Chip
						key={option.id}
						label={option.label}
						selected={filter === option.id}
						onPress={() => {
							setFilter(option.id);
							setRendered(0);
						}}
					/>
				))}
				<Text variant="caption" color="ink3" style={{ marginStart: "auto" }}>
					{t`${shown.length} of ${TEMPLATES.length} shown`}
				</Text>
			</View>
			{layout === "strip" ? (
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s3 }}>
					{cards}
				</ScrollView>
			) : (
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s3 }}>{cards}</View>
			)}
			{templateLayouts[current].columns === 2 ? <SidebarCard {...props} /> : null}
		</View>
	);
}

type TemplateCardProps = {
	id: Template;
	data: ResumeData;
	width: number;
	enabled: boolean;
	onRendered: () => void;
	selected: boolean;
	previewing: boolean;
	disabled: boolean;
	onPreview: (template: Template | null) => void;
	onApply: (template: Template) => void;
};

/** How long a released press-and-hold preview stays on the page so it can be read (mockup). */
const PREVIEW_LINGER_MS = 3000;

function TemplateCard(props: TemplateCardProps) {
	const { id, data, width, enabled, onRendered, selected, previewing, disabled, onPreview, onApply } = props;
	const { t } = useLingui();
	const { colors, fonts, motion, radius, space, shadows } = useTheme();
	const session = useSession();
	const [held, setHeld] = useState(false);
	const preview = usePreview(enabled ? data : null, id, {
		pages: [0],
		scale: Math.min(6, (width / A4_WIDTH_PT) * PixelRatio.get()),
	});
	const thumbnail = preview.result?.pages[0]?.uri;
	const done = !!thumbnail || preview.error;
	useEffect(() => {
		if (done) onRendered();
	}, [done, onRendered]);
	useEffect(() => {
		if (held || !previewing) return;
		const timer = setTimeout(() => onPreview(null), PREVIEW_LINGER_MS);
		return () => clearTimeout(timer);
	}, [held, previewing, onPreview]);

	const layout = templateLayouts[id];
	const tags = [layout.columns === 1 ? t`One column` : t`Two columns`, layout.atsSafe ? t`ATS-safe` : null]
		.filter(Boolean)
		.join(" · ");
	const name = templateName(id);

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={name}
			accessibilityHint={t`Press and hold to preview it on the page.`}
			accessibilityState={{ selected, disabled }}
			disabled={disabled}
			delayLongPress={400}
			onLongPress={() => {
				setHeld(true);
				void Haptics.selectionAsync();
				onPreview(selected ? null : id);
			}}
			onPressOut={() => setHeld(false)}
			onPress={() => {
				onPreview(null);
				onApply(id);
			}}
			style={({ pressed }) => ({ width, gap: space.s1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
		>
			<View
				style={{
					aspectRatio: 210 / 297,
					borderRadius: radius.rMd,
					borderWidth: selected || previewing ? 2 : 1,
					borderColor: selected || previewing ? colors.accent : colors.line,
					backgroundColor: colors.paper,
					overflow: "hidden",
					boxShadow: shadows.e1.boxShadow,
				}}
			>
				<Image
					source={{ uri: thumbnail ?? `${session.server}/templates/jpg/${id}.jpg` }}
					contentFit="cover"
					contentPosition="top"
					transition={motion.d2}
					style={{ flex: 1 }}
				/>
				{selected ? (
					<View
						style={{
							position: "absolute",
							top: space.s1,
							end: space.s1,
							width: space.s5,
							height: space.s5,
							borderRadius: radius.rPill,
							backgroundColor: colors.accent,
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Icon name="check" size={14} color={colors.onAccent} />
					</View>
				) : null}
			</View>
			<Text variant="callout" numberOfLines={1} style={{ fontFamily: fonts.ui[500] }}>
				{name}
			</Text>
			<Text variant="caption" color="ink3" numberOfLines={1}>
				{tags}
			</Text>
		</Pressable>
	);
}

/** Two-column templates: the sidebar's side and width. Write moves sections between columns. */
function SidebarCard({ data, write, disabled }: TemplateGroupProps) {
	const { t } = useLingui();
	const { colors, radius, space } = useTheme();
	const own = templateLayouts[data.metadata.template].sidebarSide ?? "left";
	// The side the page shows now: the chosen one, else the template's own (mirrored on right-to-left pages).
	const shownOwn = isRTL(data.metadata.page.locale) ? (own === "left" ? "right" : "left") : own;
	const side = data.metadata.layout.sidebarSide ?? shownOwn;
	const width = data.metadata.layout.sidebarWidth;
	return (
		<View
			style={{
				gap: space.s3,
				padding: space.s3,
				borderRadius: radius.rLg,
				borderWidth: 1,
				borderColor: colors.line,
				backgroundColor: colors.bg,
				opacity: disabled ? 0.45 : 1,
			}}
			pointerEvents={disabled ? "none" : "auto"}
		>
			<Text variant="label">{t`Sidebar`}</Text>
			<Segmented
				label={t`Sidebar side`}
				value={side}
				options={[
					{ value: "left", label: t`Left` },
					{ value: "right", label: t`Right` },
				]}
				onChange={(value) =>
					write(
						"sidebarSide",
						(draft) => {
							draft.metadata.layout.sidebarSide = value;
						},
						true,
					)
				}
			/>
			<Field label={t`Width`} value={`${width}%`}>
				<Slider
					label={t`Sidebar width`}
					value={width}
					min={10}
					max={50}
					step={1}
					format={(value) => `${value}%`}
					disabled={disabled}
					onChange={(value) =>
						write(
							"sidebarWidth",
							(draft) => {
								draft.metadata.layout.sidebarWidth = value;
							},
							true,
						)
					}
				/>
			</Field>
		</View>
	);
}
