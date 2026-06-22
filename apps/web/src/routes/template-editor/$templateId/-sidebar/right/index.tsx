import { Trans } from "@lingui/react/macro";
import { CursorClickIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { Input } from "@reactive-resume/ui/components/input";
import { Label } from "@reactive-resume/ui/components/label";
import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";
import { useCurrentTemplate, useSelectedNode, useTemplateEditorStore } from "@/features/template-editor/store";
import { NodePropertiesPanel } from "./node-properties";

// ─── Right sidebar (properties) ──────────────────────────────────────────────
//
// Shows the selected node's properties, or — when nothing is selected —
// template-level options.

export function TemplateEditorRightSidebar() {
	const selectedNode = useSelectedNode();

	return (
		<ScrollArea className="h-[calc(100svh-3.5rem)] bg-background">
			<div className="space-y-3 p-3">
				<div className="flex items-center gap-1.5 px-1">
					<SlidersHorizontalIcon className="size-4 text-muted-foreground" />
					<p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
						{selectedNode ? <Trans>Properties</Trans> : <Trans>Template options</Trans>}
					</p>
				</div>

				{selectedNode ? <NodePropertiesPanel node={selectedNode} /> : <TemplateGlobalSettings />}
			</div>
		</ScrollArea>
	);
}

// ─── Template-level (global) settings ────────────────────────────────────────

function TemplateGlobalSettings() {
	const template = useCurrentTemplate();
	const updateData = useTemplateEditorStore((state) => state.updateData);
	const page = template.data.page ?? {};

	const setPage = (patch: Partial<typeof page>) => {
		updateData((draft) => {
			draft.page = { ...draft.page, ...patch };
		});
	};

	return (
		<div className="space-y-4">
			<div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/30 p-3 text-muted-foreground">
				<CursorClickIcon className="mt-0.5 size-4 shrink-0" />
				<p className="text-[11px] leading-relaxed">
					<Trans>Select a component on the canvas to edit its individual styling.</Trans>
				</p>
			</div>

			<div className="space-y-3 rounded-md border p-3">
				<p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
					<Trans>Page</Trans>
				</p>

				<div className="grid grid-cols-2 gap-2">
					<NumberCell
						label="Horizontal padding"
						value={page.paddingHorizontal ?? 40}
						onChange={(v) => setPage({ paddingHorizontal: v })}
					/>
					<NumberCell
						label="Vertical padding"
						value={page.paddingVertical ?? 40}
						onChange={(v) => setPage({ paddingVertical: v })}
					/>
				</div>
			</div>

			<div className="space-y-3 rounded-md border p-3">
				<p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
					<Trans>Colors</Trans>
				</p>
				<ColorCell
					label="Background color"
					value={page.backgroundColor}
					onChange={(v) => setPage({ backgroundColor: v })}
				/>
				<ColorCell label="Primary color" value={page.primaryColor} onChange={(v) => setPage({ primaryColor: v })} />
				<ColorCell label="Text color" value={page.textColor} onChange={(v) => setPage({ textColor: v })} />
			</div>
		</div>
	);
}

function NumberCell({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
	return (
		<div className="space-y-1">
			<Label className="text-[10px] text-muted-foreground">{label}</Label>
			<Input
				type="number"
				min={0}
				max={120}
				value={value}
				onChange={(e) => {
					const v = Number(e.target.value);
					if (!Number.isNaN(v)) onChange(v);
				}}
				className="h-7 text-xs"
			/>
		</div>
	);
}

function ColorCell({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string | undefined;
	onChange: (v: string) => void;
}) {
	return (
		<div className="space-y-1">
			<Label className="text-[10px] text-muted-foreground">{label}</Label>
			<div className="flex items-center gap-2">
				<input
					type="color"
					value={value ?? "#000000"}
					onChange={(e) => onChange(e.target.value)}
					className="h-7 w-9 cursor-pointer rounded border bg-transparent"
				/>
				<Input
					type="text"
					value={value ?? ""}
					placeholder="default"
					onChange={(e) => onChange(e.target.value)}
					className="h-7 flex-1 text-xs"
				/>
			</div>
		</div>
	);
}
