import type { ResumeDraftStore } from "@/draft/types";
import type { PageMapNode } from "@reactive-resume/pdf/page-map";
import { useLingui } from "@lingui/react/macro";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { fitResume } from "./fit";
import { usePreview } from "./usePreview";
import { routes } from "@/routes";
import { Banner, Button, IconButton, Text, useReducedMotion, useTheme } from "@/ui";

export type ResumePageProps = {
	id: string;
	draft: Pick<ResumeDraftStore, "data" | "update" | "locked" | "undo">;
	focused?: boolean | undefined;
	/** What the page renders, when it differs from the draft (the Assistant's pending edits marked). Fit and editing use the draft. */
	previewData?: ResumeDraftStore["data"] | undefined;
};

/** The Page body consumes M1's DraftStore contract; shells and draft persistence stay with their owners. */
export function ResumePage({ id, draft, focused, previewData }: ResumePageProps) {
	const router = useRouter();
	const { t } = useLingui();
	const theme = useTheme();
	const { colors, space, size, motion, shadows } = theme;
	const window = useWindowDimensions();
	const [viewport, setViewport] = useState({ width: window.width, height: window.height });
	const [zoom, setZoom] = useState<number | null>(null);
	const [offset, setOffset] = useState(0);
	const [rows, setRows] = useState<Record<number, { y: number; height: number }>>({});
	const [selected, setSelected] = useState<{ node: PageMapNode; data: ResumeDraftStore["data"] } | null>(null);
	const selection = selected?.data === draft.data ? selected.node : null;
	const [fitting, setFitting] = useState(false);
	const [fitFailed, setFitFailed] = useState(false);
	const [fitApplied, setFitApplied] = useState(false);
	const reducedMotion = useReducedMotion();
	const latestData = useRef(draft.data);
	useLayoutEffect(() => {
		latestData.current = draft.data;
	}, [draft.data]);
	const mounted = useRef(true);
	const liveZoom = useSharedValue(1);
	const pinchStart = useSharedValue(1);
	const committedZoom = zoom ?? 1;
	useLayoutEffect(() => {
		liveZoom.set(committedZoom);
	}, [committedZoom, liveZoom]);
	const zoomStyle = useAnimatedStyle(() => ({ transform: [{ scale: liveZoom.get() / committedZoom }] }));
	const { data } = draft;
	const fitWidth = Math.max(size.hit, viewport.width - space.s8);
	const measured = Object.entries(rows)
		.filter(([, row]) => row.y + row.height >= offset && row.y <= offset + viewport.height)
		.map(([index]) => Number(index));
	const shown = previewData ?? data;
	const preview = usePreview(shown, shown?.metadata.template, {
		focused,
		pages: Object.keys(rows).length > 0 ? measured : [0],
		viewport: { width: fitWidth, height: viewport.height, offset, zoom: zoom ?? 1 },
	});
	const { result, displayScale } = preview;
	const pageSizes = result?.pageMap.pages ?? [];

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	const fit = async () => {
		if (!data || fitting || draft.locked) return;
		setFitting(true);
		setFitFailed(false);
		try {
			const fitted = await fitResume(data, () => mounted.current && latestData.current === data);
			if (!mounted.current || latestData.current !== data) return;
			let applied = false;
			draft.update(
				(value) => {
					// A newer edit can reach the store before React commits its next render.
					if (JSON.stringify(value) !== JSON.stringify(data)) return;
					value.metadata = fitted.data.metadata;
					applied = true;
				},
				{ newStep: true },
			);
			if (applied) {
				setFitApplied(true);
				setFitFailed(!fitted.fits);
			}
		} catch {
			if (mounted.current) setFitFailed(true);
		} finally {
			if (mounted.current) setFitting(false);
		}
	};
	const authored = Math.max(1, data?.metadata.layout.pages.length ?? 1);
	const overflow = result && result.pageCount > authored;
	const currentPage = Math.min(
		result?.pageCount ?? 1,
		Number(Object.entries(rows).find(([, row]) => row.y + row.height > offset)?.[0] ?? 0) + 1,
	);
	// Scale the existing raster under the fingers; relayout and request sharper pages only after release.
	const pageGesture = useMemo(() => {
		const pinch = Gesture.Pinch()
			.onStart(() => pinchStart.set(liveZoom.get()))
			.onUpdate((event) => liveZoom.set(Math.min(1.5, Math.max(0.6, pinchStart.get() * event.scale))))
			.onFinalize((_event, success) => {
				if (success) scheduleOnRN(setZoom, liveZoom.get());
				else liveZoom.set(committedZoom);
			});
		const doubleTap = Gesture.Tap()
			.numberOfTaps(2)
			.onEnd((_event, success) => {
				if (success) scheduleOnRN(setZoom, committedZoom === 1.5 ? null : 1.5);
			});
		return Gesture.Simultaneous(pinch, doubleTap);
	}, [committedZoom, liveZoom, pinchStart]);

	const selectAt = (page: number, x: number, y: number) => {
		// Nearest header/item wins within a 44 pt target; section boxes never steal their entries' taps.
		const candidates = result?.pageMap.nodes.filter((node) => node.page === page && node.kind !== "section") ?? [];
		let selected: PageMapNode | null = null;
		let best = Number.POSITIVE_INFINITY;
		for (const node of candidates) {
			const dx = Math.max(node.x * displayScale - x, 0, x - (node.x + node.width) * displayScale);
			const dy = Math.max(node.y * displayScale - y, 0, y - (node.y + node.height) * displayScale);
			const distance = Math.hypot(dx, dy);
			if (distance <= size.hit / 2 && distance < best) {
				selected = node;
				best = distance;
			}
		}
		setSelected(selected ? { node: selected, data } : null);
	};
	const edit = () => {
		if (selection?.kind === "item") router.push(routes.entry(id, selection.sectionId, selection.itemId));
		else router.push(routes.builder(id, "write"));
	};

	return (
		<View
			style={{ flex: 1, backgroundColor: colors.sunken }}
			onLayout={(event) => setViewport(event.nativeEvent.layout)}
		>
			{preview.error ? (
				<Banner
					tone="danger"
					message={t`Preview could not be rendered. Retry, or try another template or font in Design.`}
					action={{ label: t`Retry`, onPress: preview.retry }}
				/>
			) : null}
			{result?.hasTextLoss ? (
				<Banner
					tone="warn"
					message={
						result.lostCharacters.length > 0
							? t`Some characters could not be drawn: ${result.lostCharacters.join(", ")}. Choose another font in Design.`
							: t`Some text could not be drawn. Choose another font in Design.`
					}
				/>
			) : null}
			{fitFailed ? (
				<Banner tone="warn" message={t`Content still runs over. Hide a section or shorten entries.`} />
			) : null}
			{fitApplied ? (
				<Button
					variant="link"
					label={t`Undo`}
					onPress={() => {
						draft.undo();
						setFitApplied(false);
						setFitFailed(false);
					}}
				/>
			) : null}
			{!result && !preview.error ? (
				<View style={{ padding: space.s8, alignItems: "center", gap: space.s3 }}>
					<ActivityIndicator color={colors.accent} />
					<Text color="ink3">{data ? t`Rendering preview…` : t`Loading resume…`}</Text>
				</View>
			) : null}
			<GestureDetector gesture={pageGesture}>
				<ScrollView horizontal contentContainerStyle={{ minWidth: viewport.width }}>
					<ScrollView
						onScroll={(event) => setOffset(event.nativeEvent.contentOffset.y)}
						scrollEventThrottle={100}
						contentContainerStyle={{ padding: space.s4, gap: space.s8, alignItems: "center", minWidth: viewport.width }}
					>
						<Animated.View style={[{ gap: space.s8, alignItems: "center", transformOrigin: "center top" }, zoomStyle]}>
							{pageSizes.map((page, index) => {
								const image = result?.pages.find((entry) => entry.index === index);
								const width = page.width * displayScale;
								const height = page.height * displayScale;
								return (
									<View
										key={index}
										style={{ gap: space.s2 }}
										onLayout={(event) => {
											const { y: rowY, height } = event.nativeEvent.layout;
											const y = rowY + space.s4;
											setRows((previous) =>
												previous[index]?.y === y && previous[index]?.height === height
													? previous
													: { ...previous, [index]: { y, height } },
											);
										}}
									>
										<Text variant="caption" color="ink3" align="center">{t`Page ${index + 1}`}</Text>
										{index === 0 && overflow ? (
											<View style={{ maxWidth: width, gap: space.s1 }}>
												<Text variant="callout" color="warnText">{t`Runs onto page ${authored + 1}`}</Text>
												<Button
													variant="secondary"
													label={authored === 1 ? t`Fit to one page` : t`Fit to ${authored} pages`}
													disabled={draft.locked || preview.rendering}
													loading={fitting}
													onPress={() => {
														void fit();
													}}
												/>
											</View>
										) : null}
										<Pressable
											accessibilityRole="button"
											accessibilityLabel={t`Select an entry on page ${index + 1}`}
											accessibilityActions={(result?.pageMap.nodes ?? [])
												.filter((node) => node.page === index && node.kind !== "section")
												.map((node, entry) => ({ name: node.key, label: t`Select entry ${entry + 1}` }))}
											onAccessibilityAction={(event) => {
												const node = result?.pageMap.nodes.find(
													(value) => value.key === event.nativeEvent.actionName && value.page === index,
												);
												if (node) setSelected({ node, data });
											}}
											onPress={(event) => selectAt(index, event.nativeEvent.locationX, event.nativeEvent.locationY)}
											style={{ width, height, backgroundColor: colors.paper, boxShadow: shadows.ePage.boxShadow }}
										>
											{image ? (
												<Image
													source={{ uri: image.uri }}
													style={{ width, height }}
													contentFit="fill"
													transition={reducedMotion ? 0 : motion.d2}
													cachePolicy="none"
													accessible={false}
												/>
											) : null}
											{selection?.page === index ? (
												<View
													pointerEvents="none"
													style={{
														position: "absolute",
														left: selection.x * displayScale,
														top: selection.y * displayScale,
														width: selection.width * displayScale,
														height: selection.height * displayScale,
														borderWidth: 1,
														borderColor: colors.pageSelectLine,
														backgroundColor: colors.pageSelectFill,
													}}
												/>
											) : null}
										</Pressable>
									</View>
								);
							})}
						</Animated.View>
					</ScrollView>
				</ScrollView>
			</GestureDetector>
			{selection ? (
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						paddingHorizontal: space.s4,
						backgroundColor: colors.surface,
						gap: space.s2,
					}}
				>
					<Text style={{ flex: 1 }} numberOfLines={1}>
						{selection.kind === "header" ? t`Basics` : t`Selected entry`}
					</Text>
					<Button label={t`Edit entry`} variant="ghost" icon="pencil-simple" onPress={edit} />
					<IconButton icon="x" label={t`Clear selection`} onPress={() => setSelected(null)} />
				</View>
			) : null}
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-around",
					backgroundColor: colors.surface,
					padding: space.s1,
				}}
			>
				<IconButton
					icon="minus"
					label={t`Zoom out`}
					disabled={(zoom ?? 1) <= 0.6}
					onPress={() => setZoom((value) => Math.max(0.6, Math.round(((value ?? 1) - 0.1) * 10) / 10))}
				/>
				<Button
					variant="ghost"
					label={zoom === null ? t`Fit` : t`${Math.round(zoom * 100)}%`}
					onPress={() => setZoom(null)}
				/>
				<IconButton
					icon="plus"
					label={t`Zoom in`}
					disabled={(zoom ?? 1) >= 1.5}
					onPress={() => setZoom((value) => Math.min(1.5, Math.round(((value ?? 1) + 0.1) * 10) / 10))}
				/>
				<Text
					variant="caption"
					color="ink3"
					accessibilityLiveRegion="polite"
				>{t`Page ${currentPage} of ${result?.pageCount ?? 1}`}</Text>
				{preview.rendering && result ? <ActivityIndicator color={colors.accent} /> : null}
			</View>
		</View>
	);
}
