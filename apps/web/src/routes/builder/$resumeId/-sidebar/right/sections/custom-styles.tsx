import type {
	ResumeData,
	StyleIntent,
	StyleRule,
	StyleRuleTarget,
	StyleSlot,
} from "@reactive-resume/schema/resume/data";
import type { ReactNode } from "react";
import type { ComboboxOption } from "@/components/ui/combobox";
import { Trans } from "@lingui/react/macro";
import { EyeIcon, EyeSlashIcon, PencilSimpleIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { sectionTypeSchema } from "@reactive-resume/schema/resume/data";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
import { Label } from "@reactive-resume/ui/components/label";
import { Separator } from "@reactive-resume/ui/components/separator";
import { cn } from "@reactive-resume/utils/style";
import { ColorPicker } from "@/components/input/color-picker";
import { Combobox } from "@/components/ui/combobox";
import { useCurrentResume, useUpdateResumeData } from "@/features/resume/builder/draft";
import { getSectionTitle } from "@/libs/resume/section";
import { SectionBase } from "../shared/section-base";

type TargetScope = StyleRuleTarget["scope"];

type StyleSlotOption = {
	value: StyleSlot;
	label: string;
	group: "Section" | "Rich text";
};

const targetScopeOptions: ComboboxOption<TargetScope>[] = [
	{ value: "global", label: "All sections" },
	{ value: "sectionType", label: "Section type" },
	{ value: "sectionId", label: "Specific section" },
];

const styleSlotOptions: StyleSlotOption[] = [
	{ value: "section", label: "Section container", group: "Section" },
	{ value: "heading", label: "Section heading", group: "Section" },
	{ value: "item", label: "Item container", group: "Section" },
	{ value: "text", label: "Primary text", group: "Section" },
	{ value: "secondaryText", label: "Secondary text", group: "Section" },
	{ value: "link", label: "Link", group: "Section" },
	{ value: "icon", label: "Icon", group: "Section" },
	{ value: "level", label: "Level indicator", group: "Section" },
	{ value: "richParagraph", label: "Paragraph", group: "Rich text" },
	{ value: "richList", label: "List", group: "Rich text" },
	{ value: "richListItemRow", label: "List item row", group: "Rich text" },
	{ value: "richListItemContent", label: "List item content", group: "Rich text" },
	{ value: "richLink", label: "Inline link", group: "Rich text" },
	{ value: "richBold", label: "Bold text", group: "Rich text" },
	{ value: "richMark", label: "Highlight", group: "Rich text" },
];

const styleSlotComboboxOptions: ComboboxOption<StyleSlot>[] = styleSlotOptions.map((option) => ({
	value: option.value,
	label: option.label,
	group: option.group,
	keywords: [option.group],
}));

const fontWeightOptions = ["100", "200", "300", "400", "500", "600", "700", "800", "900"] as const;
const fontStyleOptions = [
	{ value: "normal", label: "Normal" },
	{ value: "italic", label: "Italic" },
] as const satisfies readonly { value: NonNullable<StyleIntent["fontStyle"]>; label: string }[];
const textDecorationOptions = [
	{ value: "none", label: "None" },
	{ value: "underline", label: "Underline" },
	{ value: "line-through", label: "Line through" },
] as const satisfies readonly { value: NonNullable<StyleIntent["textDecoration"]>; label: string }[];
const textDecorationStyleOptions = [
	{ value: "solid", label: "Solid" },
	{ value: "dashed", label: "Dashed" },
	{ value: "dotted", label: "Dotted" },
] as const satisfies readonly { value: NonNullable<StyleIntent["textDecorationStyle"]>; label: string }[];
const textAlignOptions = [
	{ value: "left", label: "Left" },
	{ value: "center", label: "Center" },
	{ value: "right", label: "Right" },
	{ value: "justify", label: "Justify" },
] as const satisfies readonly { value: NonNullable<StyleIntent["textAlign"]>; label: string }[];
const textTransformOptions = [
	{ value: "none", label: "None" },
	{ value: "uppercase", label: "Uppercase" },
	{ value: "lowercase", label: "Lowercase" },
	{ value: "capitalize", label: "Capitalize" },
] as const satisfies readonly { value: NonNullable<StyleIntent["textTransform"]>; label: string }[];
const borderStyleOptions = [
	{ value: "solid", label: "Solid" },
	{ value: "dashed", label: "Dashed" },
	{ value: "dotted", label: "Dotted" },
] as const satisfies readonly { value: NonNullable<StyleIntent["borderStyle"]>; label: string }[];

const controlGridClassName = "grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-3";
const exactFourControlGridClassName = "grid grid-cols-1 gap-3 @min-[20rem]:grid-cols-2 @min-[35rem]:grid-cols-4";
const compactSpacingInputClassName =
	"h-8 w-18 max-w-18 min-w-0 px-1.5 text-center text-xs tabular-nums placeholder:text-[0.68rem] placeholder:uppercase placeholder:tracking-wide";

export function CustomStylesSectionBuilder() {
	return (
		<SectionBase type="styles" className="space-y-4">
			<CustomStylesSectionForm />
		</SectionBase>
	);
}

function CustomStylesSectionForm() {
	const resume = useCurrentResume();
	const data = resume.data;
	const updateResumeData = useUpdateResumeData();
	const sectionOptions = useMemo<ComboboxOption<string>[]>(() => getSectionIdOptions(data), [data]);
	const sectionTypeOptions = useMemo<ComboboxOption<string>[]>(
		() => sectionTypeSchema.options.map((type) => ({ value: type, label: getSectionTitle(type) })),
		[],
	);
	const styleRules = data.metadata.styleRules ?? [];

	const [targetScope, setTargetScope] = useState<TargetScope>("global");
	const [sectionType, setSectionType] = useState("summary");
	const [sectionId, setSectionId] = useState("summary");
	const [slot, setSlot] = useState<StyleSlot>("heading");

	const target = createTarget({ targetScope, sectionType, sectionId });
	const ruleId = getStyleRuleId(target, slot);
	const currentRule = styleRules.find((rule) => rule.id === ruleId);
	const currentIntent = currentRule?.slots[slot] ?? {};
	const targetLabel = getTargetLabel(data, target);
	const slotLabel = getSlotLabel(slot);

	const upsertIntent = (patch: Partial<StyleIntent>) => {
		const nextIntent = compactIntent({ ...currentIntent, ...patch });

		updateResumeData((draft) => {
			draft.metadata.styleRules ??= [];
			const rules = draft.metadata.styleRules;
			const existingIndex = rules.findIndex((rule) => rule.id === ruleId);
			const existingRule = rules[existingIndex];

			if (Object.keys(nextIntent).length === 0) {
				if (existingIndex >= 0) rules.splice(existingIndex, 1);
				return;
			}

			const nextRule: StyleRule = {
				id: ruleId,
				label: existingRule?.label || `${targetLabel}: ${slotLabel}`,
				enabled: existingRule?.enabled ?? true,
				target,
				slots: { [slot]: nextIntent },
			};

			if (existingIndex >= 0) rules[existingIndex] = nextRule;
			else rules.push(nextRule);
		});
	};

	const resetRule = () => {
		updateResumeData((draft) => {
			draft.metadata.styleRules = (draft.metadata.styleRules ?? []).filter((rule) => rule.id !== ruleId);
		});
	};

	const updateRuleEnabled = (ruleId: string, enabled: boolean) => {
		updateResumeData((draft) => {
			const rule = (draft.metadata.styleRules ?? []).find((rule) => rule.id === ruleId);
			if (rule) rule.enabled = enabled;
		});
	};

	const editRule = (rule: StyleRule) => {
		const nextSlot = getConfiguredSlots(rule)[0];
		if (!nextSlot) return;

		setTargetScope(rule.target.scope);
		if (rule.target.scope === "sectionType") setSectionType(rule.target.sectionType);
		if (rule.target.scope === "sectionId") setSectionId(rule.target.sectionId);
		setSlot(nextSlot);
	};

	const deleteRule = (ruleId: string) => {
		updateResumeData((draft) => {
			draft.metadata.styleRules = (draft.metadata.styleRules ?? []).filter((rule) => rule.id !== ruleId);
		});
	};

	return (
		<div className="space-y-4">
			<div className={controlGridClassName}>
				<Field label="Target Scope" id="style-target-scope">
					<Combobox
						id="style-target-scope"
						options={targetScopeOptions}
						value={targetScope}
						onValueChange={(value) => {
							if (value) setTargetScope(value);
						}}
						className="w-full"
						placeholder="Target scope"
						searchPlaceholder="Search scopes..."
					/>
				</Field>

				{targetScope === "sectionType" && (
					<Field label="Section Type" id="style-section-type">
						<Combobox
							id="style-section-type"
							options={sectionTypeOptions}
							value={sectionType}
							onValueChange={(value) => {
								if (value) setSectionType(value);
							}}
							className="w-full"
							placeholder="Section type"
							searchPlaceholder="Search section types..."
						/>
					</Field>
				)}

				{targetScope === "sectionId" && (
					<Field label="Section" id="style-section-id">
						<Combobox
							id="style-section-id"
							options={sectionOptions}
							value={sectionId}
							onValueChange={(value) => {
								if (value) setSectionId(value);
							}}
							className="w-full"
							placeholder="Section"
							searchPlaceholder="Search sections..."
						/>
					</Field>
				)}

				<Field label="Style Slot" id="style-slot">
					<Combobox
						id="style-slot"
						options={styleSlotComboboxOptions}
						value={slot}
						onValueChange={(value) => {
							if (value) setSlot(value);
						}}
						className="w-full"
						placeholder="Style slot"
						searchPlaceholder="Search style slots..."
					/>
				</Field>
			</div>

			<Separator />

			<RuleIntentEditor idPrefix="style" intent={currentIntent} onChange={upsertIntent} />

			<div className="flex justify-end">
				<Button type="button" variant="outline" onClick={resetRule}>
					<Trans>Reset Style</Trans>
				</Button>
			</div>

			<Separator />

			<AppliedRulesList
				data={data}
				rules={styleRules}
				onToggleRule={updateRuleEnabled}
				onEditRule={editRule}
				onDeleteRule={deleteRule}
			/>
		</div>
	);
}

type FieldProps = {
	label: string;
	id: string;
	children: ReactNode;
};

function Field({ label, id, children }: FieldProps) {
	return (
		<div className="min-w-0 space-y-2">
			<Label htmlFor={id} className="block min-w-0 text-pretty leading-snug">
				{label}
			</Label>
			{children}
		</div>
	);
}

type ColorFieldProps = {
	label: string;
	id: string;
	value: string | undefined;
	placeholder?: string;
	fallback: string;
	onChange: (value: string | undefined) => void;
};

function ColorField({ label, id, value, placeholder, fallback, onChange }: ColorFieldProps) {
	return (
		<Field label={label} id={id}>
			<div className="flex min-w-0 items-center gap-3">
				<ColorPicker value={value ?? fallback} defaultValue={fallback} onChange={(color) => onChange(color)} />
				<Input
					id={id}
					className="min-w-0"
					value={value ?? ""}
					placeholder={placeholder}
					onChange={(event) => onChange(event.target.value.trim() || undefined)}
				/>
			</div>
		</Field>
	);
}

type NumberInputProps = {
	label: string;
	id?: string;
	value: number | undefined;
	min: number;
	max: number;
	step?: number;
	onChange: (value: number | undefined) => void;
};

function NumberInput({ label, id, value, min, max, step = 1, onChange }: NumberInputProps) {
	const inputId = id ?? `style-${label.toLowerCase().replaceAll(" ", "-")}`;

	return (
		<Field label={label} id={inputId}>
			<Input
				id={inputId}
				className="tabular-nums"
				value={value ?? ""}
				type="number"
				min={min}
				max={max}
				step={step}
				onChange={(event) => {
					const value = event.target.value;
					onChange(value === "" ? undefined : Number(value));
				}}
			/>
		</Field>
	);
}

type AppliedRulesListProps = {
	data: ResumeData;
	rules: StyleRule[];
	onToggleRule: (ruleId: string, enabled: boolean) => void;
	onEditRule: (rule: StyleRule) => void;
	onDeleteRule: (ruleId: string) => void;
};

function AppliedRulesList({ data, rules, onToggleRule, onEditRule, onDeleteRule }: AppliedRulesListProps) {
	return (
		<section className="space-y-3">
			<div className="space-y-0.5">
				<h3 className="font-medium text-sm">
					<Trans>Applied Rules</Trans>
				</h3>
				<p className="text-muted-foreground text-xs tabular-nums">
					{rules.length} {rules.length === 1 ? <Trans>rule</Trans> : <Trans>rules</Trans>}
				</p>
			</div>

			{rules.length === 0 ? (
				<div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-muted-foreground text-sm">
					<Trans>No style rules yet.</Trans>
				</div>
			) : (
				<div className="space-y-2">
					{rules.map((rule) => (
						<AppliedRuleCard
							key={rule.id}
							data={data}
							rule={rule}
							onToggleRule={onToggleRule}
							onEditRule={onEditRule}
							onDeleteRule={onDeleteRule}
						/>
					))}
				</div>
			)}
		</section>
	);
}

type AppliedRuleCardProps = {
	data: ResumeData;
	rule: StyleRule;
	onToggleRule: (ruleId: string, enabled: boolean) => void;
	onEditRule: (rule: StyleRule) => void;
	onDeleteRule: (ruleId: string) => void;
};

function AppliedRuleCard({ data, rule, onToggleRule, onEditRule, onDeleteRule }: AppliedRuleCardProps) {
	const slots = getConfiguredSlots(rule);
	const primaryIntent = slots[0] ? rule.slots[slots[0]] : undefined;
	const fallbackLabel = getRuleFallbackLabel(data, rule);
	const ruleLabel = rule.label || fallbackLabel;
	const targetLabel = getTargetLabel(data, rule.target);
	const slotLabel = slots.length > 0 ? slots.map(getSlotLabel).join(", ") : "No slot";

	return (
		<div className={cn("rounded-lg border bg-background/70 p-3 transition-opacity", !rule.enabled && "opacity-60")}>
			<div className="flex items-start gap-3">
				<div className="min-w-0 flex-1 space-y-2">
					<div className="flex min-w-0 flex-wrap items-center gap-2">
						<RuleScopePill target={targetLabel} slot={slotLabel} />
					</div>

					{primaryIntent && <RulePropertySummary intent={primaryIntent} />}
				</div>

				<div className="flex shrink-0 items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						aria-label={`${rule.enabled ? "Disable" : "Enable"} ${ruleLabel}`}
						aria-pressed={rule.enabled}
						onClick={() => onToggleRule(rule.id, !rule.enabled)}
					>
						{rule.enabled ? <EyeIcon /> : <EyeSlashIcon />}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						aria-label={`Edit ${ruleLabel}`}
						onClick={() => onEditRule(rule)}
					>
						<PencilSimpleIcon />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						aria-label={`Delete ${ruleLabel}`}
						onClick={() => onDeleteRule(rule.id)}
					>
						<TrashSimpleIcon />
					</Button>
				</div>
			</div>
		</div>
	);
}

type RuleScopePillProps = {
	target: string;
	slot: string;
};

function RuleScopePill({ target, slot }: RuleScopePillProps) {
	return (
		<div className="inline-flex max-w-full overflow-hidden rounded-sm border border-border/80 bg-background text-xs shadow-xs">
			<span className="min-w-0 max-w-32 truncate bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
				{target}
			</span>
			<span className="min-w-0 max-w-40 truncate px-2.5 py-1 font-medium text-foreground">{slot}</span>
		</div>
	);
}

type RuleIntentEditorProps = {
	idPrefix: string;
	intent: StyleIntent;
	labelPrefix?: string;
	onChange: (patch: Partial<StyleIntent>) => void;
};

function RuleIntentEditor({ idPrefix, intent, labelPrefix, onChange }: RuleIntentEditorProps) {
	const labelStart = labelPrefix ? `${labelPrefix} ` : "";

	return (
		<div className="space-y-3">
			<ControlPanel title="Color">
				<div className={exactFourControlGridClassName}>
					<ColorField
						label={`${labelStart}Text Color`}
						id={`${idPrefix}-color`}
						value={intent.color}
						placeholder="rgba(0, 0, 0, 1)"
						fallback="rgba(0, 0, 0, 1)"
						onChange={(color) => onChange({ color })}
					/>
					<ColorField
						label={`${labelStart}Background`}
						id={`${idPrefix}-background`}
						value={intent.backgroundColor}
						placeholder="rgba(255, 255, 255, 1)"
						fallback="rgba(255, 255, 255, 1)"
						onChange={(backgroundColor) => onChange({ backgroundColor })}
					/>
					<ColorField
						label={`${labelStart}Text Decoration Color`}
						id={`${idPrefix}-text-decoration-color`}
						value={intent.textDecorationColor}
						placeholder="rgba(0, 0, 0, 1)"
						fallback="rgba(0, 0, 0, 1)"
						onChange={(textDecorationColor) => onChange({ textDecorationColor })}
					/>
					<NumberInput
						label={`${labelStart}Opacity`}
						id={`${idPrefix}-opacity`}
						value={intent.opacity}
						min={0}
						max={1}
						step={0.05}
						onChange={(opacity) => onChange({ opacity })}
					/>
				</div>
			</ControlPanel>

			<ControlPanel title="Text">
				<div className={controlGridClassName}>
					<NumberInput
						label={`${labelStart}Font Size`}
						id={`${idPrefix}-font-size`}
						value={intent.fontSize}
						min={6}
						max={48}
						onChange={(fontSize) => onChange({ fontSize })}
					/>
					<FontWeightField
						label={`${labelStart}Font Weight`}
						id={`${idPrefix}-font-weight`}
						value={intent.fontWeight}
						onChange={(fontWeight) => onChange({ fontWeight })}
					/>
					<IntentSelectField
						label={`${labelStart}Font Style`}
						id={`${idPrefix}-font-style`}
						value={intent.fontStyle}
						options={fontStyleOptions}
						onChange={(fontStyle) => onChange({ fontStyle })}
					/>
					<NumberInput
						label={`${labelStart}Line Height`}
						id={`${idPrefix}-line-height`}
						value={intent.lineHeight}
						min={0.5}
						max={4}
						step={0.05}
						onChange={(lineHeight) => onChange({ lineHeight })}
					/>
					<NumberInput
						label={`${labelStart}Letter Spacing`}
						id={`${idPrefix}-letter-spacing`}
						value={intent.letterSpacing}
						min={-16}
						max={16}
						step={0.1}
						onChange={(letterSpacing) => onChange({ letterSpacing })}
					/>
					<IntentSelectField
						label={`${labelStart}Text Decoration`}
						id={`${idPrefix}-text-decoration`}
						value={intent.textDecoration}
						options={textDecorationOptions}
						onChange={(textDecoration) => onChange({ textDecoration })}
					/>
					<IntentSelectField
						label={`${labelStart}Decoration Style`}
						id={`${idPrefix}-text-decoration-style`}
						value={intent.textDecorationStyle}
						options={textDecorationStyleOptions}
						onChange={(textDecorationStyle) => onChange({ textDecorationStyle })}
					/>
					<IntentSelectField
						label={`${labelStart}Text Align`}
						id={`${idPrefix}-text-align`}
						value={intent.textAlign}
						options={textAlignOptions}
						onChange={(textAlign) => onChange({ textAlign })}
					/>
					<IntentSelectField
						label={`${labelStart}Text Transform`}
						id={`${idPrefix}-text-transform`}
						value={intent.textTransform}
						options={textTransformOptions}
						onChange={(textTransform) => onChange({ textTransform })}
					/>
				</div>
			</ControlPanel>

			<ControlPanel title="Spacing">
				<div className="space-y-3">
					<PaddingSideInputs idPrefix={idPrefix} intent={intent} labelPrefix={labelPrefix} onChange={onChange} />
					<MarginSideInputs idPrefix={idPrefix} intent={intent} labelPrefix={labelPrefix} onChange={onChange} />
					<SpacingInputGroup label="Gap">
						<CompactNumberInput
							ariaLabel={`${labelStart}Row Gap`}
							id={`${idPrefix}-row-gap`}
							placeholder="row"
							value={intent.rowGap}
							min={-72}
							max={72}
							onChange={(rowGap) => onChange({ rowGap })}
						/>
						<CompactNumberInput
							ariaLabel={`${labelStart}Column Gap`}
							id={`${idPrefix}-column-gap`}
							placeholder="column"
							value={intent.columnGap}
							min={-72}
							max={72}
							onChange={(columnGap) => onChange({ columnGap })}
						/>
					</SpacingInputGroup>
				</div>
			</ControlPanel>

			<ControlPanel title="Border">
				<div className={exactFourControlGridClassName}>
					<IntentSelectField
						label={`${labelStart}Border Style`}
						id={`${idPrefix}-border-style`}
						value={intent.borderStyle}
						options={borderStyleOptions}
						onChange={(borderStyle) => onChange({ borderStyle })}
					/>
					<NumberInput
						label={`${labelStart}Border Width`}
						id={`${idPrefix}-border-width`}
						value={intent.borderWidth}
						min={0}
						max={24}
						onChange={(borderWidth) => onChange({ borderWidth })}
					/>
					<NumberInput
						label={`${labelStart}Border Radius`}
						id={`${idPrefix}-border-radius`}
						value={intent.borderRadius}
						min={0}
						max={72}
						onChange={(borderRadius) => onChange({ borderRadius })}
					/>
					<ColorField
						label={`${labelStart}Border Color`}
						id={`${idPrefix}-border-color`}
						value={intent.borderColor}
						placeholder="rgba(0, 0, 0, 1)"
						fallback="rgba(0, 0, 0, 1)"
						onChange={(borderColor) => onChange({ borderColor })}
					/>
				</div>
			</ControlPanel>
		</div>
	);
}

type ControlPanelProps = {
	title: string;
	children: ReactNode;
};

function ControlPanel({ title, children }: ControlPanelProps) {
	return (
		<section className="@container space-y-3 rounded-lg border bg-muted/10 p-3">
			<h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{title}</h3>
			{children}
		</section>
	);
}

type IntentSelectFieldProps<TValue extends string> = {
	label: string;
	id: string;
	value: TValue | undefined;
	options: readonly ComboboxOption<TValue>[];
	onChange: (value: TValue | undefined) => void;
};

function IntentSelectField<TValue extends string>({
	label,
	id,
	value,
	options,
	onChange,
}: IntentSelectFieldProps<TValue>) {
	return (
		<Field label={label} id={id}>
			<Combobox
				id={id}
				options={[...options]}
				value={value ?? null}
				onValueChange={(nextValue) => onChange(nextValue ?? undefined)}
				className="w-full"
				showClear
				placeholder="Default"
				searchPlaceholder={`Search ${label.toLowerCase()}...`}
			/>
		</Field>
	);
}

type FontWeightFieldProps = {
	label: string;
	id: string;
	value: StyleIntent["fontWeight"] | undefined;
	onChange: (value: StyleIntent["fontWeight"] | undefined) => void;
};

function FontWeightField({ label, id, value, onChange }: FontWeightFieldProps) {
	const options: ComboboxOption<NonNullable<StyleIntent["fontWeight"]>>[] = fontWeightOptions.map((weight) => ({
		value: weight,
		label: weight,
	}));

	return (
		<Field label={label} id={id}>
			<Combobox
				id={id}
				options={options}
				value={value ?? null}
				onValueChange={(nextValue) => onChange(nextValue ?? undefined)}
				className="w-full"
				showClear
				placeholder="Default"
				searchPlaceholder="Search font weights..."
			/>
		</Field>
	);
}

const paddingSideOptions = [
	{ property: "paddingTop", label: "Top" },
	{ property: "paddingRight", label: "Right" },
	{ property: "paddingBottom", label: "Bottom" },
	{ property: "paddingLeft", label: "Left" },
] as const;

type PaddingSideProperty = (typeof paddingSideOptions)[number]["property"];

const marginSideOptions = [
	{ property: "marginTop", label: "Top" },
	{ property: "marginRight", label: "Right" },
	{ property: "marginBottom", label: "Bottom" },
	{ property: "marginLeft", label: "Left" },
] as const;

type MarginSideProperty = (typeof marginSideOptions)[number]["property"];

type PaddingSideInputsProps = {
	idPrefix: string;
	intent: StyleIntent;
	labelPrefix?: string;
	onChange: (patch: Partial<StyleIntent>) => void;
};

function PaddingSideInputs({ idPrefix, intent, labelPrefix, onChange }: PaddingSideInputsProps) {
	const labelStart = labelPrefix ? `${labelPrefix} ` : "";

	return (
		<SpacingInputGroup label="Padding">
			{paddingSideOptions.map((side) => (
				<CompactNumberInput
					key={side.property}
					ariaLabel={`${labelStart}Padding ${side.label}`}
					id={`${idPrefix}-${side.property}`}
					placeholder={side.label.toLowerCase()}
					value={getPaddingSideValue(intent, side.property)}
					min={-72}
					max={72}
					onChange={(value) => onChange(createPaddingSidePatch(intent, side.property, value))}
				/>
			))}
		</SpacingInputGroup>
	);
}

type MarginSideInputsProps = {
	idPrefix: string;
	intent: StyleIntent;
	labelPrefix?: string;
	onChange: (patch: Partial<StyleIntent>) => void;
};

function MarginSideInputs({ idPrefix, intent, labelPrefix, onChange }: MarginSideInputsProps) {
	const labelStart = labelPrefix ? `${labelPrefix} ` : "";

	return (
		<SpacingInputGroup label="Margin">
			{marginSideOptions.map((side) => (
				<CompactNumberInput
					key={side.property}
					ariaLabel={`${labelStart}Margin ${side.label}`}
					id={`${idPrefix}-${side.property}`}
					placeholder={side.label.toLowerCase()}
					value={intent[side.property]}
					min={-72}
					max={72}
					onChange={(value) => onChange(createMarginSidePatch(side.property, value))}
				/>
			))}
		</SpacingInputGroup>
	);
}

type SpacingInputGroupProps = {
	label: string;
	children: ReactNode;
};

function SpacingInputGroup({ label, children }: SpacingInputGroupProps) {
	return (
		<div className="flex min-w-0 items-center gap-4">
			<div className="w-20 shrink-0 font-medium text-muted-foreground text-xs">{label}</div>
			<div className="flex min-w-0 flex-1 flex-wrap gap-2">{children}</div>
		</div>
	);
}

type CompactNumberInputProps = {
	ariaLabel: string;
	id: string;
	placeholder: string;
	value: number | undefined;
	min: number;
	max: number;
	step?: number;
	onChange: (value: number | undefined) => void;
};

function CompactNumberInput({
	ariaLabel,
	id,
	placeholder,
	value,
	min,
	max,
	step = 1,
	onChange,
}: CompactNumberInputProps) {
	return (
		<Input
			id={id}
			aria-label={ariaLabel}
			className={compactSpacingInputClassName}
			value={value ?? ""}
			placeholder={placeholder}
			type="number"
			min={min}
			max={max}
			step={step}
			onChange={(event) => {
				const value = event.target.value;
				onChange(value === "" ? undefined : Number(value));
			}}
		/>
	);
}

function getPaddingSideValue(intent: StyleIntent, property: PaddingSideProperty) {
	return intent[property] ?? intent.padding;
}

function createPaddingSidePatch(
	intent: StyleIntent,
	property: PaddingSideProperty,
	value: number | undefined,
): Partial<StyleIntent> {
	if (intent.padding === undefined) return { [property]: value };

	const patch: Partial<StyleIntent> = { padding: undefined };

	for (const side of paddingSideOptions) {
		patch[side.property] = intent[side.property] ?? intent.padding;
	}

	patch[property] = value;

	return patch;
}

function createMarginSidePatch(property: MarginSideProperty, value: number | undefined): Partial<StyleIntent> {
	return { [property]: value };
}

type RulePropertySummaryProps = {
	intent: StyleIntent;
};

function RulePropertySummary({ intent }: RulePropertySummaryProps) {
	const properties = [
		intent.color && { label: "Text", value: intent.color, color: intent.color },
		intent.backgroundColor && { label: "Background", value: intent.backgroundColor, color: intent.backgroundColor },
		intent.textDecorationColor && {
			label: "Decoration",
			value: intent.textDecorationColor,
			color: intent.textDecorationColor,
		},
		intent.borderColor && { label: "Border", value: intent.borderColor, color: intent.borderColor },
		intent.opacity !== undefined && { label: "Opacity", value: `${intent.opacity}` },
		intent.fontSize && { label: "Size", value: `${intent.fontSize}` },
		intent.fontWeight && { label: "Weight", value: intent.fontWeight },
		intent.fontStyle && { label: "Style", value: intent.fontStyle },
		intent.lineHeight !== undefined && { label: "Line", value: `${intent.lineHeight}` },
		intent.letterSpacing !== undefined && { label: "Tracking", value: `${intent.letterSpacing}` },
		intent.textDecoration && { label: "Decoration", value: intent.textDecoration },
		intent.textDecorationStyle && { label: "Decoration Style", value: intent.textDecorationStyle },
		intent.textAlign && { label: "Align", value: intent.textAlign },
		intent.textTransform && { label: "Transform", value: intent.textTransform },
		getPaddingSummary(intent) && { label: "Padding", value: getPaddingSummary(intent) },
		getMarginSummary(intent) && { label: "Margin", value: getMarginSummary(intent) },
		getGapSummary(intent) && { label: "Gap", value: getGapSummary(intent) },
		intent.borderStyle && { label: "Border Style", value: intent.borderStyle },
		intent.borderWidth !== undefined && { label: "Border Width", value: `${intent.borderWidth}` },
		intent.borderRadius !== undefined && { label: "Radius", value: `${intent.borderRadius}` },
	].filter(Boolean) as { label: string; value: string; color?: string }[];

	if (properties.length === 0) return null;

	return (
		<div className="flex flex-wrap gap-1.5 text-muted-foreground text-xs">
			{properties.map((property) => (
				<span
					key={`${property.label}-${property.value}`}
					className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-1.5 py-0.5"
				>
					{property.color && (
						<span
							className="size-2.5 shrink-0 rounded-full border border-foreground/20"
							style={{ backgroundColor: property.color }}
						/>
					)}
					<span>{property.label}</span>
					<span className="max-w-32 truncate font-mono">{property.value}</span>
				</span>
			))}
		</div>
	);
}

function getPaddingSummary(intent: StyleIntent) {
	if (intent.padding !== undefined) return `All ${intent.padding}`;

	const sideValues = paddingSideOptions.flatMap((side) => {
		const value = intent[side.property];
		if (value === undefined) return [];

		return [`${side.label.at(0)} ${value}`];
	});

	return sideValues.length > 0 ? sideValues.join(" / ") : undefined;
}

function getMarginSummary(intent: StyleIntent) {
	const sideValues = marginSideOptions.flatMap((side) => {
		const value = intent[side.property];
		if (value === undefined) return [];

		return [`${side.label.at(0)} ${value}`];
	});

	return sideValues.length > 0 ? sideValues.join(" / ") : undefined;
}

function getGapSummary(intent: StyleIntent) {
	const values = [
		intent.rowGap !== undefined && `Row ${intent.rowGap}`,
		intent.columnGap !== undefined && `Column ${intent.columnGap}`,
	].filter(Boolean);

	return values.length > 0 ? values.join(" / ") : undefined;
}

type CreateTargetParams = {
	targetScope: TargetScope;
	sectionType: string;
	sectionId: string;
};

function createTarget({ targetScope, sectionType, sectionId }: CreateTargetParams): StyleRuleTarget {
	if (targetScope === "sectionType") {
		return {
			scope: "sectionType",
			sectionType: sectionType as Extract<StyleRuleTarget, { scope: "sectionType" }>["sectionType"],
		};
	}
	if (targetScope === "sectionId") return { scope: "sectionId", sectionId };

	return { scope: "global" };
}

function getStyleRuleId(target: StyleRuleTarget, slot: StyleSlot) {
	if (target.scope === "global") return `style-global-${slot}`;
	if (target.scope === "sectionType") return `style-section-type-${target.sectionType}-${slot}`;

	return `style-section-id-${slugify(target.sectionId)}-${slot}`;
}

function getSlotLabel(slot: StyleSlot) {
	return styleSlotOptions.find((option) => option.value === slot)?.label ?? slot;
}

function getTargetLabel(data: ResumeData, target: StyleRuleTarget) {
	if (target.scope === "global") return "All sections";
	if (target.scope === "sectionType") return getSectionTitle(target.sectionType);

	return getSectionIdOptions(data).find((option) => option.value === target.sectionId)?.label ?? target.sectionId;
}

function getRuleFallbackLabel(data: ResumeData, rule: StyleRule) {
	const slots = getConfiguredSlots(rule);
	const slot = slots[0];
	return `${getTargetLabel(data, rule.target)}${slot ? `: ${getSlotLabel(slot)}` : ""}`;
}

function getConfiguredSlots(rule: StyleRule): StyleSlot[] {
	const slots: StyleSlot[] = [];

	for (const option of styleSlotOptions) {
		if (hasIntent(rule.slots[option.value])) slots.push(option.value);
	}

	return slots;
}

function getSectionIdOptions(data: ResumeData) {
	return [
		{ value: "summary", label: data.summary?.title || getSectionTitle("summary") },
		...Object.entries(data.sections).map(([section, value]) => ({
			value: section,
			label: value.title || getSectionTitle(section as keyof ResumeData["sections"]),
		})),
		...data.customSections.map((section) => ({
			value: section.id,
			label: section.title || getSectionTitle(section.type),
		})),
	];
}

function compactIntent(intent: Partial<StyleIntent>): StyleIntent {
	return Object.fromEntries(
		Object.entries(intent).filter(([, value]) => value !== undefined && value !== ""),
	) as StyleIntent;
}

function hasIntent(intent: StyleIntent | undefined) {
	return Boolean(intent && Object.keys(intent).length > 0);
}

function slugify(value: string) {
	return value
		.replace(/[^a-zA-Z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
		.toLowerCase();
}
