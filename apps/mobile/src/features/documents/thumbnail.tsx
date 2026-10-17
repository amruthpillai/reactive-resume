import type { DocumentSummary } from "./filter";
import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { stripHtml } from "@reactive-resume/utils/string";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";
import { useLetterStore } from "@/draft/runtime";
import { Icon, Text, useTheme } from "@/ui";

type ThumbnailProps = { document: DocumentSummary; visible: boolean; compact?: boolean };

export function Thumbnail({ document, visible, compact = false }: ThumbnailProps) {
	const { t } = useLingui();
	const { colors, space, radius, size } = useTheme();
	const session = useSession();
	const options = orpc.coverLetters.getById.queryOptions({ input: { id: document.id } });
	const letter = useQuery({
		...options,
		queryKey: [...options.queryKey, session.server, document.updatedAt.getTime()],
		enabled: visible && document.type === "letter" && session.status === "signed-in",
	});
	const draftText = useLetterStore((state) => (state.document?.id === document.id ? state.data?.content : undefined));
	return (
		<View
			style={{
				backgroundColor: colors.paper,
				borderColor: colors.paperLine,
				borderWidth: 1,
				borderRadius: radius.rSm,
				padding: compact ? space.s1 : space.s4,
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
			) : (
				// PREVIEW SEAM (M3-T4): replace this placeholder with usePreview / the first-page thumbnail helper.
				<View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.s2 }}>
					<Icon name="file-text" color={colors.paperInk} size={size.icon.bar} />
					{!compact && <Text variant="caption" color="paperInk">{t`Resume preview`}</Text>}
				</View>
			)}
		</View>
	);
}
