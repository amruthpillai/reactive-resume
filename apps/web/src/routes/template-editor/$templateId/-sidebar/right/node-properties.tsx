import type { TemplateNode } from "@reactive-resume/schema/custom-template";
import type { WritableDraft } from "immer";
import { Trans } from "@lingui/react/macro";
import { TrashSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
import { Label } from "@reactive-resume/ui/components/label";
import { removeNodeById, updateNodeById, useTemplateEditorStore } from "@/features/template-editor/store";

type Props = { node: TemplateNode };

export function NodePropertiesPanel({ node }: Props) {
	const updateData = useTemplateEditorStore((state) => state.updateData);
	const setSelectedNodeId = useTemplateEditorStore((state) => state.setSelectedNodeId);

	const updateProp = (key: string, value: unknown) => {
		updateData((draft) => {
			updateNodeById(draft.nodes as WritableDraft<TemplateNode>[], node.id, (n) => {
				n.props[key] = value;
			});
		});
	};

	const handleDelete = () => {
		updateData((draft) => {
			removeNodeById(draft.nodes as WritableDraft<TemplateNode>[], node.id);
		});
		setSelectedNodeId(null);
	};

	return (
		<div className="space-y-3 rounded-md border bg-card p-3 text-sm">
			<div className="flex items-center justify-between">
				<p className="font-medium capitalize">{node.type.replace("placeholder.", "")}</p>
				<Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={handleDelete}>
					<TrashSimpleIcon className="size-3.5" />
				</Button>
			</div>

			{node.type === "container" && (
				<>
					<div className="space-y-1">
						<Label className="text-xs">
							<Trans>Background Color</Trans>
						</Label>
						<Input
							type="color"
							className="h-8 w-full cursor-pointer p-0.5"
							value={(node.props.backgroundColor as string) ?? "#ffffff"}
							onChange={(e) => updateProp("backgroundColor", e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">
							<Trans>Padding (px)</Trans>
						</Label>
						<Input
							type="number"
							min={0}
							max={64}
							className="h-8"
							value={(node.props.padding as number) ?? 0}
							onChange={(e) => updateProp("padding", Number(e.target.value))}
						/>
					</div>
				</>
			)}

			{node.type === "columns" && (
				<>
					<div className="space-y-1">
						<Label className="text-xs">
							<Trans>Number of Columns</Trans>
						</Label>
						<div className="flex gap-1">
							{([2, 3, 4] as const).map((n) => (
								<Button
									key={n}
									size="sm"
									variant={(node.props.columnCount as number) === n ? "default" : "outline"}
									className="flex-1 text-xs"
									onClick={() => updateProp("columnCount", n)}
								>
									{n}
								</Button>
							))}
						</div>
					</div>

					<div className="space-y-1">
						<Label className="text-xs">
							<Trans>Column Widths (%)</Trans>
						</Label>
						<p className="text-muted-foreground text-xs">
							<Trans>Leave empty for equal widths</Trans>
						</p>
						{Array.from({ length: (node.props.columnCount as number) ?? 2 }, (_, i) => {
							const widths = (node.props.columnWidths as number[]) ?? [];
							return (
								<div key={i} className="flex items-center gap-2">
									<Label className="w-12 shrink-0 text-muted-foreground text-xs">Col {i + 1}</Label>
									<Input
										type="number"
										min={5}
										max={90}
										className="h-7 text-xs"
										placeholder="auto"
										value={widths[i] ?? ""}
										onChange={(e) => {
											const newWidths = [...widths];
											newWidths[i] = Number(e.target.value);
											updateProp("columnWidths", newWidths);
										}}
									/>
								</div>
							);
						})}
					</div>

					<div className="space-y-1">
						<Label className="text-xs">
							<Trans>Gap (px)</Trans>
						</Label>
						<Input
							type="number"
							min={0}
							max={64}
							className="h-8"
							value={(node.props.gap as number) ?? 8}
							onChange={(e) => updateProp("gap", Number(e.target.value))}
						/>
					</div>
				</>
			)}

			{node.type === "spacer" && (
				<div className="space-y-1">
					<Label className="text-xs">
						<Trans>Height (px)</Trans>
					</Label>
					<Input
						type="number"
						min={4}
						max={200}
						className="h-8"
						value={(node.props.height as number) ?? 16}
						onChange={(e) => updateProp("height", Number(e.target.value))}
					/>
				</div>
			)}

			{node.type === "placeholder.picture" && (
				<>
					<div className="space-y-1">
						<Label className="text-xs">
							<Trans>Size (px)</Trans>
						</Label>
						<Input
							type="number"
							min={32}
							max={200}
							className="h-8"
							value={(node.props.size as number) ?? 80}
							onChange={(e) => updateProp("size", Number(e.target.value))}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">
							<Trans>Border Radius (%)</Trans>
						</Label>
						<Input
							type="number"
							min={0}
							max={50}
							className="h-8"
							value={(node.props.borderRadius as number) ?? 0}
							onChange={(e) => updateProp("borderRadius", Number(e.target.value))}
						/>
					</div>
				</>
			)}
		</div>
	);
}
