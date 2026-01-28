import {
	closestCorners,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { DotsSixVerticalIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { type CSSProperties, forwardRef, type HTMLAttributes, useCallback, useState } from "react";
import { match } from "ts-pattern";
import { useResumeStore } from "@/components/resume/store/resume";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { templates } from "@/dialogs/resume/template/data";
import type { SectionType } from "@/schema/resume/data";
import { getSectionTitle } from "@/utils/resume/section";
import { cn } from "@/utils/style";

type ColumnId = "main" | "sidebar";

const getColumnLabel = (columnId: ColumnId): string => {
	return match(columnId)
		.with("main", () => t`Main`)
		.with("sidebar", () => t`Sidebar`)
		.exhaustive();
};

type PageLocation = {
	pageIndex: number;
	columnId: ColumnId;
};

/**
 * Returns the page index and column that contains the given section id.
 * Format: "page-{index}-{columnId}" or "{sectionId}"
 */
const parseDroppableId = (id: string): PageLocation | null => {
	if (id.startsWith("page-")) {
		const parts = id.split("-");
		if (parts.length >= 3) {
			const pageIndex = Number.parseInt(parts[1] ?? "0", 10);
			const columnId = parts[2] as ColumnId;
			if (!Number.isNaN(pageIndex) && (columnId === "main" || columnId === "sidebar")) {
				return { pageIndex, columnId };
			}
		}
	}

	return null;
};

const createDroppableId = (pageIndex: number, columnId: ColumnId): string => {
	return `page-${pageIndex}-${columnId}`;
};

export function LayoutPages() {
	const [activeId, setActiveId] = useState<string | null>(null);

	const template = useResumeStore((state) => state.resume.data.metadata.template);
	const templateSidebarPosition = templates[template].sidebarPosition;

	const layout = useResumeStore((state) => state.resume.data.metadata.layout);
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

	/**
	 * Returns the page index and column that contains the given section id.
	 */
	const findContainer = useCallback(
		(id: string): PageLocation | null => {
			// Check if it's a droppable ID
			const location = parseDroppableId(id);
			if (location) return location;

			// Search through all pages
			for (let pageIndex = 0; pageIndex < layout.pages.length; pageIndex++) {
				const page = layout.pages[pageIndex];
				if (page.main.includes(id)) return { pageIndex, columnId: "main" };
				if (page.sidebar.includes(id)) return { pageIndex, columnId: "sidebar" };
			}

			return null;
		},
		[layout.pages],
	);

	const handleDragStart = useCallback((event: DragStartEvent) => setActiveId(String(event.active.id)), []);

	const handleDragEnd = useCallback(
		({ active, over }: DragEndEvent) => {
			setActiveId(null);
			if (!over) return;

			const activeIdStr = String(active.id);
			const overIdStr = String(over.id);

			if (activeIdStr === overIdStr) return;

			const activeLocation = findContainer(activeIdStr);
			const overLocation = parseDroppableId(overIdStr) ?? findContainer(overIdStr);

			if (!activeLocation || !overLocation) return;

			// Same location, reorder within column
			if (activeLocation.pageIndex === overLocation.pageIndex && activeLocation.columnId === overLocation.columnId) {
				const page = layout.pages[activeLocation.pageIndex];
				const items = page[activeLocation.columnId];
				const oldIdx = items.indexOf(activeIdStr);
				let newIdx = items.indexOf(overIdStr);
				if (oldIdx === -1 || oldIdx === newIdx) return;
				if (newIdx === -1) newIdx = items.length - 1;

				updateResumeData((draft) => {
					const colOrder = draft.metadata.layout.pages[activeLocation.pageIndex][activeLocation.columnId];
					draft.metadata.layout.pages[activeLocation.pageIndex][activeLocation.columnId] = arrayMove(
						colOrder,
						oldIdx,
						newIdx,
					);
				});
				return;
			}

			// Different location, move between columns/pages
			const fromPage = layout.pages[activeLocation.pageIndex];
			const toPage = layout.pages[overLocation.pageIndex];
			const fromItems = fromPage[activeLocation.columnId];
			const toItems = toPage[overLocation.columnId];
			const fromIdx = fromItems.indexOf(activeIdStr);
			if (fromIdx === -1) return;

			let toIdx = toItems.indexOf(overIdStr);
			if (toIdx === -1) toIdx = toItems.length;

			updateResumeData((draft) => {
				const fromPageDraft = draft.metadata.layout.pages[activeLocation.pageIndex];
				const toPageDraft = draft.metadata.layout.pages[overLocation.pageIndex];
				const from = fromPageDraft[activeLocation.columnId];
				const to = toPageDraft[overLocation.columnId];

				from.splice(fromIdx, 1);
				to.splice(Math.min(toIdx, to.length), 0, activeIdStr);
			});
		},
		[findContainer, layout.pages, updateResumeData],
	);

	const handleAddPage = useCallback(() => {
		updateResumeData((draft) => {
			draft.metadata.layout.pages.push({
				fullWidth: false,
				main: [],
				sidebar: [],
			});
		});
	}, [updateResumeData]);

	const handleDeletePage = useCallback(
		(pageIndex: number) => {
			if (layout.pages.length <= 1) return; // Don't allow deleting the last page

			updateResumeData((draft) => {
				const pageToDelete = draft.metadata.layout.pages[pageIndex];
				// Find the first available page that isn't being deleted
				const targetPageIndex = pageIndex === 0 ? 1 : 0;
				const targetPage = draft.metadata.layout.pages[targetPageIndex];

				// Move all sections from deleted page to target page
				targetPage.main.push(...pageToDelete.main);
				targetPage.sidebar.push(...pageToDelete.sidebar);

				draft.metadata.layout.pages.splice(pageIndex, 1);
			});
		},
		[layout.pages.length, updateResumeData],
	);

	const handleToggleFullWidth = useCallback(
		(pageIndex: number, fullWidth: boolean) => {
			updateResumeData((draft) => {
				const page = draft.metadata.layout.pages[pageIndex];
				page.fullWidth = fullWidth;

				if (fullWidth) {
					// Move all sidebar sections to main
					page.main.push(...page.sidebar);
					page.sidebar = [];
				}
			});
		},
		[updateResumeData],
	);

	// Don't render until pages are initialized
	if (layout.pages.length === 0) {
		return null;
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragCancel={() => setActiveId(null)}
		>
			<div className="flex flex-col gap-4">
				{layout.pages.map((page, pageIndex) => (
					<PageContainer
						key={pageIndex}
						pageIndex={pageIndex}
						page={page}
						canDelete={layout.pages.length > 1}
						sidebarPosition={templateSidebarPosition}
						onDelete={handleDeletePage}
						onToggleFullWidth={handleToggleFullWidth}
					/>
				))}

				<Button variant="outline" className="self-end" onClick={handleAddPage}>
					<PlusIcon />
					<Trans>Add Page</Trans>
				</Button>
			</div>

			<DragOverlay>{activeId ? <LayoutItemContent id={activeId} isDragging isOverlay /> : null}</DragOverlay>
		</DndContext>
	);
}

type PageContainerProps = {
	pageIndex: number;
	page: { fullWidth: boolean; main: string[]; sidebar: string[] };
	canDelete: boolean;
	sidebarPosition: "left" | "right" | "none";
	onDelete: (pageIndex: number) => void;
	onToggleFullWidth: (pageIndex: number, fullWidth: boolean) => void;
};

function PageContainer({
	pageIndex,
	page,
	canDelete,
	sidebarPosition,
	onDelete,
	onToggleFullWidth,
}: PageContainerProps) {
	const isFullWidth = page.fullWidth;

	return (
		<div className="space-y-3 rounded-md border border-dashed bg-background/40">
			<div className="flex items-center justify-between bg-secondary/50 px-4 py-3">
				<div className="flex w-full items-center gap-4">
					<span className="font-medium text-xs">
						<Trans>Page {pageIndex + 1}</Trans>
					</span>

					<label className="flex cursor-pointer items-center gap-2">
						<Switch checked={page.fullWidth} onCheckedChange={(checked) => onToggleFullWidth(pageIndex, checked)} />

						<span className="font-medium text-muted-foreground text-xs">
							<Trans>Full Width</Trans>
						</span>
					</label>
				</div>

				{canDelete && (
					<Button variant="ghost" onClick={() => onDelete(pageIndex)} className="h-5 w-auto gap-x-2.5 px-0!">
						<TrashIcon />
						<Trans>Delete Page</Trans>
					</Button>
				)}
			</div>

			<div
				className={cn(
					"grid w-full @md:grid-cols-2 gap-x-4 gap-y-2 p-4 pt-0 font-medium",
					sidebarPosition === "none" && "@md:grid-cols-1",
				)}
			>
				<LayoutColumn
					pageIndex={pageIndex}
					columnId="main"
					items={page.main}
					disabled={false}
					className={cn(sidebarPosition === "left" ? "order-2" : "order-1")}
				/>

				{!isFullWidth && (
					<LayoutColumn
						pageIndex={pageIndex}
						columnId="sidebar"
						items={page.sidebar}
						hideLabel={sidebarPosition === "none"}
						className={cn(sidebarPosition === "left" ? "order-1" : "order-2")}
					/>
				)}
			</div>
		</div>
	);
}

type LayoutColumnProps = {
	pageIndex: number;
	columnId: ColumnId;
	items: string[];
	hideLabel?: boolean;
	disabled?: boolean;
	className?: string;
};

function LayoutColumn({
	pageIndex,
	columnId,
	items,
	hideLabel = false,
	disabled = false,
	className,
}: LayoutColumnProps) {
	const droppableId = createDroppableId(pageIndex, columnId);
	const { setNodeRef, isOver } = useDroppable({ id: droppableId, disabled });

	return (
		<SortableContext id={droppableId} items={items} strategy={verticalListSortingStrategy}>
			<div className={cn("space-y-1.5", disabled && "opacity-50", className)}>
				{!hideLabel && <div className="@md:row-start-1 ps-4 font-medium text-xs">{getColumnLabel(columnId)}</div>}

				<div
					ref={setNodeRef}
					className={cn(
						"space-y-2.5 rounded-md border border-dashed p-3 pb-8 transition-colors",
						isOver && !disabled ? "border-primary/60 bg-primary/5" : "bg-background/40",
					)}
				>
					{items.map((id) => (
						<SortableLayoutItem key={id} id={id} pageIndex={pageIndex} columnId={columnId} />
					))}

					{items.length === 0 && (
						<div className="rounded-md border border-dashed p-4 font-medium text-muted-foreground text-xs">
							<Trans>Drag and drop sections here to move them between columns</Trans>
						</div>
					)}
				</div>
			</div>
		</SortableContext>
	);
}

type SortableLayoutItemProps = {
	id: string;
	pageIndex: number;
	columnId: ColumnId;
};

function SortableLayoutItem({ id }: SortableLayoutItemProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

	const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition };

	return (
		<LayoutItemContent ref={setNodeRef} id={id} style={style} isDragging={isDragging} {...attributes} {...listeners} />
	);
}

type LayoutItemContentProps = HTMLAttributes<HTMLDivElement> & {
	id: string;
	isDragging?: boolean;
	isOverlay?: boolean;
};

const LayoutItemContent = forwardRef<HTMLDivElement, LayoutItemContentProps>(
	({ id, isDragging, isOverlay, className, style, ...rest }, ref) => {
		const title = useResumeStore((state) => {
			if (id === "summary") return state.resume.data.summary.title || getSectionTitle("summary");
			if (id in state.resume.data.sections)
				return state.resume.data.sections[id as SectionType].title || getSectionTitle(id as SectionType);
			const customSection = state.resume.data.customSections.find((section) => section.id === id);
			if (customSection) return customSection.title;
			return id;
		});

		return (
			<div
				ref={ref}
				style={style}
				data-overlay={isOverlay ? "true" : undefined}
				data-dragging={isDragging ? "true" : undefined}
				className={cn(
					"group/item flex cursor-grab touch-none select-none items-center gap-x-2 rounded-md border border-border bg-background px-2 py-1.5 font-medium text-sm transition-all duration-200 ease-out",
					"hover:bg-secondary/40 active:cursor-grabbing active:border-primary/60 active:bg-secondary/40",
					"data-[overlay=true]:cursor-grabbing data-[overlay=true]:border-primary/60 data-[overlay=true]:bg-background",
					"data-[dragging=true]:cursor-grabbing data-[dragging=true]:border-primary/60 data-[dragging=true]:bg-background",
					className,
				)}
				{...rest}
			>
				<DotsSixVerticalIcon className="opacity-40 transition-opacity group-hover/item:opacity-100" />
				<span className="truncate">{title}</span>
			</div>
		);
	},
);

LayoutItemContent.displayName = "LayoutItemContent";
