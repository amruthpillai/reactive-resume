import type { Application } from "@/features/applications/types";
import type { ApplicationStatus } from "@reactive-resume/schema/applications/data";
import type { ComponentRef } from "react";
import type { ScrollView } from "react-native";
import { useLingui } from "@lingui/react/macro";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, LegacyScrollView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from "react-native-reanimated";
import { ApplicationsViewFrame, useIsTablet } from "./views";
import { CloseSheet, MarkAppliedSheet } from "@/features/application-detail/sheets";
import { applicationError } from "@/features/applications/error";
import { describeNextStep, getNextStep } from "@/features/applications/next-step";
import { useApplicationMutations, useApplications } from "@/features/applications/queries";
import { getStageColor, getStageLabel } from "@/features/applications/stages";
import { routes } from "@/routes";
import { Banner, Button, Card, EmptyState, ListRow, Sheet, Skeleton, Switch, Text, showToast, useTheme } from "@/ui";

const STAGES: readonly ApplicationStatus[] = ["saved", "applied", "screening", "interview", "offer", "closed"];
// Column widths from the mockup (career.html `.column`): phone 268 pt, tablet 250 pt.
const PHONE_COLUMN = 268;
const TABLET_COLUMN = 250;
// Cards mounted per column at first; the rest show in batches, as web.
const COLUMN_PAGE_SIZE = 50;
const LONG_PRESS_MS = 400;
// While a card is held this close to the board's edge, the board scrolls one column, at most this often.
const AUTO_SCROLL_EVERY_MS = 500;

type Rect = { x: number; width: number };
type Drag = { application: Application; left: number; top: number; width: number };
type SheetState = { kind: "move" | "close" | "applied"; application: Application };
type DragEvent = { absoluteX: number; absoluteY: number; x: number; y: number };
type DragHandlers = {
	start: (application: Application, event: DragEvent, width: number) => void;
	move: (absoluteX: number, translationX: number, translationY: number) => void;
	end: (drop: boolean) => void;
};

export function BoardScreen() {
	return (
		<ApplicationsViewFrame current="board">
			<Board />
		</ApplicationsViewFrame>
	);
}

/**
 * A column per stage. Long press a card to drag it to another column; Move to… does the same without dragging.
 * Dropping on Closed asks for a reason and Saved → Applied asks what was sent, as the detail screen does.
 */
function Board() {
	const { t } = useLingui();
	const { radius, shadows, space } = useTheme();
	const { width: windowWidth } = useWindowDimensions();
	const tablet = useIsTablet();
	const reduceMotion = useReducedMotion();
	const query = useApplications();
	const { update } = useApplicationMutations();
	const [showClosed, setShowClosed] = useState(false);
	const [sheet, setSheet] = useState<SheetState | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);
	const [drag, setDrag] = useState<Drag | null>(null);
	const [hover, setHover] = useState<ApplicationStatus | null>(null);
	// The list publishes the optimistic move after an await, so until then the board shows the card in its new column
	// itself; otherwise it blinks back for a frame (web board does the same).
	const [pending, setPending] = useState<{ id: string; from: ApplicationStatus; to: ApplicationStatus } | null>(null);
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
	const board = useRef<ComponentRef<typeof View>>(null);
	const boardRect = useRef({ x: 0, y: 0, width: 0 });
	const columns = useRef(new Map<ApplicationStatus, ComponentRef<typeof View>>());
	const rects = useRef(new Map<ApplicationStatus, Rect>());
	const scrollX = useRef(0);
	const autoScrolled = useRef(false);
	const hovered = useRef<ApplicationStatus | null>(null);
	const dragged = useRef<Application | null>(null);

	const applications = query.data ?? [];
	if (pending && applications.find((application) => application.id === pending.id)?.status !== pending.from) {
		setPending(null);
	}
	const statusOf = (application: Application) =>
		pending?.id === application.id ? pending.to : (application.status as ApplicationStatus);
	const stages = showClosed ? STAGES : STAGES.filter((stage) => stage !== "closed");
	const byStage = new Map<ApplicationStatus, Application[]>(stages.map((stage) => [stage, []]));
	for (const application of applications) byStage.get(statusOf(application))?.push(application);

	const columnWidth = tablet ? TABLET_COLUMN : Math.min(PHONE_COLUMN, windowWidth - space.s4 * 2 - space.s8);
	const cardWidth = columnWidth - space.s3 * 2;

	const openSheet = (kind: SheetState["kind"], application: Application) => {
		setSheet({ kind, application });
		setSheetOpen(true);
	};

	const moveTo = (application: Application, stage: ApplicationStatus) => {
		const from = statusOf(application);
		if (stage === from) return;
		if (stage === "closed") return openSheet("close", application);
		if (from === "saved" && stage === "applied") return openSheet("applied", application);
		setPending({ id: application.id, from: application.status as ApplicationStatus, to: stage });
		update.mutate(
			{ id: application.id, status: stage },
			{
				onSuccess: () => showToast({ message: t`Moved to ${getStageLabel(stage)}` }),
				onError: (error) => showToast({ message: applicationError(error) }),
			},
		);
	};

	// Column positions in the window, re-read whenever the board scrolls during a drag (also right for RTL).
	const measureColumns = () => {
		for (const [stage, view] of columns.current) {
			view.measureInWindow((x, _y, width) => rects.current.set(stage, { x, width }));
		}
	};
	const stageAt = (absoluteX: number) => {
		for (const [stage, rect] of rects.current) {
			if (absoluteX >= rect.x && absoluteX <= rect.x + rect.width) return stage;
		}
		return null;
	};

	const handlers: DragHandlers = {
		start: (application, event, width) => {
			rects.current.clear();
			measureColumns();
			translateX.set(0);
			translateY.set(0);
			hovered.current = null;
			dragged.current = application;
			setHover(null);
			// The card's corner in the window; the preview sits there inside the board, then follows the finger.
			const originX = event.absoluteX - event.x;
			const originY = event.absoluteY - event.y;
			setDrag({ application, left: originX - boardRect.current.x, top: originY - boardRect.current.y, width });
			board.current?.measureInWindow((x, y, boardWidth) => {
				boardRect.current = { x, y, width: boardWidth };
				setDrag((current) => current && { ...current, left: originX - x, top: originY - y });
			});
			void Haptics.selectionAsync();
		},
		move: (absoluteX, translationX, translationY) => {
			translateX.set(translationX);
			translateY.set(translationY);
			const stage = stageAt(absoluteX);
			if (stage !== hovered.current) {
				hovered.current = stage;
				setHover(stage);
			}
			const { x, width } = boardRect.current;
			const edge = absoluteX < x + space.s10 ? -1 : absoluteX > x + width - space.s10 ? 1 : 0;
			if (edge !== 0 && !autoScrolled.current) {
				autoScrolled.current = true;
				setTimeout(() => {
					autoScrolled.current = false;
				}, AUTO_SCROLL_EVERY_MS);
				const target = Math.max(0, scrollX.current + edge * (columnWidth + space.s3));
				scrollRef.current?.scrollTo({ x: target, animated: !reduceMotion });
			}
		},
		end: (drop) => {
			const target = hovered.current;
			const application = dragged.current;
			// Every tap finalizes the pan too; only a started drag has anything to undo.
			if (!application) return;
			hovered.current = null;
			dragged.current = null;
			setHover(null);
			setDrag(null);
			if (drop && target) {
				void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
				moveTo(application, target);
			}
		},
	};
	// Cards get a proxy that never changes, so a re-render mid-drag doesn't rebuild (and cancel) their pan gesture.
	const latest = useRef(handlers);
	useEffect(() => {
		latest.current = handlers;
	});
	const [stableHandlers] = useState<DragHandlers>(() => ({
		start: (...args) => latest.current.start(...args),
		move: (...args) => latest.current.move(...args),
		end: (...args) => latest.current.end(...args),
	}));

	// The lifted card follows the finger, slightly raised unless Reduce Motion is on.
	const lift = reduceMotion ? 1 : 1.02;
	const overlayStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.get() }, { translateY: translateY.get() }, { scale: lift }],
	}));

	if (query.isError) {
		return (
			<View style={{ padding: space.s4, gap: space.s3 }}>
				<Banner tone="warn" message={applicationError(query.error)} />
				<Button label={t`Retry loading applications`} onPress={() => void query.refetch()} />
			</View>
		);
	}
	if (query.isPending) {
		return (
			<View style={{ padding: space.s4, gap: space.s3 }}>
				<Skeleton height={space.s12} />
				<Skeleton height={space.s12} />
			</View>
		);
	}
	if (applications.length === 0) {
		return (
			<EmptyState
				icon="briefcase"
				title={t`Your job search starts here`}
				message={t`Save a job link, paste a posting, or fill in the details manually.`}
				action={{ label: t`Open the list`, onPress: () => router.replace(routes.applications()) }}
			/>
		);
	}

	return (
		<View style={{ flex: 1 }}>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					gap: space.s3,
					paddingHorizontal: space.s4,
				}}
			>
				<Text variant="callout" color="ink3" style={{ flex: 1 }}>
					{t`Long press a card to drag it to another stage.`}
				</Text>
				<Switch label={t`Show closed`} value={showClosed} onValueChange={setShowClosed} />
			</View>
			<View
				ref={board}
				style={{ flex: 1 }}
				onLayout={() =>
					board.current?.measureInWindow((x, y, width) => {
						boardRect.current = { x, y, width };
					})
				}
			>
				<LegacyScrollView
					ref={scrollRef}
					horizontal
					showsHorizontalScrollIndicator={false}
					scrollEnabled={!drag}
					snapToInterval={tablet ? undefined : columnWidth + space.s3}
					decelerationRate={tablet ? "normal" : "fast"}
					scrollEventThrottle={16}
					onScroll={(event) => {
						scrollX.current = event.nativeEvent.contentOffset.x;
						if (drag) measureColumns();
					}}
					contentContainerStyle={{ padding: space.s4, gap: space.s3 }}
				>
					{stages.map((stage) => (
						<Column
							key={stage}
							stage={stage}
							applications={byStage.get(stage) ?? []}
							width={columnWidth}
							cardWidth={cardWidth}
							highlighted={hover === stage && drag !== null && statusOf(drag.application) !== stage}
							draggingId={drag?.application.id ?? null}
							handlers={stableHandlers}
							onMove={(application) => openSheet("move", application)}
							register={(view) => {
								if (view) columns.current.set(stage, view);
								else columns.current.delete(stage);
							}}
						/>
					))}
				</LegacyScrollView>
				{drag ? (
					<Animated.View
						pointerEvents="none"
						style={[
							{
								position: "absolute",
								left: drag.left,
								top: drag.top,
								width: drag.width,
								borderRadius: radius.rXl,
								boxShadow: shadows.e2.boxShadow,
							},
							overlayStyle,
						]}
					>
						<BoardCard application={drag.application} />
					</Animated.View>
				) : null}
			</View>
			<MoveSheet
				application={sheet?.kind === "move" ? sheet.application : null}
				current={sheet ? statusOf(sheet.application) : null}
				open={sheetOpen && sheet?.kind === "move"}
				onClose={() => setSheetOpen(false)}
				onPick={(stage) => {
					setSheetOpen(false);
					// Let the move sheet go before a Close or Mark as applied sheet takes its place.
					if (sheet) setTimeout(() => moveTo(sheet.application, stage), 0);
				}}
			/>
			{sheet && sheet.kind !== "move" ? (
				sheet.kind === "close" ? (
					<CloseSheet application={sheet.application} open={sheetOpen} onClose={() => setSheetOpen(false)} />
				) : (
					<MarkAppliedSheet application={sheet.application} open={sheetOpen} onClose={() => setSheetOpen(false)} />
				)
			) : null}
		</View>
	);
}

type ColumnProps = {
	stage: ApplicationStatus;
	applications: Application[];
	width: number;
	cardWidth: number;
	highlighted: boolean;
	draggingId: string | null;
	handlers: DragHandlers;
	onMove: (application: Application) => void;
	register: (view: ComponentRef<typeof View> | null) => void;
};

function Column({
	stage,
	applications,
	width,
	cardWidth,
	highlighted,
	draggingId,
	handlers,
	onMove,
	register,
}: ColumnProps) {
	const { t } = useLingui();
	const { colors, radius, space } = useTheme();
	const [visible, setVisible] = useState(COLUMN_PAGE_SIZE);
	const shown = applications.slice(0, visible);
	const remaining = applications.length - shown.length;

	return (
		<View
			ref={register}
			style={{
				width,
				borderRadius: radius.rXl,
				borderWidth: 1,
				borderColor: highlighted ? colors.accent : "transparent",
				backgroundColor: highlighted ? colors.accentSoft : colors.sunken,
			}}
		>
			<View
				accessible
				accessibilityRole="header"
				accessibilityLabel={t`${getStageLabel(stage)}, ${applications.length} applications`}
				style={{
					flexDirection: "row",
					alignItems: "center",
					gap: space.s2,
					padding: space.s3,
					paddingBottom: space.s1,
				}}
			>
				<View
					style={{
						width: space.s2,
						height: space.s2,
						borderRadius: radius.rPill,
						backgroundColor: getStageColor(stage, colors),
					}}
				/>
				<Text variant="label" style={{ flex: 1 }}>
					{getStageLabel(stage)}
				</Text>
				<Text variant="mono" color="ink3">
					{applications.length}
				</Text>
			</View>
			<LegacyScrollView contentContainerStyle={{ padding: space.s3, paddingTop: space.s2, gap: space.s3 }}>
				{stage === "closed" && applications.length === 0 ? (
					<Text variant="callout" color="ink3">{t`Drop here to close with a reason.`}</Text>
				) : null}
				{shown.map((application) => (
					<DraggableCard
						key={application.id}
						application={application}
						width={cardWidth}
						dragging={application.id === draggingId}
						handlers={handlers}
						onMove={() => onMove(application)}
					/>
				))}
				{remaining > 0 ? (
					<Button
						variant="ghost"
						size="sm"
						label={t`Show ${Math.min(remaining, COLUMN_PAGE_SIZE)} more`}
						onPress={() => setVisible((count) => count + COLUMN_PAGE_SIZE)}
					/>
				) : null}
			</LegacyScrollView>
		</View>
	);
}

type DraggableCardProps = {
	application: Application;
	width: number;
	dragging: boolean;
	handlers: DragHandlers;
	onMove: () => void;
};

function DraggableCard({ application, width, dragging, handlers, onMove }: DraggableCardProps) {
	// JS-thread callbacks: the drag drives React state (hovered column, drop) and the overlay's shared values.
	const pan = useMemo(
		() =>
			Gesture.Pan()
				.activateAfterLongPress(LONG_PRESS_MS)
				.runOnJS(true)
				.onStart((event) => handlers.start(application, event, width))
				.onUpdate((event) => handlers.move(event.absoluteX, event.translationX, event.translationY))
				// `success` is true only for a drag that was active and ended normally (not cancelled).
				.onFinalize((_event, success) => handlers.end(success)),
		[application, width, handlers],
	);

	return (
		<GestureDetector gesture={pan}>
			<View style={{ opacity: dragging ? 0.4 : 1 }}>
				<BoardCard application={application} onMove={onMove} />
			</View>
		</GestureDetector>
	);
}

type BoardCardProps = { application: Application; onMove?: (() => void) | undefined };

/** Role, company and next step; Open and Move to… (mockup `boardCard`). Without `onMove` it is the drag preview. */
function BoardCard({ application, onMove }: BoardCardProps) {
	const { t, i18n } = useLingui();
	const { space } = useTheme();
	const next = describeNextStep(getNextStep(application), application, i18n.locale);
	return (
		<Card>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`${application.role}, ${application.company}. ${next.title}`}
				accessibilityHint={t`Open application`}
				accessibilityActions={onMove ? [{ name: "move", label: t`Move to…` }] : undefined}
				onAccessibilityAction={(event) => {
					if (event.nativeEvent.actionName === "move") onMove?.();
				}}
				disabled={!onMove}
				onPress={() => router.push(routes.applicationDetails(application.id))}
				style={{ gap: space.s1 }}
			>
				<Text variant="label" numberOfLines={2}>
					{application.role}
				</Text>
				<Text variant="callout" color="ink2" numberOfLines={1}>
					{application.company}
					{application.location ? ` · ${application.location}` : ""}
				</Text>
				<Text variant="caption" color={next.tone === "warn" ? "warnText" : "ink3"} numberOfLines={2}>
					{next.sub ? `${next.title} · ${next.sub}` : next.title}
				</Text>
			</Pressable>
			{onMove ? (
				<View style={{ flexDirection: "row", marginTop: space.s1 }}>
					<Button variant="link" size="sm" label={t`Move to…`} onPress={onMove} />
				</View>
			) : null}
		</Card>
	);
}

type MoveSheetProps = {
	application: Application | null;
	current: ApplicationStatus | null;
	open: boolean;
	onClose: () => void;
	onPick: (stage: ApplicationStatus) => void;
};

/** The accessible alternative to dragging (mockup `app-move`). */
function MoveSheet({ application, current, open, onClose, onPick }: MoveSheetProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	return (
		<Sheet open={open} onClose={onClose} title={t`Move to stage`}>
			{application ? (
				<View style={{ paddingBottom: space.s4 }}>
					<Text color="ink2" style={{ paddingHorizontal: space.s4, paddingBottom: space.s2 }}>
						{application.role} · {application.company}
					</Text>
					{STAGES.map((stage) => (
						<ListRow
							key={stage}
							title={stage === "closed" ? t`Close…` : getStageLabel(stage)}
							leading={stage === current ? "check-circle" : "circle"}
							selected={stage === current}
							disabled={stage === current}
							onPress={() => onPick(stage)}
						/>
					))}
					{current === "saved" ? (
						<Text variant="callout" color="ink3" style={{ paddingHorizontal: space.s4, paddingTop: space.s2 }}>
							{t`Moving to Applied asks what you actually sent.`}
						</Text>
					) : null}
				</View>
			) : null}
		</Sheet>
	);
}
