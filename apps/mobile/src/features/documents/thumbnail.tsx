import type { DocumentSummary } from "./filter";
import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useState } from "react";
import { PixelRatio, View } from "react-native";
import { stripHtml } from "@reactive-resume/utils/string";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { useLetterStore, useResumeStore } from "@/draft/runtime";
import { usePreview } from "@/preview/usePreview";
import { Icon, Text, useTheme } from "@/ui";

type ThumbnailProps = { document: DocumentSummary; visible: boolean; compact?: boolean };

export function Thumbnail({ document, visible, compact = false }: ThumbnailProps) {
	const { t } = useLingui();
	const { colors, space, radius, size } = useTheme();
	const session = useSession();
	const [width, setWidth] = useState(0);
	const options = orpc.coverLetters.getById.queryOptions({ input: { id: document.id } });
	const letter = useQuery({
		...options,
		queryKey: [...options.queryKey, session.server, document.updatedAt.getTime()],
		enabled: visible && document.type === "letter" && session.status === "signed-in",
	});
	const draftText = useLetterStore((state) => (state.document?.id === document.id ? state.data?.content : undefined));
	const resumeOptions = orpc.resume.getById.queryOptions({ input: { id: document.id } });
	const resume = useQuery({
		...resumeOptions,
		queryKey: [...resumeOptions.queryKey, session.server, document.updatedAt.getTime()],
		enabled: visible && document.type === "resume" && session.status === "signed-in",
	});
	const draftData = useResumeStore((state) => (state.document?.id === document.id ? state.data : undefined));
	const preview = usePreview(
		visible && document.type === "resume" && session.status === "signed-in" && width > 0
			? (draftData ?? resume.data?.data ?? null)
			: null,
		undefined,
		{ pages: [0], scale: Math.max(0.1, (width / 595.28) * PixelRatio.get()) },
	);
	const firstPage = preview.result?.pages[0];
	return (
		<View
			onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
			style={{
				backgroundColor: colors.paper,
				borderColor: colors.paperLine,
				borderWidth: 1,
				borderRadius: radius.rSm,
				padding: document.type === "resume" ? 0 : compact ? space.s1 : space.s4,
				overflow: "hidden",
				...(compact ? { width: size.hit, height: size.row } : { width: "100%", aspectRatio: 210 / 297 }),
			}}
		>
			{document.type === "letter" ? (
				// A miniature of the page: it scales with the card, not with the text-size setting (tokens.md `pageThumb`).
				<Text variant="callout" color="paperInk" numberOfLines={compact ? 2 : 12} maxFontSizeMultiplier={1}>
					{stripHtml((draftText ?? letter.data?.content ?? "").replace(/<\/p>|<br\s*\/?>/gi, "\n")) ||
						(letter.isError ? t`Couldn't load letter` : letter.isPending ? t`Loading letter…` : t`Empty letter`)}
				</Text>
			) : firstPage ? (
				<Image source={{ uri: firstPage.uri }} contentFit="contain" style={{ width: "100%", height: "100%" }} />
			) : (
				<View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.s2 }}>
					<Icon name="file-text" color={colors.paperInk} size={size.icon.bar} />
					{!compact && <Text variant="caption" color="paperInk">{t`Resume preview`}</Text>}
				</View>
			)}
		</View>
	);
}
