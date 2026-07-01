import type { TemplateNode, TemplateNodeType } from "@reactive-resume/schema/custom-template";
import type { WritableDraft } from "immer";
import type { WysiwygTheme } from "@/features/template-editor/wysiwyg/theme";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowsOutSimpleIcon, PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { RenderProvider } from "@reactive-resume/pdf/context";
import { getBaseStyleProvider, TemplatePlacementProvider } from "@reactive-resume/pdf/template-styles";
import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";
import { generateId } from "@reactive-resume/utils/string";
import { cn } from "@reactive-resume/utils/style";
import {
	insertNodeAt,
	removeNodeById,
	useCurrentTemplate,
	useTemplateEditorStore,
} from "@/features/template-editor/store";
import { DemoPlaceholder } from "@/features/template-editor/wysiwyg/demo-content";
import { useCanvasFonts } from "@/features/template-editor/wysiwyg/fonts";
import { nodeStyleToCss } from "@/features/template-editor/wysiwyg/styles";
import { demoResumeData, getWysiwygTheme, withFontFallback } from "@/features/template-editor/wysiwyg/theme";
import { TemplatePdfPreview } from "./-components/pdf-preview";
import { useEditorSidebarStore } from "./-store/sidebar";

export const Route = createFileRoute("/template-editor/$templateId/")({
	component: TemplateEditorCanvas,
});

// ─── Drag payload + helpers ──────────────────────────────────────────────────

type DragPayload = {
	type: TemplateNodeType;
	label: string;
	columnCount?: 2 | 3 | 4;
};

function createNewNode(payload: DragPayload): TemplateNode {
	const id = generateId();

	if (payload.type === "columns") {
		const count = payload.columnCount ?? 2;
		return {
			id,
			type: "columns",
			props: { columnCount: count, gap: 16 },
			children: Array.from({ length: count }, () => ({
				id: generateId(),
				type: "container" as TemplateNodeType,
				style: { padding: 8 },
				children: [],
			})),
		};
	}

	if (payload.type === "container") return { id, type: "container", style: { padding: 8 }, children: [] };
	if (payload.type === "spacer") return { id, type: "spacer", props: { height: 16 } };
	if (payload.type === "page-break") return { id, type: "page-break" };
	if (payload.type === "placeholder.picture") {
		return { id, type: "placeholder.picture", props: { pictureSize: 80, pictureBorderRadius: 50 } };
	}

	return { id, type: payload.type };
}

const readPayload = (e: React.DragEvent): DragPayload | null => {
	const raw = e.dataTransfer.getData("application/x-template-node");
	if (!raw) return null;
	try {
		return JSON.parse(raw) as DragPayload;
	} catch {
		return null;
	}
};

// ─── Canvas ──────────────────────────────────────────────────────────────────

function TemplateEditorCanvas() {
	const viewMode = useEditorSidebarStore((state) => state.viewMode);
	if (viewMode === "preview") return <TemplatePdfPreview />;
	return <EditCanvas />;
}

function EditCanvas() {
	const template = useCurrentTemplate();
	const updateData = useTemplateEditorStore((state) => state.updateData);
	const selectedNodeId = useTemplateEditorStore((state) => state.selectedNodeId);
	const setSelectedNodeId = useTemplateEditorStore((state) => state.setSelectedNodeId);
	const [dragOverRootZone, setDragOverRootZone] = useState(false);
	const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

	const theme = getWysiwygTheme(template.data);
	const pagePadding = template.data.page?.paddingHorizontal ?? 40;
	const pagePaddingV = template.data.page?.paddingVertical ?? 40;

	// Render the canvas inside the base template's real style context so the demo
	// content matches the PDF, and load its fonts so typography matches too.
	const BaseStyleProvider = getBaseStyleProvider(template.data.baseTemplate);
	useCanvasFonts(theme.bodyFontFamily, theme.headingFontFamily);

	const handleRootDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setDragOverRootZone(false);
			const payload = readPayload(e);
			if (!payload) return;
			const newNode = createNewNode(payload);
			updateData((draft) => {
				(draft.nodes as WritableDraft<TemplateNode>[]).push(newNode as WritableDraft<TemplateNode>);
			});
		},
		[updateData],
	);

	const handleRootDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setDragOverRootZone(true);
		e.dataTransfer.dropEffect = "copy";
	}, []);

	const handleRootDragLeave = useCallback(() => setDragOverRootZone(false), []);

	const handleDeleteNode = useCallback(
		(id: string) => {
			updateData((draft) => {
				removeNodeById(draft.nodes as WritableDraft<TemplateNode>[], id);
			});
			if (selectedNodeId === id) setSelectedNodeId(null);
		},
		[updateData, selectedNodeId, setSelectedNodeId],
	);

	const handleDropInContainer = useCallback(
		(e: React.DragEvent, containerId: string, colIdx: number | null) => {
			e.preventDefault();
			e.stopPropagation();
			const payload = readPayload(e);
			if (!payload) return;
			const newNode = createNewNode(payload);
			updateData((draft) => {
				insertNodeAt(draft.nodes as WritableDraft<TemplateNode>[], containerId, colIdx, 9999, newNode);
			});
		},
		[updateData],
	);

	const sharedNodeProps = {
		selectedNodeId,
		onSelect: setSelectedNodeId,
		onDelete: handleDeleteNode,
		onDropInContainer: handleDropInContainer,
		hoveredNodeId,
		onHoverNode: setHoveredNodeId,
		theme,
	};

	return (
		<ScrollArea className="h-[calc(100svh-3.5rem)] bg-secondary/30">
			<RenderProvider data={demoResumeData}>
				<BaseStyleProvider>
					<TemplatePlacementProvider placement="main">
						{/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: canvas root */}
						<div
							className="mx-auto my-8 flex min-h-[842px] w-[595px] flex-col shadow-xl ring-1 ring-border/20"
							style={{
								backgroundColor: theme.background,
								color: theme.foreground,
								fontFamily: withFontFallback(theme.bodyFontFamily),
								fontSize: theme.bodyFontSize,
								lineHeight: theme.bodyLineHeight,
								padding: `${pagePaddingV}px ${pagePadding}px`,
							}}
							onMouseLeave={() => setHoveredNodeId(null)}
							onClick={(e) => {
								if (e.target === e.currentTarget) setSelectedNodeId(null);
							}}
						>
							{template.data.nodes.length === 0 ? (
								<RootDropZone
									isOver={dragOverRootZone}
									onDragOver={handleRootDragOver}
									onDragLeave={handleRootDragLeave}
									onDrop={handleRootDrop}
									isEmpty
								/>
							) : (
								<>
									{template.data.nodes.map((node) => (
										<CanvasNodeRenderer key={node.id} node={node} {...sharedNodeProps} />
									))}
									<RootDropZone
										isOver={dragOverRootZone}
										onDragOver={handleRootDragOver}
										onDragLeave={handleRootDragLeave}
										onDrop={handleRootDrop}
									/>
								</>
							)}
						</div>
					</TemplatePlacementProvider>
				</BaseStyleProvider>
			</RenderProvider>
		</ScrollArea>
	);
}

// ─── Root drop zone ──────────────────────────────────────────────────────────

type RootDropZoneProps = {
	isOver: boolean;
	onDragOver: (e: React.DragEvent) => void;
	onDragLeave: () => void;
	onDrop: (e: React.DragEvent) => void;
	isEmpty?: boolean;
};

function RootDropZone({ isOver, onDragOver, onDragLeave, onDrop, isEmpty }: RootDropZoneProps) {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drop target
		<div
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
			className={cn(
				"flex items-center justify-center transition-all",
				isEmpty ? "min-h-[200px] flex-1 rounded-md border-2 border-dashed" : "h-4",
				isOver && (isEmpty ? "border-primary bg-primary/8" : "h-8 border-primary bg-primary/8"),
				!isOver && isEmpty && "border-muted-foreground/25",
				!isOver && !isEmpty && "border-transparent",
			)}
		>
			{isEmpty && !isOver && (
				<p className="text-muted-foreground/60 text-sm">
					<Trans>Drag components here to start building</Trans>
				</p>
			)}
			{isOver && isEmpty && (
				<p className="font-medium text-primary text-sm">
					<Trans>Drop here</Trans>
				</p>
			)}
		</div>
	);
}

// ─── Node renderer ───────────────────────────────────────────────────────────

type CanvasNodeProps = {
	node: TemplateNode;
	selectedNodeId: string | null;
	onSelect: (id: string) => void;
	onDelete: (id: string) => void;
	onDropInContainer: (e: React.DragEvent, containerId: string, colIdx: number | null) => void;
	hoveredNodeId: string | null;
	onHoverNode: (id: string | null) => void;
	theme: WysiwygTheme;
	depth?: number;
};

const SELECT_OUTLINE = "outline outline-2 outline-primary";
const HOVER_OUTLINE = "hover:outline hover:outline-1 hover:outline-muted-foreground/30";

const PICTURE_ALIGN_SELF = { left: "flex-start", center: "center", right: "flex-end" } as const;

function CanvasNodeRenderer(props: CanvasNodeProps) {
	const {
		node,
		selectedNodeId,
		onSelect,
		onDelete,
		onDropInContainer,
		hoveredNodeId,
		onHoverNode,
		theme,
		depth = 0,
	} = props;
	const isSelected = node.id === selectedNodeId;
	const isDeleteVisible = node.id === hoveredNodeId;
	const [dragOver, setDragOver] = useState(false);
	const [addZoneDragOver, setAddZoneDragOver] = useState(false);
	const styleCss = nodeStyleToCss(node.style);

	const hoverHandler = (e: React.MouseEvent) => {
		e.stopPropagation();
		onHoverNode(node.id);
	};
	const selectHandler = (e: React.MouseEvent) => {
		e.stopPropagation();
		onSelect(node.id);
	};

	if (node.type === "page-break") {
		return (
			// biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents lint/a11y/useKeyWithMouseEvents: canvas node
			<div
				className={cn(
					"relative my-2 flex w-full cursor-pointer items-center gap-2",
					isSelected ? SELECT_OUTLINE : HOVER_OUTLINE,
				)}
				onMouseOver={hoverHandler}
				onClick={selectHandler}
			>
				<div className="flex-1 border-muted-foreground/30 border-t-2 border-dashed" />
				<span className="shrink-0 rounded bg-muted/60 px-2 py-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
					<Trans>Page Break</Trans>
				</span>
				<div className="flex-1 border-muted-foreground/30 border-t-2 border-dashed" />
				<NodeDeleteButton isVisible={isDeleteVisible} onDelete={() => onDelete(node.id)} />
			</div>
		);
	}

	if (node.type === "spacer") {
		const height = node.props?.height ?? 16;
		return (
			// biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents lint/a11y/useKeyWithMouseEvents: canvas node
			<div
				style={{ height, ...styleCss }}
				className={cn(
					"relative w-full cursor-pointer bg-muted/15 transition-colors",
					isSelected ? SELECT_OUTLINE : HOVER_OUTLINE,
				)}
				onMouseOver={hoverHandler}
				onClick={selectHandler}
			>
				<span className="absolute inset-0 flex items-center justify-center gap-1 text-[10px] text-muted-foreground/50">
					<ArrowsOutSimpleIcon className="size-3" />
					{height}px
				</span>
				<NodeDeleteButton isVisible={isDeleteVisible} onDelete={() => onDelete(node.id)} />
			</div>
		);
	}

	if (node.type === "columns") {
		const count = node.props?.columnCount ?? 2;
		const gap = node.props?.gap ?? 16;
		const widths = (node.props?.columnWidths as number[] | undefined) ?? [];
		const columns = Array.from({ length: count }, (_, i) => node.children?.[i] ?? null);

		return (
			// biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents lint/a11y/useKeyWithMouseEvents: canvas node
			<div
				style={styleCss}
				className={cn(
					"relative",
					isSelected ? SELECT_OUTLINE : "hover:outline hover:outline-1 hover:outline-muted-foreground/20",
				)}
				onMouseOver={hoverHandler}
				onClick={selectHandler}
			>
				<div className="flex" style={{ gap }}>
					{columns.map((col, colIdx) => (
						<ColumnCell
							key={colIdx}
							col={col}
							colIdx={colIdx}
							nodeId={node.id}
							width={widths[colIdx] ? `${widths[colIdx]}%` : `${100 / count}%`}
							selectedNodeId={selectedNodeId}
							onSelect={onSelect}
							onDelete={onDelete}
							onDropInContainer={onDropInContainer}
							hoveredNodeId={hoveredNodeId}
							onHoverNode={onHoverNode}
							theme={theme}
							depth={depth}
						/>
					))}
				</div>
				<NodeDeleteButton isVisible={isDeleteVisible} onDelete={() => onDelete(node.id)} />
			</div>
		);
	}

	if (node.type === "container") {
		const hasChildren = (node.children?.length ?? 0) > 0;

		return (
			// biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents lint/a11y/useKeyWithMouseEvents: canvas node + drop target
			<div
				// @react-pdf Views are flex column by default — match that so the node's
				// alignItems/justifyContent (e.g. a centered header) actually applies.
				style={{ display: "flex", flexDirection: "column", ...styleCss }}
				className={cn(
					"relative transition-colors",
					isSelected ? SELECT_OUTLINE : "hover:outline hover:outline-1 hover:outline-muted-foreground/20",
					dragOver && !addZoneDragOver && "bg-primary/5",
				)}
				onMouseOver={hoverHandler}
				onClick={selectHandler}
				onDragOver={(e) => {
					if (addZoneDragOver) return;
					e.preventDefault();
					e.stopPropagation();
					setDragOver(true);
				}}
				onDragLeave={() => setDragOver(false)}
				onDrop={(e) => {
					if (addZoneDragOver) return;
					setDragOver(false);
					onDropInContainer(e, node.id, null);
				}}
			>
				{hasChildren &&
					node.children?.map((child) => (
						<CanvasNodeRenderer
							key={child.id}
							node={child}
							selectedNodeId={selectedNodeId}
							onSelect={onSelect}
							onDelete={onDelete}
							onDropInContainer={onDropInContainer}
							hoveredNodeId={hoveredNodeId}
							onHoverNode={onHoverNode}
							theme={theme}
							depth={depth + 1}
						/>
					))}

				<ContainerAddZone
					isOver={addZoneDragOver}
					isEmpty={!hasChildren}
					onDragOver={(e) => {
						e.preventDefault();
						e.stopPropagation();
						setDragOver(false);
						setAddZoneDragOver(true);
					}}
					onDragLeave={() => setAddZoneDragOver(false)}
					onDrop={(e) => {
						setAddZoneDragOver(false);
						onDropInContainer(e, node.id, null);
					}}
				/>

				<NodeDeleteButton isVisible={isDeleteVisible} onDelete={() => onDelete(node.id)} />
			</div>
		);
	}

	return (
		<PlaceholderNodeView
			node={node}
			theme={theme}
			isSelected={isSelected}
			isDeleteVisible={isDeleteVisible}
			styleCss={styleCss}
			onSelect={selectHandler}
			onHover={hoverHandler}
			onDelete={() => onDelete(node.id)}
		/>
	);
}

// ─── Column cell ─────────────────────────────────────────────────────────────

type ColumnCellProps = Omit<CanvasNodeProps, "node" | "depth"> & {
	col: TemplateNode | null;
	colIdx: number;
	nodeId: string;
	width: string;
	depth: number;
};

function ColumnCell({
	col,
	colIdx,
	nodeId,
	width,
	selectedNodeId,
	onSelect,
	onDelete,
	onDropInContainer,
	hoveredNodeId,
	onHoverNode,
	theme,
	depth,
}: ColumnCellProps) {
	const [dragOver, setDragOver] = useState(false);
	const [addZoneDragOver, setAddZoneDragOver] = useState(false);
	const hasChildren = (col?.children?.length ?? 0) > 0;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: column drop target
		<div
			style={{ width }}
			className={cn(
				"flex min-h-[48px] flex-shrink-0 flex-col border border-muted-foreground/15 border-dashed transition-colors",
				dragOver && !addZoneDragOver && "border-primary/30 bg-primary/5",
			)}
			onDragOver={(e) => {
				if (addZoneDragOver) return;
				e.preventDefault();
				e.stopPropagation();
				setDragOver(true);
			}}
			onDragLeave={() => setDragOver(false)}
			onDrop={(e) => {
				if (addZoneDragOver) return;
				setDragOver(false);
				onDropInContainer(e, nodeId, colIdx);
			}}
		>
			{hasChildren &&
				col?.children?.map((child) => (
					<CanvasNodeRenderer
						key={child.id}
						node={child}
						selectedNodeId={selectedNodeId}
						onSelect={onSelect}
						onDelete={onDelete}
						onDropInContainer={onDropInContainer}
						hoveredNodeId={hoveredNodeId}
						onHoverNode={onHoverNode}
						theme={theme}
						depth={depth + 1}
					/>
				))}

			<ContainerAddZone
				isOver={addZoneDragOver}
				isEmpty={!hasChildren}
				onDragOver={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setDragOver(false);
					setAddZoneDragOver(true);
				}}
				onDragLeave={() => setAddZoneDragOver(false)}
				onDrop={(e) => {
					setAddZoneDragOver(false);
					onDropInContainer(e, nodeId, colIdx);
				}}
			/>
		</div>
	);
}

// ─── Container add-zone ──────────────────────────────────────────────────────

type ContainerAddZoneProps = {
	isOver: boolean;
	isEmpty: boolean;
	onDragOver: (e: React.DragEvent) => void;
	onDragLeave: () => void;
	onDrop: (e: React.DragEvent) => void;
};

function ContainerAddZone({ isOver, isEmpty, onDragOver, onDragLeave, onDrop }: ContainerAddZoneProps) {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drop zone
		<div
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
			className={cn(
				"mx-1.5 mb-1.5 flex items-center justify-center gap-1.5 self-stretch rounded border border-dashed font-medium text-[10px] transition-all",
				isEmpty ? "min-h-[36px]" : "mt-1 min-h-[24px] opacity-0 hover:opacity-100",
				isOver
					? "border-primary bg-primary/10 text-primary opacity-100"
					: "border-muted-foreground/20 text-muted-foreground/50 hover:border-muted-foreground/35",
			)}
		>
			{isOver ? (
				<Trans>Drop here</Trans>
			) : (
				<>
					<PlusIcon className="size-2.5" />
					<Trans>Add component</Trans>
				</>
			)}
		</div>
	);
}

// ─── Placeholder (WYSIWYG demo content) ──────────────────────────────────────

type PlaceholderNodeViewProps = {
	node: TemplateNode;
	theme: WysiwygTheme;
	isSelected: boolean;
	isDeleteVisible: boolean;
	styleCss: React.CSSProperties;
	onSelect: (e: React.MouseEvent) => void;
	onHover: (e: React.MouseEvent) => void;
	onDelete: () => void;
};

function PlaceholderNodeView({
	node,
	theme,
	isSelected,
	isDeleteVisible,
	styleCss,
	onSelect,
	onHover,
	onDelete,
}: PlaceholderNodeViewProps) {
	// The demo content styles itself from the base template's slots; the wrapper
	// only carries the node's own style overrides + selection affordance.
	// Picture nodes can self-align within their (flex) parent.
	const pictureAlign =
		node.type === "placeholder.picture"
			? (node.props?.pictureAlign as "left" | "center" | "right" | undefined)
			: undefined;
	const wrapperStyle: React.CSSProperties = pictureAlign
		? { ...styleCss, alignSelf: PICTURE_ALIGN_SELF[pictureAlign] }
		: styleCss;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents lint/a11y/useKeyWithMouseEvents: canvas node
		<div
			style={wrapperStyle}
			className={cn("relative cursor-pointer transition-all", isSelected ? SELECT_OUTLINE : HOVER_OUTLINE)}
			onMouseOver={onHover}
			onClick={onSelect}
		>
			<DemoPlaceholder
				type={node.type}
				theme={theme}
				pictureSize={node.props?.pictureSize as number | undefined}
				pictureBorderRadius={node.props?.pictureBorderRadius as number | undefined}
			/>
			<NodeDeleteButton isVisible={isDeleteVisible} onDelete={onDelete} />
		</div>
	);
}

// ─── Delete button ───────────────────────────────────────────────────────────

function NodeDeleteButton({ onDelete, isVisible }: { onDelete: () => void; isVisible: boolean }) {
	return (
		<button
			type="button"
			aria-label={t`Delete`}
			className={cn(
				"absolute end-1 top-1 z-10 size-6 items-center justify-center rounded bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border/50 backdrop-blur-sm transition-all hover:bg-destructive/10 hover:text-destructive hover:ring-destructive/30",
				isVisible ? "flex" : "hidden",
			)}
			onClick={(e) => {
				e.stopPropagation();
				onDelete();
			}}
		>
			<TrashSimpleIcon className="size-3.5" />
		</button>
	);
}
