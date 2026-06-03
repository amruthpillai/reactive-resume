import type { TemplateNode, TemplateNodeType } from "@reactive-resume/schema/custom-template";
import type { WritableDraft } from "immer";
import { Trans } from "@lingui/react/macro";
import { ArrowsOutSimpleIcon, PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";
import { generateId } from "@reactive-resume/utils/string";
import { cn } from "@reactive-resume/utils/style";
import {
	insertNodeAt,
	removeNodeById,
	useCurrentTemplate,
	useTemplateEditorStore,
} from "@/features/template-editor/store";

export const Route = createFileRoute("/template-editor/$templateId/")({
	component: TemplateEditorCanvas,
});

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
			props: { columnCount: count, gap: 8 },
			children: Array.from({ length: count }, () => ({
				id: generateId(),
				type: "container" as TemplateNodeType,
				props: {},
				children: [],
			})),
		};
	}

	if (payload.type === "container") {
		return { id, type: "container", props: { padding: 8 }, children: [] };
	}

	if (payload.type === "spacer") {
		return { id, type: "spacer", props: { height: 16 } };
	}

	if (payload.type === "page-break") {
		return { id, type: "page-break", props: {} };
	}

	return { id, type: payload.type, props: {} };
}

function TemplateEditorCanvas() {
	const template = useCurrentTemplate();
	const updateData = useTemplateEditorStore((state) => state.updateData);
	const selectedNodeId = useTemplateEditorStore((state) => state.selectedNodeId);
	const setSelectedNodeId = useTemplateEditorStore((state) => state.setSelectedNodeId);
	const [dragOverRootZone, setDragOverRootZone] = useState(false);

	const handleRootDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setDragOverRootZone(false);
			const raw = e.dataTransfer.getData("application/x-template-node");
			if (!raw) return;
			const payload = JSON.parse(raw) as DragPayload;
			const newNode = createNewNode(payload);
			updateData((draft) => {
				(draft.nodes as WritableDraft<TemplateNode>[]).push(newNode as WritableDraft<TemplateNode>);
			});
		},
		[updateData],
	);

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
			const raw = e.dataTransfer.getData("application/x-template-node");
			if (!raw) return;
			const payload = JSON.parse(raw) as DragPayload;
			const newNode = createNewNode(payload);
			updateData((draft) => {
				insertNodeAt(draft.nodes as WritableDraft<TemplateNode>[], containerId, colIdx, 0, newNode);
			});
		},
		[updateData],
	);

	return (
		<ScrollArea className="h-[calc(100svh-3.5rem)] bg-secondary/30">
			{/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: canvas root click deselects; keyboard users navigate via focusable nodes inside */}
			<div
				className="mx-auto my-8 flex min-h-[842px] w-[595px] flex-col gap-0 bg-white shadow-xl"
				onClick={(e) => {
					if (e.target === e.currentTarget) setSelectedNodeId(null);
				}}
			>
				{template.data.nodes.length === 0 ? (
					<DropZone
						isOver={dragOverRootZone}
						onDragOver={(e) => {
							e.preventDefault();
							setDragOverRootZone(true);
						}}
						onDragLeave={() => setDragOverRootZone(false)}
						onDrop={handleRootDrop}
						isEmpty
					/>
				) : (
					<>
						{template.data.nodes.map((node) => (
							<CanvasNodeRenderer
								key={node.id}
								node={node}
								selectedNodeId={selectedNodeId}
								onSelect={setSelectedNodeId}
								onDelete={handleDeleteNode}
								onDropInContainer={handleDropInContainer}
							/>
						))}
						<DropZone
							isOver={dragOverRootZone}
							onDragOver={(e) => {
								e.preventDefault();
								setDragOverRootZone(true);
							}}
							onDragLeave={() => setDragOverRootZone(false)}
							onDrop={handleRootDrop}
						/>
					</>
				)}
			</div>
		</ScrollArea>
	);
}

type DropZoneProps = {
	isOver: boolean;
	onDragOver: (e: React.DragEvent) => void;
	onDragLeave: () => void;
	onDrop: (e: React.DragEvent) => void;
	isEmpty?: boolean;
};

function DropZone({ isOver, onDragOver, onDragLeave, onDrop, isEmpty }: DropZoneProps) {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drop target in drag-and-drop editor
		<div
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
			className={cn(
				"flex items-center justify-center transition-all",
				isEmpty ? "m-4 min-h-[100px] flex-1 rounded border-2 border-dashed" : "h-3",
				isOver ? "h-6 border-primary bg-primary/10" : isEmpty ? "border-muted-foreground/30" : "border-transparent",
			)}
		>
			{isEmpty && !isOver && (
				<p className="text-muted-foreground text-sm">
					<Trans>Drag components here to build your template</Trans>
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

type CanvasNodeProps = {
	node: TemplateNode;
	selectedNodeId: string | null;
	onSelect: (id: string) => void;
	onDelete: (id: string) => void;
	onDropInContainer: (e: React.DragEvent, containerId: string, colIdx: number | null) => void;
	depth?: number;
};

function CanvasNodeRenderer({
	node,
	selectedNodeId,
	onSelect,
	onDelete,
	onDropInContainer,
	depth = 0,
}: CanvasNodeProps) {
	const isSelected = node.id === selectedNodeId;
	const [dragOver, setDragOver] = useState(false);

	if (node.type === "page-break") {
		return (
			<button
				type="button"
				className={cn(
					"group relative flex w-full cursor-pointer items-center gap-2 px-4 py-1",
					isSelected
						? "outline outline-2 outline-primary"
						: "hover:outline hover:outline-1 hover:outline-muted-foreground/40",
				)}
				onClick={(e) => {
					e.stopPropagation();
					onSelect(node.id);
				}}
			>
				<div className="flex-1 border-muted-foreground/40 border-t-2 border-dashed" />
				<span className="shrink-0 bg-white px-2 font-medium text-muted-foreground text-xs">
					<Trans>Page Break</Trans>
				</span>
				<div className="flex-1 border-muted-foreground/40 border-t-2 border-dashed" />
				<NodeDeleteButton onDelete={() => onDelete(node.id)} />
			</button>
		);
	}

	if (node.type === "spacer") {
		const height = (node.props.height as number) ?? 16;
		return (
			<button
				type="button"
				style={{ height }}
				className={cn(
					"group relative w-full cursor-pointer bg-muted/20 transition-colors",
					isSelected
						? "outline outline-2 outline-primary"
						: "hover:outline hover:outline-1 hover:outline-muted-foreground/40",
				)}
				onClick={(e) => {
					e.stopPropagation();
					onSelect(node.id);
				}}
			>
				<span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground/60">
					<ArrowsOutSimpleIcon className="me-1 size-3" />
					{height}px
				</span>
				<NodeDeleteButton onDelete={() => onDelete(node.id)} />
			</button>
		);
	}

	if (node.type === "columns") {
		const count = (node.props.columnCount as number) ?? 2;
		const gap = (node.props.gap as number) ?? 8;
		const widths = (node.props.columnWidths as number[]) ?? [];

		const getWidth = (i: number): string => {
			const w = widths[i];
			return w ? `${w}%` : `${100 / count}%`;
		};

		const columns = Array.from({ length: count }, (_, i) => node.children?.[i] ?? null);

		return (
			// biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: columns wrapper — click selects; drag-drop handled by children; keyboard via inner buttons
			<div
				className={cn(
					"group relative",
					isSelected
						? "outline outline-2 outline-primary"
						: "hover:outline hover:outline-1 hover:outline-muted-foreground/20",
				)}
				onClick={(e) => {
					e.stopPropagation();
					onSelect(node.id);
				}}
			>
				<div className="flex" style={{ gap }}>
					{columns.map((col, colIdx) => (
						// biome-ignore lint/a11y/noStaticElementInteractions: column drop target
						<div
							key={colIdx}
							style={{ width: getWidth(colIdx) }}
							className={cn("min-h-[40px] flex-shrink-0 transition-colors", dragOver && "bg-primary/5")}
							onDragOver={(e) => {
								e.preventDefault();
								e.stopPropagation();
								setDragOver(true);
							}}
							onDragLeave={() => setDragOver(false)}
							onDrop={(e) => {
								setDragOver(false);
								onDropInContainer(e, node.id, colIdx);
							}}
						>
							{col?.children?.map((child) => (
								<CanvasNodeRenderer
									key={child.id}
									node={child}
									selectedNodeId={selectedNodeId}
									onSelect={onSelect}
									onDelete={onDelete}
									onDropInContainer={onDropInContainer}
									depth={depth + 1}
								/>
							))}
							{(!col?.children || col.children.length === 0) && (
								<div className="flex h-full min-h-[40px] items-center justify-center border border-muted-foreground/20 border-dashed text-[10px] text-muted-foreground/50">
									Col {colIdx + 1}
								</div>
							)}
						</div>
					))}
				</div>
				<NodeDeleteButton onDelete={() => onDelete(node.id)} />
			</div>
		);
	}

	if (node.type === "container") {
		const padding = (node.props.padding as number) ?? 0;
		const bgColor = (node.props.backgroundColor as string) ?? "transparent";

		return (
			// biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: container is a drag-drop target; keyboard selection via outer focus
			<div
				style={{ padding, backgroundColor: bgColor }}
				className={cn(
					"group relative min-h-[32px] transition-colors",
					isSelected
						? "outline outline-2 outline-primary"
						: "hover:outline hover:outline-1 hover:outline-muted-foreground/20",
					dragOver && "bg-primary/5",
				)}
				onClick={(e) => {
					e.stopPropagation();
					onSelect(node.id);
				}}
				onDragOver={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setDragOver(true);
				}}
				onDragLeave={() => setDragOver(false)}
				onDrop={(e) => {
					setDragOver(false);
					onDropInContainer(e, node.id, null);
				}}
			>
				{node.children?.map((child) => (
					<CanvasNodeRenderer
						key={child.id}
						node={child}
						selectedNodeId={selectedNodeId}
						onSelect={onSelect}
						onDelete={onDelete}
						onDropInContainer={onDropInContainer}
						depth={depth + 1}
					/>
				))}

				{(!node.children || node.children.length === 0) && (
					<div className="flex min-h-[32px] items-center justify-center text-[10px] text-muted-foreground/50">
						<PlusIcon className="me-1 size-3" />
						<Trans>Drop components here</Trans>
					</div>
				)}

				<NodeDeleteButton onDelete={() => onDelete(node.id)} />
			</div>
		);
	}

	return <PlaceholderNodeView node={node} isSelected={isSelected} onSelect={onSelect} onDelete={onDelete} />;
}

const placeholderColors: Record<string, string> = {
	"placeholder.name": "bg-blue-100 text-blue-800",
	"placeholder.headline": "bg-indigo-100 text-indigo-800",
	"placeholder.picture": "bg-purple-100 text-purple-800",
	"placeholder.contact": "bg-pink-100 text-pink-800",
	"placeholder.summary": "bg-orange-100 text-orange-800",
	"placeholder.experience": "bg-amber-100 text-amber-800",
	"placeholder.education": "bg-yellow-100 text-yellow-800",
	"placeholder.projects": "bg-lime-100 text-lime-800",
	"placeholder.skills": "bg-green-100 text-green-800",
	"placeholder.languages": "bg-teal-100 text-teal-800",
	"placeholder.interests": "bg-cyan-100 text-cyan-800",
	"placeholder.awards": "bg-sky-100 text-sky-800",
	"placeholder.certifications": "bg-blue-50 text-blue-700",
	"placeholder.publications": "bg-violet-100 text-violet-800",
	"placeholder.volunteer": "bg-fuchsia-100 text-fuchsia-800",
	"placeholder.references": "bg-rose-100 text-rose-800",
	"placeholder.profiles": "bg-red-100 text-red-800",
};

const placeholderLabels: Record<string, string> = {
	"placeholder.name": "Full Name",
	"placeholder.headline": "Headline",
	"placeholder.picture": "Profile Picture",
	"placeholder.contact": "Contact Info",
	"placeholder.summary": "Summary",
	"placeholder.experience": "Experience",
	"placeholder.education": "Education",
	"placeholder.projects": "Projects",
	"placeholder.skills": "Skills",
	"placeholder.languages": "Languages",
	"placeholder.interests": "Interests",
	"placeholder.awards": "Awards",
	"placeholder.certifications": "Certifications",
	"placeholder.publications": "Publications",
	"placeholder.volunteer": "Volunteer",
	"placeholder.references": "References",
	"placeholder.profiles": "Social Profiles",
};

function PlaceholderNodeView({
	node,
	isSelected,
	onSelect,
	onDelete,
}: {
	node: TemplateNode;
	isSelected: boolean;
	onSelect: (id: string) => void;
	onDelete: (id: string) => void;
}) {
	const colorClass = placeholderColors[node.type] ?? "bg-gray-100 text-gray-700";
	const label = placeholderLabels[node.type] ?? node.type;
	const isPicture = node.type === "placeholder.picture";
	const size = isPicture ? ((node.props.size as number) ?? 80) : undefined;
	const borderRadius = isPicture ? ((node.props.borderRadius as number) ?? 0) : undefined;

	return (
		<button
			type="button"
			className={cn(
				"group relative w-full cursor-pointer transition-all",
				isSelected
					? "outline outline-2 outline-primary"
					: "hover:outline hover:outline-1 hover:outline-muted-foreground/40",
			)}
			onClick={(e) => {
				e.stopPropagation();
				onSelect(node.id);
			}}
		>
			{isPicture ? (
				<div className="flex items-center justify-center p-2">
					<div
						style={{ width: size, height: size, borderRadius: `${borderRadius}%` }}
						className={cn("flex items-center justify-center font-semibold text-[10px]", colorClass)}
					>
						{label}
					</div>
				</div>
			) : (
				<div className={cn("mx-2 my-1 min-h-[28px] rounded px-3 py-1.5 font-medium text-xs", colorClass)}>{label}</div>
			)}
			<NodeDeleteButton onDelete={() => onDelete(node.id)} />
		</button>
	);
}

function NodeDeleteButton({ onDelete }: { onDelete: () => void }) {
	return (
		<button
			type="button"
			className="absolute -end-2.5 -top-2.5 z-10 hidden size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm group-hover:flex"
			onClick={(e) => {
				e.stopPropagation();
				onDelete();
			}}
		>
			<TrashSimpleIcon className="size-2.5" />
		</button>
	);
}
