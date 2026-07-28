import type { SemanticNode } from "@reactive-resume/resume/stylesheet";
import type { StylesheetMode } from "@reactive-resume/schema/resume/stylesheet";
import type { ReactNode } from "react";
import type { ResolvedPdfNodePresentation } from "./adapter";
import { createContext, use, useMemo } from "react";
import { semanticNodeKeys } from "./node-keys";

export type ResolvedResumePresentation = Readonly<Record<string, ResolvedPdfNodePresentation>>;

type SemanticRenderProviderProps = {
	presentation: ResolvedResumePresentation;
	mode: StylesheetMode;
	sourceTree: SemanticNode;
	renderTree: SemanticNode;
	children: ReactNode;
};

const EMPTY_NODE = Object.freeze({}) satisfies ResolvedPdfNodePresentation;
const SemanticRenderContext = createContext<{
	presentation: ResolvedResumePresentation;
	mode: StylesheetMode;
	renderedNodeKeys: ReadonlySet<string>;
	renderedChildKeys: ReadonlyMap<string, readonly string[]>;
	sourceNodes: readonly SemanticNode[];
	renderOrder: ReadonlyMap<string, number>;
} | null>(null);
const SemanticNodeKeyContext = createContext<string | undefined>(undefined);

const flattenTree = (root: SemanticNode): SemanticNode[] => {
	const nodes: SemanticNode[] = [];
	const visit = (node: SemanticNode) => {
		nodes.push(node);
		for (const child of node.children) visit(child);
	};
	visit(root);
	return nodes;
};

const indexRenderTree = (root: SemanticNode) => {
	const keys = new Set<string>();
	const childKeys = new Map<string, readonly string[]>();
	const order = new Map<string, number>();
	const visit = (node: SemanticNode) => {
		keys.add(node.key);
		order.set(node.key, order.size);
		childKeys.set(
			node.key,
			node.children.map(({ key }) => key),
		);
		for (const child of node.children) visit(child);
	};
	visit(root);
	return {
		renderedNodeKeys: keys as ReadonlySet<string>,
		renderedChildKeys: childKeys as ReadonlyMap<string, readonly string[]>,
		renderOrder: order as ReadonlyMap<string, number>,
	};
};

export function SemanticRenderProvider({
	presentation,
	mode,
	sourceTree,
	renderTree,
	children,
}: SemanticRenderProviderProps) {
	const treeIndex = useMemo(() => indexRenderTree(renderTree), [renderTree]);
	const sourceNodes = useMemo(() => flattenTree(sourceTree), [sourceTree]);
	const value = useMemo(
		() => ({ presentation, mode, sourceNodes, ...treeIndex }),
		[mode, presentation, sourceNodes, treeIndex],
	);
	return <SemanticRenderContext.Provider value={value}>{children}</SemanticRenderContext.Provider>;
}

export function useResolvedNode(nodeKey: string | undefined): ResolvedPdfNodePresentation {
	const context = use(SemanticRenderContext);
	if (!context || !nodeKey) return EMPTY_NODE;
	return context.presentation[nodeKey] ?? EMPTY_NODE;
}

export const useSemanticRenderMode = (): StylesheetMode => use(SemanticRenderContext)?.mode ?? "legacy";

export const useSemanticNodeVisible = (nodeKey: string | undefined): boolean => {
	const context = use(SemanticRenderContext);
	if (context?.mode !== "semantic" || !nodeKey) return true;
	return context.renderedNodeKeys.has(nodeKey);
};

export const useRenderedChildKeys = (nodeKey: string | undefined): readonly string[] | undefined => {
	const context = use(SemanticRenderContext);
	if (context?.mode !== "semantic" || !nodeKey) return undefined;
	return context.renderedChildKeys.get(nodeKey) ?? [];
};

export const useSemanticSectionNodeKey = (pageNodeKey: string, sectionId: string): string => {
	const context = use(SemanticRenderContext);
	const section = context?.sourceNodes.find(
		(node) => node.kind === "section" && node.id === sectionId && node.key.startsWith(`${pageNodeKey}/`),
	);
	return section?.key ?? semanticNodeKeys.section(semanticNodeKeys.region(pageNodeKey, "main"), sectionId);
};

export const useRenderedSectionIds = (pageNodeKey: string, authoredIds: readonly string[]): string[] => {
	const context = use(SemanticRenderContext);
	if (context?.mode !== "semantic") return [...authoredIds];

	const authored = new Set(authoredIds);
	return context.sourceNodes
		.filter(
			(node) =>
				node.kind === "section" &&
				node.id !== undefined &&
				authored.has(node.id) &&
				node.key.startsWith(`${pageNodeKey}/`) &&
				context.renderedNodeKeys.has(node.key),
		)
		.sort(
			(left, right) =>
				(context.renderOrder.get(left.key) ?? Number.MAX_SAFE_INTEGER) -
				(context.renderOrder.get(right.key) ?? Number.MAX_SAFE_INTEGER),
		)
		.flatMap(({ id }) => (id ? [id] : []));
};

export const useSemanticNodeBindings = () => {
	const context = use(SemanticRenderContext);

	return {
		resolveNode: (nodeKey: string | undefined): ResolvedPdfNodePresentation => {
			if (!context || !nodeKey) return EMPTY_NODE;
			return context.presentation[nodeKey] ?? EMPTY_NODE;
		},
		isNodeVisible: (nodeKey: string | undefined): boolean => {
			if (context?.mode !== "semantic" || !nodeKey) return true;
			return context.renderedNodeKeys.has(nodeKey);
		},
	};
};

export function SemanticNodeKeyProvider({ nodeKey, children }: { nodeKey: string | undefined; children: ReactNode }) {
	return <SemanticNodeKeyContext.Provider value={nodeKey}>{children}</SemanticNodeKeyContext.Provider>;
}

export const useSemanticNodeKey = (): string | undefined => use(SemanticNodeKeyContext);

export function SemanticItemNodeKeyProvider({ itemId, children }: { itemId: string; children: ReactNode }) {
	const parentNodeKey = useSemanticNodeKey();
	const nodeKey = parentNodeKey ? semanticNodeKeys.item(parentNodeKey, itemId) : undefined;
	return <SemanticNodeKeyProvider nodeKey={nodeKey}>{children}</SemanticNodeKeyProvider>;
}
