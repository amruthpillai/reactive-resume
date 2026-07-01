import type { CustomTemplateData, TemplateNode } from "@reactive-resume/schema/custom-template";
import type { WritableDraft } from "immer";
import { debounce } from "es-toolkit";
import { immer } from "zustand/middleware/immer";
import { create } from "zustand/react";
import { client } from "@/libs/orpc/client";

export type CustomTemplate = {
	id: string;
	name: string;
	data: CustomTemplateData;
	updatedAt: Date;
};

type TemplateEditorState = {
	template: CustomTemplate | null;
	templateId?: string;
	isReady: boolean;
	selectedNodeId: string | null;
};

type TemplateEditorActions = {
	initialize: (template: CustomTemplate) => void;
	reset: () => void;
	updateData: (fn: (draft: WritableDraft<CustomTemplateData>) => void) => void;
	patchTemplate: (fn: (draft: WritableDraft<CustomTemplate>) => void) => void;
	setSelectedNodeId: (id: string | null) => void;
};

type TemplateEditorStore = TemplateEditorState & TemplateEditorActions;

const syncTemplate = debounce(async (template: CustomTemplate) => {
	try {
		await client.customTemplate.update({
			id: template.id,
			name: template.name,
			data: template.data,
		});
	} catch (error) {
		console.error("Failed to save template:", error);
	}
}, 500);

export const useTemplateEditorStore = create<TemplateEditorStore>()(
	immer((set, get) => ({
		template: null,
		templateId: undefined,
		isReady: false,
		selectedNodeId: null,

		initialize: (template) => {
			set((state) => {
				state.template = template;
				state.templateId = template.id;
				state.isReady = true;
				state.selectedNodeId = null;
			});
		},

		reset: () => {
			set((state) => {
				state.template = null;
				state.templateId = undefined;
				state.isReady = false;
				state.selectedNodeId = null;
			});
		},

		updateData: (fn) => {
			set((state) => {
				if (!state.template) return;
				fn(state.template.data);
			});

			const template = get().template;
			if (template) syncTemplate(template);
		},

		patchTemplate: (fn) => {
			set((state) => {
				if (!state.template) return;
				fn(state.template);
			});

			const template = get().template;
			if (template) syncTemplate(template);
		},

		setSelectedNodeId: (id) => {
			set((state) => {
				state.selectedNodeId = id;
			});
		},
	})),
);

export const useCurrentTemplate = () => {
	const template = useTemplateEditorStore((state) => state.template);
	if (!template) throw new Error("Template not initialized");
	return template;
};

export const useSelectedNode = (): TemplateNode | null => {
	const template = useTemplateEditorStore((state) => state.template);
	const selectedNodeId = useTemplateEditorStore((state) => state.selectedNodeId);
	if (!template || !selectedNodeId) return null;
	return findNodeById(template.data.nodes, selectedNodeId);
};

// ─── Tree helpers ────────────────────────────────────────────────────────────

export function findNodeById(nodes: TemplateNode[], id: string): TemplateNode | null {
	for (const node of nodes) {
		if (node.id === id) return node;
		if (node.children) {
			const found = findNodeById(node.children, id);
			if (found) return found;
		}
	}
	return null;
}

export function updateNodeById(
	nodes: WritableDraft<TemplateNode>[],
	id: string,
	fn: (node: WritableDraft<TemplateNode>) => void,
): boolean {
	for (const node of nodes) {
		if (node.id === id) {
			fn(node);
			return true;
		}
		if (node.children) {
			if (updateNodeById(node.children as WritableDraft<TemplateNode>[], id, fn)) return true;
		}
	}
	return false;
}

export function removeNodeById(nodes: WritableDraft<TemplateNode>[], id: string): boolean {
	for (let i = 0; i < nodes.length; i++) {
		if (nodes[i]?.id === id) {
			nodes.splice(i, 1);
			return true;
		}
		const children = nodes[i]?.children;
		if (children) {
			if (removeNodeById(children as WritableDraft<TemplateNode>[], id)) return true;
		}
	}
	return false;
}

export function insertNodeAt(
	nodes: WritableDraft<TemplateNode>[],
	containerId: string | null,
	columnIndex: number | null,
	insertIndex: number,
	newNode: TemplateNode,
): boolean {
	if (containerId === null) {
		nodes.splice(insertIndex, 0, newNode as WritableDraft<TemplateNode>);
		return true;
	}
	for (const node of nodes) {
		if (node.id === containerId) {
			if (node.type === "columns" && columnIndex !== null) {
				const col = node.children?.[columnIndex];
				if (!col) return false;
				if (!col.children) col.children = [];
				(col.children as WritableDraft<TemplateNode>[]).splice(insertIndex, 0, newNode as WritableDraft<TemplateNode>);
			} else {
				if (!node.children) node.children = [];
				(node.children as WritableDraft<TemplateNode>[]).splice(insertIndex, 0, newNode as WritableDraft<TemplateNode>);
			}
			return true;
		}
		if (node.children) {
			if (insertNodeAt(node.children as WritableDraft<TemplateNode>[], containerId, columnIndex, insertIndex, newNode))
				return true;
		}
	}
	return false;
}
