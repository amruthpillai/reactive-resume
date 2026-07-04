import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { Layout } from "react-resizable-panels";
import type { BuilderLayout } from "./-store/sidebar";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { EyeIcon, NotePencilIcon, PaletteIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import Cookies from "js-cookie";
import { useEffect, useRef, useState } from "react";
import { usePanelRef } from "react-resizable-panels";
import { useMediaQuery } from "usehooks-ts";
import { ResizableGroup, ResizablePanel, ResizableSeparator } from "@reactive-resume/ui/components/resizable";
import { cn } from "@reactive-resume/utils/style";
import {
	useBuilderResumeUpdateSubscription,
	useInitializeResumeStore,
	useMergeResumeMetadata,
	usePreviewPausedStore,
	useResumeCleanup,
	useResumeStore,
} from "@/features/resume/builder/draft";
import { orpc } from "@/libs/orpc/client";
import { createNoindexFollowMeta } from "@/libs/seo";
import { BuilderHeader } from "./-components/header";
import { BuilderSidebarLeft } from "./-sidebar/left";
import { BuilderSidebarRight } from "./-sidebar/right";
import {
	BUILDER_LAYOUT_COOKIE_NAME,
	DEFAULT_BUILDER_LAYOUT,
	mapPanelLayoutToBuilderLayout,
	parseBuilderLayoutCookie,
	useBuilderSidebar,
	useBuilderSidebarStore,
} from "./-store/sidebar";

export const Route = createFileRoute("/builder/$resumeId")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		if (!context.session) throw redirect({ to: "/auth/login", replace: true });
		return { session: context.session };
	},
	loader: async ({ params, context }) => {
		const [layout, resume] = await Promise.all([
			getBuilderLayout(),
			context.queryClient.ensureQueryData(orpc.resume.getById.queryOptions({ input: { id: params.resumeId } })),
		]);

		return { layout, name: resume.name };
	},
	head: ({ loaderData }) => ({
		meta: loaderData
			? [{ title: `${loaderData.name} - Reactive Resume` }, createNoindexFollowMeta()]
			: [createNoindexFollowMeta()],
	}),
});

function RouteComponent() {
	const { layout: initialLayout } = Route.useLoaderData();

	const { resumeId } = Route.useParams();
	const { data: resume } = useSuspenseQuery(orpc.resume.getById.queryOptions({ input: { id: resumeId } }));
	const initializeResumeStore = useInitializeResumeStore();
	const mergeResumeMetadata = useMergeResumeMetadata();
	const isReady = useResumeStore((state) => state.isReady);
	const initializedResumeId = useResumeStore((state) => state.resumeId);
	const isInitialized = isReady && initializedResumeId === resumeId;

	useResumeCleanup();
	useBuilderResumeUpdateSubscription();

	useEffect(() => {
		if (isInitialized) return;
		initializeResumeStore(resume);
	}, [initializeResumeStore, isInitialized, resume]);

	useEffect(() => {
		mergeResumeMetadata(resume);
	}, [
		mergeResumeMetadata,
		resume.id,
		resume.name,
		resume.slug,
		resume.tags,
		resume.isLocked,
		resume.isPublic,
		resume.hasPassword,
		resume.updatedAt,
		resume,
	]);

	if (!isInitialized) return null;

	return <BuilderLayoutShell initialLayout={initialLayout} />;
}

type BuilderLayoutShellProps = {
	initialLayout: BuilderLayout;
};

function BuilderLayoutShell({ initialLayout }: BuilderLayoutShellProps) {
	// Single breakpoint (below `md`) switches between the desktop resizable panels and the mobile tabbed shell.
	const isMobile = useMediaQuery("(max-width: 767px)", { initializeWithValue: false });

	if (isMobile) return <MobileBuilderShell />;
	return <DesktopBuilderShell initialLayout={initialLayout} />;
}

function DesktopBuilderShell({ initialLayout }: BuilderLayoutShellProps) {
	// Only rendered when `BuilderLayoutShell` has already decided we're on desktop, so sidebar sizing is unconditional.
	const canPersistLayoutRef = useRef(false);

	const leftSidebarRef = usePanelRef();
	const rightSidebarRef = usePanelRef();

	const setLeftSidebar = useBuilderSidebarStore((state) => state.setLeftSidebar);
	const setRightSidebar = useBuilderSidebarStore((state) => state.setRightSidebar);
	const setLayout = useBuilderSidebarStore((state) => state.setLayout);

	const { maxSidebarSize, minSidebarSize, collapsedSidebarSize, groupResizeBehavior } = useBuilderSidebar((state) => ({
		maxSidebarSize: state.maxSidebarSize,
		minSidebarSize: state.minSidebarSize,
		collapsedSidebarSize: state.collapsedSidebarSize,
		groupResizeBehavior: state.groupResizeBehavior,
	}));

	useEffect(() => {
		setLayout(initialLayout);
		canPersistLayoutRef.current = true;
	}, [initialLayout, setLayout]);

	const onLayoutChanged = (layout: Layout) => {
		const nextLayout = mapPanelLayoutToBuilderLayout(layout);
		if (!canPersistLayoutRef.current) return;
		setLayout(nextLayout);
		setBuilderLayout(nextLayout);
	};

	useEffect(() => {
		if (!leftSidebarRef || !rightSidebarRef) return;

		setLeftSidebar(leftSidebarRef);
		setRightSidebar(rightSidebarRef);
	}, [leftSidebarRef, rightSidebarRef, setLeftSidebar, setRightSidebar]);

	const sidebarMinSize = `${minSidebarSize}px`;
	const sidebarCollapsedSize = `${collapsedSidebarSize}px`;
	const leftSidebarSize = `${initialLayout.left}%`;
	const rightSidebarSize = `${initialLayout.right}%`;
	const artboardSize = `${initialLayout.artboard}%`;

	return (
		<div className="flex h-svh flex-col">
			<a
				href="#main-content"
				className="sr-only rounded-md bg-popover px-4 py-2 text-sm ring-2 ring-ring focus:not-sr-only focus:absolute focus:inset-s-2 focus:top-2 focus:z-[100]"
			>
				<Trans>Skip to main content</Trans>
			</a>

			<BuilderHeader />

			<ResizableGroup orientation="horizontal" className="mt-14 flex-1" onLayoutChanged={onLayoutChanged}>
				<ResizablePanel
					collapsible
					id="left"
					panelRef={leftSidebarRef}
					groupResizeBehavior={groupResizeBehavior}
					maxSize={maxSidebarSize}
					minSize={sidebarMinSize}
					collapsedSize={sidebarCollapsedSize}
					defaultSize={leftSidebarSize}
					className="z-20 h-[calc(100svh-3.5rem)]"
				>
					<BuilderSidebarLeft />
				</ResizablePanel>
				<ResizableSeparator withHandle className="z-50 border-s" />
				<ResizablePanel id="artboard" defaultSize={artboardSize} className="h-[calc(100svh-3.5rem)]">
					<main id="main-content" className="h-full">
						<Outlet />
					</main>
				</ResizablePanel>
				<ResizableSeparator withHandle className="z-50 border-e" />
				<ResizablePanel
					collapsible
					id="right"
					panelRef={rightSidebarRef}
					groupResizeBehavior={groupResizeBehavior}
					maxSize={maxSidebarSize}
					minSize={sidebarMinSize}
					collapsedSize={sidebarCollapsedSize}
					defaultSize={rightSidebarSize}
					className="z-20 h-[calc(100svh-3.5rem)]"
				>
					<BuilderSidebarRight />
				</ResizablePanel>
			</ResizableGroup>
		</div>
	);
}

type MobileBuilderTab = "edit" | "preview" | "design";

function MobileBuilderShell() {
	// Local state is enough — mobile view mode is shell-scoped and doesn't need to persist.
	const [tab, setTab] = useState<MobileBuilderTab>("edit");
	const setPreviewPaused = usePreviewPausedStore((state) => state.setPaused);

	// The preview stays mounted under the Edit/Design overlay; pause its render while it's covered.
	useEffect(() => {
		setPreviewPaused(tab !== "preview");
		return () => setPreviewPaused(false);
	}, [tab, setPreviewPaused]);

	return (
		<div className="flex min-h-[100dvh] flex-col">
			<a
				href="#main-content"
				className="sr-only rounded-md bg-popover px-4 py-2 text-sm ring-2 ring-ring focus:not-sr-only focus:absolute focus:inset-s-2 focus:top-2 focus:z-[100]"
			>
				<Trans>Skip to main content</Trans>
			</a>

			<BuilderHeader />

			{/* The preview (fixed inset-0) stays mounted so zoom/pan state survives tab switches. */}
			<main id="main-content" className="flex-1">
				<Outlet />
			</main>

			{tab === "edit" && (
				<MobileSidebarPanel>
					<BuilderSidebarLeft />
				</MobileSidebarPanel>
			)}
			{tab === "design" && (
				<MobileSidebarPanel>
					<BuilderSidebarRight />
				</MobileSidebarPanel>
			)}

			<MobileBuilderTabBar activeTab={tab} onTabChange={setTab} />
		</div>
	);
}

type MobileSidebarPanelProps = {
	children: ReactNode;
};

function MobileSidebarPanel({ children }: MobileSidebarPanelProps) {
	// Sits below the header (top-14) and above the tab bar (bottom-16). The sidebar's ScrollArea hardcodes
	// `h-[calc(100svh-3.5rem)]`; override it to fill this panel so its last item isn't hidden under the tab bar.
	return (
		<div className="fixed inset-x-0 top-14 bottom-16 z-40 bg-background [&_[data-slot=scroll-area]]:h-full">
			{children}
		</div>
	);
}

const MOBILE_BUILDER_TABS = [
	{ value: "edit", icon: NotePencilIcon },
	{ value: "preview", icon: EyeIcon },
	{ value: "design", icon: PaletteIcon },
] as const satisfies readonly { value: MobileBuilderTab; icon: Icon }[];

type MobileBuilderTabBarProps = {
	activeTab: MobileBuilderTab;
	onTabChange: (tab: MobileBuilderTab) => void;
};

function MobileBuilderTabBar({ activeTab, onTabChange }: MobileBuilderTabBarProps) {
	const labels: Record<MobileBuilderTab, string> = { edit: t`Edit`, preview: t`Preview`, design: t`Design` };

	return (
		<nav className="fixed inset-x-0 bottom-0 z-50 flex border-t bg-popover pb-[env(safe-area-inset-bottom)]">
			{MOBILE_BUILDER_TABS.map(({ value, icon: Icon }) => {
				const isActive = value === activeTab;

				return (
					<button
						key={value}
						type="button"
						aria-current={isActive ? "page" : undefined}
						onClick={() => onTabChange(value)}
						className={cn(
							"flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors",
							isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
						)}
					>
						<Icon className="size-5" weight={isActive ? "fill" : "regular"} />
						<span>{labels[value]}</span>
					</button>
				);
			})}
		</nav>
	);
}

const setBuilderLayout = (data: BuilderLayout) => {
	const layout = parseBuilderLayoutCookie(JSON.stringify(data));
	Cookies.set(BUILDER_LAYOUT_COOKIE_NAME, JSON.stringify(layout), { path: "/" });
};

const getBuilderLayout = (): BuilderLayout => {
	const layout = Cookies.get(BUILDER_LAYOUT_COOKIE_NAME);
	if (!layout) return DEFAULT_BUILDER_LAYOUT;
	return parseBuilderLayoutCookie(layout);
};
