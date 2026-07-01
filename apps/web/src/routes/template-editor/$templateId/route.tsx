import type { Layout } from "react-resizable-panels";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import Cookies from "js-cookie";
import { useEffect, useRef } from "react";
import { usePanelRef } from "react-resizable-panels";
import { ResizableGroup, ResizablePanel, ResizableSeparator } from "@reactive-resume/ui/components/resizable";
import { useTemplateEditorStore } from "@/features/template-editor/store";
import { orpc } from "@/libs/orpc/client";
import { TemplateEditorHeader } from "./-components/header";
import { TemplateEditorLeftSidebar } from "./-sidebar/left";
import { TemplateEditorRightSidebar } from "./-sidebar/right";
import {
	DEFAULT_EDITOR_LAYOUT,
	EDITOR_LAYOUT_COOKIE_NAME,
	mapPanelLayoutToEditorLayout,
	parseEditorLayoutCookie,
	useEditorSidebarStore,
} from "./-store/sidebar";

export const Route = createFileRoute("/template-editor/$templateId")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		if (!context.session) throw redirect({ to: "/auth/login", replace: true });
		return { session: context.session };
	},
	loader: async ({ params, context }) => {
		const template = await context.queryClient.ensureQueryData(
			orpc.customTemplate.getById.queryOptions({ input: { id: params.templateId } }),
		);

		const layout = (() => {
			const raw = Cookies.get(EDITOR_LAYOUT_COOKIE_NAME);
			return raw ? parseEditorLayoutCookie(raw) : DEFAULT_EDITOR_LAYOUT;
		})();

		return { layout, name: template.name };
	},
	head: ({ loaderData }) => ({
		meta: loaderData ? [{ title: `${loaderData.name} - Template Editor` }] : [],
	}),
});

function RouteComponent() {
	const { layout: initialLayout } = Route.useLoaderData();
	const { templateId } = Route.useParams();
	const { data: template } = useSuspenseQuery(orpc.customTemplate.getById.queryOptions({ input: { id: templateId } }));

	const initialize = useTemplateEditorStore((state) => state.initialize);
	const reset = useTemplateEditorStore((state) => state.reset);
	const isReady = useTemplateEditorStore((state) => state.isReady);
	const initializedId = useTemplateEditorStore((state) => state.templateId);

	useEffect(() => {
		if (isReady && initializedId === templateId) return;
		initialize({ ...template, updatedAt: new Date(template.updatedAt) });
	}, [initialize, isReady, initializedId, template, templateId]);

	useEffect(() => {
		return () => reset();
	}, [reset]);

	if (!isReady || initializedId !== templateId) return null;

	return <EditorLayoutShell initialLayout={initialLayout} />;
}

type EditorLayoutShellProps = { initialLayout: typeof DEFAULT_EDITOR_LAYOUT };

function EditorLayoutShell({ initialLayout }: EditorLayoutShellProps) {
	const canPersistLayoutRef = useRef(false);
	const leftSidebarRef = usePanelRef();
	const rightSidebarRef = usePanelRef();
	const setLeftSidebar = useEditorSidebarStore((state) => state.setLeftSidebar);
	const setRightSidebar = useEditorSidebarStore((state) => state.setRightSidebar);
	const setLayout = useEditorSidebarStore((state) => state.setLayout);

	useEffect(() => {
		setLayout(initialLayout);
		canPersistLayoutRef.current = true;
	}, [initialLayout, setLayout]);

	useEffect(() => {
		if (leftSidebarRef) setLeftSidebar(leftSidebarRef);
	}, [leftSidebarRef, setLeftSidebar]);

	useEffect(() => {
		if (rightSidebarRef) setRightSidebar(rightSidebarRef);
	}, [rightSidebarRef, setRightSidebar]);

	const onLayoutChanged = (layout: Layout) => {
		const nextLayout = mapPanelLayoutToEditorLayout(layout);
		if (!canPersistLayoutRef.current) return;
		setLayout(nextLayout);
		Cookies.set(EDITOR_LAYOUT_COOKIE_NAME, JSON.stringify(nextLayout), { path: "/" });
	};

	return (
		<div className="flex h-svh flex-col">
			<TemplateEditorHeader />

			<ResizableGroup orientation="horizontal" className="mt-14 flex-1" onLayoutChanged={onLayoutChanged}>
				<ResizablePanel
					collapsible
					id="left"
					panelRef={leftSidebarRef}
					maxSize="32%"
					minSize="180px"
					collapsedSize="0px"
					defaultSize={`${initialLayout.left}%`}
					className="z-20 h-[calc(100svh-3.5rem)] overflow-hidden"
				>
					<TemplateEditorLeftSidebar />
				</ResizablePanel>
				<ResizableSeparator withHandle className="z-50 border-e" />
				<ResizablePanel id="canvas" defaultSize={`${initialLayout.canvas}%`} className="h-[calc(100svh-3.5rem)]">
					<Outlet />
				</ResizablePanel>
				<ResizableSeparator withHandle className="z-50 border-e" />
				<ResizablePanel
					collapsible
					id="right"
					panelRef={rightSidebarRef}
					maxSize="40%"
					minSize="200px"
					collapsedSize="0px"
					defaultSize={`${initialLayout.right}%`}
					className="z-20 h-[calc(100svh-3.5rem)] overflow-hidden"
				>
					<TemplateEditorRightSidebar />
				</ResizablePanel>
			</ResizableGroup>
		</div>
	);
}
