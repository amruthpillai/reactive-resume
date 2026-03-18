import { Combobox as ComboboxPrimitive, type ComboboxTriggerState, type UseRenderRenderProp } from "@base-ui/react";
import { t } from "@lingui/core/macro";
import { CaretDownIcon, CheckIcon, XIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { useControlledState } from "@/hooks/use-controlled-state";
import { cn } from "@/utils/style";

const ComboboxRoot = ComboboxPrimitive.Root;

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
	return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function ComboboxTrigger({ className, children, ...props }: ComboboxPrimitive.Trigger.Props) {
	return (
		<ComboboxPrimitive.Trigger
			data-slot="combobox-trigger"
			className={cn("shrink-0 [&_svg:not([class*='size-'])]:size-4", className)}
			{...props}
		>
			{children}
			<CaretDownIcon className="pointer-events-none size-4 text-muted-foreground" />
		</ComboboxPrimitive.Trigger>
	);
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
	return (
		<ComboboxPrimitive.Clear
			data-slot="combobox-clear"
			className={cn(className)}
			{...props}
			render={
				<InputGroupButton variant="ghost" size="icon-xs">
					<XIcon className="pointer-events-none" />
				</InputGroupButton>
			}
		/>
	);
}

function ComboboxInput({
	className,
	children,
	disabled = false,
	showTrigger = true,
	showClear = false,
	...props
}: ComboboxPrimitive.Input.Props & {
	showTrigger?: boolean;
	showClear?: boolean;
}) {
	return (
		<InputGroup className={cn("w-auto", className)}>
			<ComboboxPrimitive.Input render={<InputGroupInput disabled={disabled} />} {...props} />
			<InputGroupAddon align="inline-end">
				{showTrigger && (
					<InputGroupButton
						size="icon-xs"
						variant="ghost"
						render={<ComboboxTrigger />}
						data-slot="input-group-button"
						className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
						disabled={disabled}
					/>
				)}
				{showClear && <ComboboxClear disabled={disabled} />}
			</InputGroupAddon>
			{children}
		</InputGroup>
	);
}

function ComboboxContent({
	className,
	side = "bottom",
	sideOffset = 6,
	align = "start",
	alignOffset = 0,
	anchor,
	...props
}: ComboboxPrimitive.Popup.Props &
	Pick<ComboboxPrimitive.Positioner.Props, "side" | "align" | "sideOffset" | "alignOffset" | "anchor">) {
	return (
		<ComboboxPrimitive.Portal>
			<ComboboxPrimitive.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				anchor={anchor}
				className="isolate z-50"
			>
				<ComboboxPrimitive.Popup
					data-slot="combobox-content"
					data-chips={!!anchor}
					className={cn(
						"group/combobox-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-60 origin-(--transform-origin) overflow-hidden rounded-md bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[chips=true]:min-w-(--anchor-width) data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:border-input/30 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:shadow-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
						className,
					)}
					{...props}
				/>
			</ComboboxPrimitive.Positioner>
		</ComboboxPrimitive.Portal>
	);
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
	return (
		<ComboboxPrimitive.List
			data-slot="combobox-list"
			className={cn(
				"no-scrollbar max-h-80 scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0",
				className,
			)}
			{...props}
		/>
	);
}

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
	return (
		<ComboboxPrimitive.Item
			data-slot="combobox-item"
			className={cn(
				"relative flex w-full cursor-default items-center gap-2 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		>
			{children}
			<ComboboxPrimitive.ItemIndicator
				render={
					<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
						<CheckIcon className="pointer-events-none" />
					</span>
				}
			/>
		</ComboboxPrimitive.Item>
	);
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
	return <ComboboxPrimitive.Group data-slot="combobox-group" className={cn(className)} {...props} />;
}

function ComboboxLabel({ className, ...props }: ComboboxPrimitive.GroupLabel.Props) {
	return (
		<ComboboxPrimitive.GroupLabel
			data-slot="combobox-label"
			className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)}
			{...props}
		/>
	);
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
	return <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />;
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
	return (
		<ComboboxPrimitive.Empty
			data-slot="combobox-empty"
			className={cn(
				"hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex",
				className,
			)}
			{...props}
		/>
	);
}

function ComboboxSeparator({ className, ...props }: ComboboxPrimitive.Separator.Props) {
	return (
		<ComboboxPrimitive.Separator
			data-slot="combobox-separator"
			className={cn("-mx-1 my-1 h-px bg-border", className)}
			{...props}
		/>
	);
}

function ComboboxChips({
	className,
	...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> & ComboboxPrimitive.Chips.Props) {
	return (
		<ComboboxPrimitive.Chips
			data-slot="combobox-chips"
			className={cn(
				"flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-input bg-transparent bg-clip-padding px-2.5 py-1 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-2 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40",
				className,
			)}
			{...props}
		/>
	);
}

function ComboboxChip({
	className,
	children,
	showRemove = true,
	...props
}: ComboboxPrimitive.Chip.Props & {
	showRemove?: boolean;
}) {
	return (
		<ComboboxPrimitive.Chip
			data-slot="combobox-chip"
			className={cn(
				"flex h-6 w-fit items-center justify-center gap-1 rounded-md bg-muted px-1.5 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0",
				className,
			)}
			{...props}
		>
			{children}
			{showRemove && (
				<ComboboxPrimitive.ChipRemove
					className="-ml-1 opacity-50 hover:opacity-100"
					data-slot="combobox-chip-remove"
					render={
						<Button variant="ghost" size="icon-xs">
							<XIcon className="pointer-events-none" />
						</Button>
					}
				/>
			)}
		</ComboboxPrimitive.Chip>
	);
}

function ComboboxChipsInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
	return (
		<ComboboxPrimitive.Input
			data-slot="combobox-chip-input"
			className={cn("min-w-16 flex-1 outline-none", className)}
			{...props}
		/>
	);
}

function useComboboxAnchor() {
	return React.useRef<HTMLDivElement | null>(null);
}

type ComboboxOption<TValue extends string | number = string> = {
	value: TValue;
	label: React.ReactNode;
	keywords?: string[];
	disabled?: boolean;
};

type SingleComboboxProps<TValue extends string | number = string> = {
	options: ComboboxOption<TValue>[];
	value?: TValue | null;
	defaultValue?: TValue | null;
	onValueChange?: (value: TValue | null) => void;
	multiple?: false;
	disabled?: boolean;
	showClear?: boolean;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyMessage?: React.ReactNode;
	className?: string;
	id?: string;
	name?: string;
	render?: UseRenderRenderProp<ComboboxTriggerState>;
};

type MultiComboboxProps<TValue extends string | number = string> = {
	options: ComboboxOption<TValue>[];
	value?: TValue[] | null;
	defaultValue?: TValue[] | null;
	onValueChange?: (value: TValue[] | null) => void;
	multiple: true;
	disabled?: boolean;
	showClear?: boolean;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyMessage?: React.ReactNode;
	className?: string;
	id?: string;
	name?: string;
	render?: UseRenderRenderProp<ComboboxTriggerState>;
};

type ComboboxProps<TValue extends string | number = string> = SingleComboboxProps<TValue> | MultiComboboxProps<TValue>;

function Combobox<TValue extends string | number = string>(props: ComboboxProps<TValue>) {
	const {
		options,
		multiple = false,
		disabled = false,
		showClear = false,
		placeholder,
		searchPlaceholder,
		emptyMessage,
		className,
		id,
		name,
		render,
	} = props;

	const { contains } = ComboboxPrimitive.useFilter();

	const optionMap = React.useMemo(() => new Map(options.map((opt) => [String(opt.value), opt])), [options]);

	const findOption = React.useCallback(
		(v: TValue | TValue[] | null | undefined) => {
			if (multiple) {
				if (!v || !Array.isArray(v)) return [];
				return (v as TValue[])
					.map((item) => optionMap.get(String(item)) ?? null)
					.filter(Boolean) as ComboboxOption<TValue>[];
			} else {
				if (v == null) return null;
				return optionMap.get(String(v)) ?? null;
			}
		},
		[optionMap, multiple],
	);

	type OptionValue = ComboboxOption<TValue>[] | ComboboxOption<TValue> | null;

	const rawValueKey = props.value !== undefined ? JSON.stringify(props.value) : undefined;
	const resolvedValue = React.useMemo(
		() => (props.value !== undefined ? (findOption(props.value) as OptionValue) : undefined),
		// eslint-disable-next-line react-hooks/exhaustive-deps -- stable key avoids new-reference loops
		[rawValueKey, optionMap],
	);

	const rawDefaultKey = props.defaultValue !== undefined ? JSON.stringify(props.defaultValue) : undefined;
	const resolvedDefaultValue = React.useMemo(
		() => (props.defaultValue !== undefined ? (findOption(props.defaultValue) as OptionValue) : undefined),
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only needed on mount / options change
		[rawDefaultKey, optionMap],
	);

	const handleExternalChange = React.useCallback(
		(option: ComboboxOption<TValue>[] | ComboboxOption<TValue> | null) => {
			if (multiple) {
				const arrOpt = Array.isArray(option) ? option : option ? [option] : [];
				(props as MultiComboboxProps<TValue>).onValueChange?.(arrOpt.length > 0 ? arrOpt.map((opt) => opt.value) : []);
			} else {
				const value = option && !Array.isArray(option) ? (option as ComboboxOption<TValue>).value : null;
				const cb = props.onValueChange as ((value: TValue | null) => void) | undefined;
				cb?.(value ?? null);
			}
		},
		[props, multiple],
	);

	const [selectedValue, setSelectedValue] = useControlledState({
		value: resolvedValue,
		defaultValue: resolvedDefaultValue,
		onChange: handleExternalChange,
	});

	const itemToStringLabel = React.useCallback(
		(item: ComboboxOption<TValue>) => (typeof item.label === "string" ? item.label : String(item.value)),
		[],
	);

	const isItemEqualToValue = React.useCallback(
		(a: ComboboxOption<TValue>, b: ComboboxOption<TValue>) => String(a.value) === String(b.value),
		[],
	);

	const filter = React.useCallback(
		(item: ComboboxOption<TValue>, query: string) => {
			const labelStr = typeof item.label === "string" ? item.label : String(item.value);
			if (contains(labelStr, query)) return true;
			return item.keywords?.some((kw) => contains(kw, query)) ?? false;
		},
		[contains],
	);

	const listContent = (item: ComboboxOption<TValue>) => (
		<ComboboxItem key={String(item.value)} value={item} disabled={item.disabled}>
			{item.label}
		</ComboboxItem>
	);

	return (
		<ComboboxRoot
			name={name}
			items={options}
			filter={filter}
			disabled={disabled}
			value={selectedValue as ComboboxOption<TValue>[] & ComboboxOption<TValue>}
			onValueChange={setSelectedValue as (value: ComboboxOption<TValue>[] | ComboboxOption<TValue> | null) => void}
			itemToStringLabel={itemToStringLabel}
			isItemEqualToValue={isItemEqualToValue}
			{...(multiple ? { multiple: true } : {})}
		>
			<ComboboxTrigger
				id={id}
				disabled={disabled}
				render={
					render ?? (
						<Button
							variant="outline"
							className={cn("justify-start text-left font-normal hover:bg-muted/20", className)}
						/>
					)
				}
			>
				<span className="min-w-0 flex-1 truncate text-left">
					<ComboboxValue placeholder={placeholder ?? t`Select...`} />
				</span>

				{showClear && <ComboboxClear disabled={disabled} />}
			</ComboboxTrigger>

			<ComboboxContent>
				<ComboboxPrimitive.Input
					placeholder={searchPlaceholder ?? placeholder ?? t`Search...`}
					render={<Input disabled={disabled} className="rounded-b-none focus-visible:ring-0" />}
				/>
				<ComboboxEmpty>{emptyMessage ?? t`No results found.`}</ComboboxEmpty>
				<ComboboxList>{listContent}</ComboboxList>
			</ComboboxContent>
		</ComboboxRoot>
	);
}

export {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
	type ComboboxOption,
	type ComboboxProps,
	ComboboxRoot,
	ComboboxSeparator,
	ComboboxTrigger,
	ComboboxValue,
	type MultiComboboxProps,
	type SingleComboboxProps,
	useComboboxAnchor,
};
