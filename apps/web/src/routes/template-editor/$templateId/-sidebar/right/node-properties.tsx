import type { NodeStyle, TemplateNode } from "@reactive-resume/schema/custom-template";
import type { WritableDraft } from "immer";
import { Trans } from "@lingui/react/macro";
import { TrashIcon } from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
import { Label } from "@reactive-resume/ui/components/label";
import { Slider } from "@reactive-resume/ui/components/slider";
import { removeNodeById, updateNodeById, useTemplateEditorStore } from "@/features/template-editor/store";

type Props = { node: TemplateNode };

export function NodePropertiesPanel({ node }: Props) {
	const updateData = useTemplateEditorStore((state) => state.updateData);
	const setSelectedNodeId = useTemplateEditorStore((state) => state.setSelectedNodeId);

	const update = (fn: (n: WritableDraft<TemplateNode>) => void) => {
		updateData((draft) => {
			updateNodeById(draft.nodes as WritableDraft<TemplateNode>[], node.id, fn);
		});
	};

	const updateStyle = (patch: Partial<NodeStyle>) => {
		update((n) => {
			n.style = { ...n.style, ...patch };
		});
	};

	const handleDelete = () => {
		updateData((draft) => {
			removeNodeById(draft.nodes as WritableDraft<TemplateNode>[], node.id);
		});
		setSelectedNodeId(null);
	};

	return (
		<div className="space-y-4">
			<div className="space-y-1">
				<p className="font-medium text-xs">{labelForType(node.type)}</p>
				<p className="text-[10px] text-muted-foreground">ID: {node.id.slice(0, 8)}</p>
			</div>

			{/* ── Type-specific props ── */}
			{node.type === "columns" && <ColumnsProps node={node} update={update} />}
			{node.type === "spacer" && <SpacerProps node={node} update={update} />}
			{node.type === "placeholder.picture" && <PictureProps node={node} update={update} />}

			{/* ── Universal style controls (skip for spacer/page-break) ── */}
			{node.type !== "page-break" && (
				<>
					<StylePanel title="Spacing" expanded>
						<SpacingControls style={node.style} onUpdate={updateStyle} />
					</StylePanel>

					<StylePanel title="Colors">
						<ColorControls style={node.style} onUpdate={updateStyle} />
					</StylePanel>

					<StylePanel title="Typography">
						<TypographyControls style={node.style} onUpdate={updateStyle} />
					</StylePanel>

					<StylePanel title="Border">
						<BorderControls style={node.style} onUpdate={updateStyle} />
					</StylePanel>
				</>
			)}

			<Button variant="destructive" size="sm" className="w-full gap-2" onClick={handleDelete}>
				<TrashIcon className="size-3.5" />
				<Trans>Delete Node</Trans>
			</Button>
		</div>
	);
}

// ─── Type-specific prop panels ───────────────────────────────────────────────

type UpdateNode = (fn: (n: WritableDraft<TemplateNode>) => void) => void;

function ColumnsProps({ node, update }: { node: TemplateNode; update: UpdateNode }) {
	const count = node.props?.columnCount ?? 2;
	const gap = node.props?.gap ?? 16;
	const widths = (node.props?.columnWidths as number[] | undefined) ?? [];

	const setCount = (n: 2 | 3 | 4) => {
		update((draft) => {
			if (!draft.props) draft.props = {};
			draft.props.columnCount = n;
			// Ensure children array matches the new count
			const cur = (draft.children ?? []) as TemplateNode[];
			while (cur.length < n) {
				cur.push({ id: crypto.randomUUID(), type: "container", style: { padding: 8 }, children: [] });
			}
			while (cur.length > n) cur.pop();
			draft.children = cur as WritableDraft<TemplateNode>[];
		});
	};

	return (
		<div className="space-y-3 rounded-md border p-3">
			<Label className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
				<Trans>Columns</Trans>
			</Label>

			<div className="space-y-2">
				<Label className="text-xs">
					<Trans>Count</Trans>
				</Label>
				<div className="flex gap-1.5">
					{[2, 3, 4].map((n) => (
						<button
							key={n}
							type="button"
							onClick={() => setCount(n as 2 | 3 | 4)}
							className={`flex-1 rounded border px-2 py-1 font-medium text-xs transition-colors ${
								count === n ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary/40"
							}`}
						>
							{n}
						</button>
					))}
				</div>
			</div>

			<NumberRow
				label="Gap (px)"
				value={gap}
				min={0}
				max={64}
				onChange={(v) =>
					update((d) => {
						if (!d.props) d.props = {};
						d.props.gap = v;
					})
				}
			/>

			{count > 1 && (
				<div className="space-y-2">
					<Label className="text-xs">
						<Trans>Column widths (%)</Trans>
					</Label>
					<div className="flex gap-1.5">
						{Array.from({ length: count }, (_, i) => (
							<Input
								key={i}
								type="number"
								min={5}
								max={95}
								value={widths[i] ?? Math.round(100 / count)}
								onChange={(e) => {
									const v = Number(e.target.value);
									if (Number.isNaN(v)) return;
									update((d) => {
										if (!d.props) d.props = {};
										const ws = ((d.props.columnWidths as number[] | undefined) ?? []).slice();
										while (ws.length < count) ws.push(Math.round(100 / count));
										ws[i] = v;
										d.props.columnWidths = ws;
									});
								}}
								className="h-7 text-xs"
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function SpacerProps({ node, update }: { node: TemplateNode; update: UpdateNode }) {
	const height = node.props?.height ?? 16;
	return (
		<div className="space-y-3 rounded-md border p-3">
			<Label className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
				<Trans>Spacer</Trans>
			</Label>
			<NumberRow
				label="Height (px)"
				value={height}
				min={2}
				max={200}
				slider
				onChange={(v) =>
					update((d) => {
						if (!d.props) d.props = {};
						d.props.height = v;
					})
				}
			/>
		</div>
	);
}

function PictureProps({ node, update }: { node: TemplateNode; update: UpdateNode }) {
	const size = node.props?.pictureSize ?? 80;
	const radius = node.props?.pictureBorderRadius ?? 0;
	const align = (node.props?.pictureAlign as "left" | "center" | "right" | undefined) ?? "center";
	return (
		<div className="space-y-3 rounded-md border p-3">
			<Label className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
				<Trans>Picture</Trans>
			</Label>
			<NumberRow
				label="Size (px)"
				value={size}
				min={24}
				max={200}
				slider
				onChange={(v) =>
					update((d) => {
						if (!d.props) d.props = {};
						d.props.pictureSize = v;
					})
				}
			/>
			<NumberRow
				label="Border radius (%)"
				value={radius}
				min={0}
				max={50}
				slider
				onChange={(v) =>
					update((d) => {
						if (!d.props) d.props = {};
						d.props.pictureBorderRadius = v;
					})
				}
			/>

			<div className="space-y-2">
				<Label className="text-xs">
					<Trans>Alignment</Trans>
				</Label>
				<div className="flex gap-1.5">
					{(["left", "center", "right"] as const).map((a) => (
						<button
							key={a}
							type="button"
							onClick={() =>
								update((d) => {
									if (!d.props) d.props = {};
									d.props.pictureAlign = a;
								})
							}
							className={`flex-1 rounded border px-2 py-1 text-xs capitalize transition-colors ${
								align === a ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary/40"
							}`}
						>
							{a}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

// ─── Style controls ──────────────────────────────────────────────────────────

function SpacingControls({
	style,
	onUpdate,
}: {
	style: NodeStyle | undefined;
	onUpdate: (p: Partial<NodeStyle>) => void;
}) {
	return (
		<div className="space-y-3">
			<div>
				<Label className="text-xs">
					<Trans>Padding</Trans>
				</Label>
				<NumberRow
					label="All sides"
					value={style?.padding ?? 0}
					min={0}
					max={64}
					slider
					onChange={(v) => onUpdate({ padding: v })}
				/>
				<div className="mt-2 grid grid-cols-2 gap-2">
					<NumberRow
						label="Top"
						value={style?.paddingTop ?? 0}
						min={0}
						max={64}
						onChange={(v) => onUpdate({ paddingTop: v })}
						compact
					/>
					<NumberRow
						label="Right"
						value={style?.paddingRight ?? 0}
						min={0}
						max={64}
						onChange={(v) => onUpdate({ paddingRight: v })}
						compact
					/>
					<NumberRow
						label="Bottom"
						value={style?.paddingBottom ?? 0}
						min={0}
						max={64}
						onChange={(v) => onUpdate({ paddingBottom: v })}
						compact
					/>
					<NumberRow
						label="Left"
						value={style?.paddingLeft ?? 0}
						min={0}
						max={64}
						onChange={(v) => onUpdate({ paddingLeft: v })}
						compact
					/>
				</div>
			</div>

			<div>
				<Label className="text-xs">
					<Trans>Margin</Trans>
				</Label>
				<div className="mt-2 grid grid-cols-2 gap-2">
					<NumberRow
						label="Top"
						value={style?.marginTop ?? 0}
						min={0}
						max={64}
						onChange={(v) => onUpdate({ marginTop: v })}
						compact
					/>
					<NumberRow
						label="Bottom"
						value={style?.marginBottom ?? 0}
						min={0}
						max={64}
						onChange={(v) => onUpdate({ marginBottom: v })}
						compact
					/>
				</div>
			</div>
		</div>
	);
}

function ColorControls({
	style,
	onUpdate,
}: {
	style: NodeStyle | undefined;
	onUpdate: (p: Partial<NodeStyle>) => void;
}) {
	return (
		<div className="space-y-3">
			<ColorRow label="Background" value={style?.backgroundColor} onChange={(v) => onUpdate({ backgroundColor: v })} />
			<ColorRow label="Text color" value={style?.textColor} onChange={(v) => onUpdate({ textColor: v })} />
		</div>
	);
}

function TypographyControls({
	style,
	onUpdate,
}: {
	style: NodeStyle | undefined;
	onUpdate: (p: Partial<NodeStyle>) => void;
}) {
	return (
		<div className="space-y-3">
			<NumberRow
				label="Font size (px)"
				value={style?.fontSize ?? 0}
				min={8}
				max={64}
				slider
				onChange={(v) => onUpdate({ fontSize: v })}
			/>

			<div className="space-y-2">
				<Label className="text-xs">
					<Trans>Weight</Trans>
				</Label>
				<div className="flex gap-1.5">
					{(["400", "500", "600", "700"] as const).map((w) => (
						<button
							key={w}
							type="button"
							onClick={() => onUpdate({ fontWeight: w })}
							className={`flex-1 rounded border px-2 py-1 font-medium text-xs transition-colors ${
								style?.fontWeight === w ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary/40"
							}`}
						>
							{w}
						</button>
					))}
				</div>
			</div>

			<div className="space-y-2">
				<Label className="text-xs">
					<Trans>Align</Trans>
				</Label>
				<div className="flex gap-1.5">
					{(["left", "center", "right"] as const).map((a) => (
						<button
							key={a}
							type="button"
							onClick={() => onUpdate({ textAlign: a })}
							className={`flex-1 rounded border px-2 py-1 text-xs capitalize transition-colors ${
								style?.textAlign === a ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary/40"
							}`}
						>
							{a}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

function BorderControls({
	style,
	onUpdate,
}: {
	style: NodeStyle | undefined;
	onUpdate: (p: Partial<NodeStyle>) => void;
}) {
	return (
		<div className="space-y-3">
			<NumberRow
				label="Width (px)"
				value={style?.borderWidth ?? 0}
				min={0}
				max={8}
				slider
				onChange={(v) => onUpdate({ borderWidth: v })}
			/>
			<NumberRow
				label="Radius (px)"
				value={style?.borderRadius ?? 0}
				min={0}
				max={32}
				slider
				onChange={(v) => onUpdate({ borderRadius: v })}
			/>
			<ColorRow label="Color" value={style?.borderColor} onChange={(v) => onUpdate({ borderColor: v })} />
		</div>
	);
}

// ─── Generic atoms ───────────────────────────────────────────────────────────

function StylePanel({ title, expanded, children }: { title: string; expanded?: boolean; children: React.ReactNode }) {
	return (
		<details open={expanded} className="rounded-md border">
			<summary className="cursor-pointer list-none px-3 py-2 font-semibold text-[10px] text-muted-foreground uppercase tracking-wide hover:bg-secondary/30">
				{title}
			</summary>
			<div className="border-t p-3">{children}</div>
		</details>
	);
}

function NumberRow({
	label,
	value,
	min,
	max,
	slider = false,
	compact = false,
	onChange,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	slider?: boolean;
	compact?: boolean;
	onChange: (v: number) => void;
}) {
	return (
		<div className={compact ? "space-y-1" : "space-y-1.5"}>
			<Label className="text-[10px] text-muted-foreground">{label}</Label>
			<div className="flex items-center gap-2">
				{slider && (
					<Slider
						min={min}
						max={max}
						step={1}
						value={[value]}
						onValueChange={(v) => onChange(Array.isArray(v) ? (v[0] ?? value) : v)}
					/>
				)}
				<Input
					type="number"
					min={min}
					max={max}
					value={value}
					onChange={(e) => {
						const v = Number(e.target.value);
						if (Number.isNaN(v)) return;
						onChange(Math.max(min, Math.min(max, v)));
					}}
					className="h-7 w-20 shrink-0 text-xs"
				/>
			</div>
		</div>
	);
}

function ColorRow({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string | undefined;
	onChange: (v: string) => void;
}) {
	const display = value ?? "#000000";
	return (
		<div className="space-y-1.5">
			<Label className="text-[10px] text-muted-foreground">{label}</Label>
			<div className="flex items-center gap-2">
				<input
					type="color"
					value={display}
					onChange={(e) => onChange(e.target.value)}
					className="h-7 w-9 cursor-pointer rounded border bg-transparent"
				/>
				<Input
					type="text"
					value={value ?? ""}
					placeholder="transparent"
					onChange={(e) => onChange(e.target.value)}
					className="h-7 flex-1 text-xs"
				/>
			</div>
		</div>
	);
}

// ─── Labels ──────────────────────────────────────────────────────────────────

function labelForType(type: TemplateNode["type"]): string {
	const map: Record<string, string> = {
		container: "Container",
		columns: "Columns",
		spacer: "Spacer",
		"page-break": "Page Break",
		"placeholder.name": "Full Name",
		"placeholder.headline": "Headline",
		"placeholder.picture": "Picture",
		"placeholder.contact": "Contact Info",
		"placeholder.summary": "Summary",
		"placeholder.profiles": "Social Profiles",
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
	};
	return map[type] ?? type;
}
