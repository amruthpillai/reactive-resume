import { t } from "@lingui/core/macro";
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useControlledState } from "@/hooks/use-controlled-state";
import { cn } from "@/utils/style";

type MultipleComboboxOption<TValue extends string | number = string> = {
	value: TValue;
	label: React.ReactNode;
	keywords?: string[];
	disabled?: boolean;
};

type BasePopoverProps = Omit<React.ComponentProps<typeof PopoverContent>, "value" | "defaultValue" | "children">;

type MultipleComboboxProps<TValue extends string | number = string> = BasePopoverProps & {
	options: MultipleComboboxOption<TValue>[];
	value?: TValue[];
	defaultValue?: TValue[];
	placeholder?: React.ReactNode;
	searchPlaceholder?: string;
	emptyMessage?: React.ReactNode;
	clearLabel?: React.ReactNode;
	buttonProps?: Omit<React.ComponentProps<typeof Button>, "children"> & {
		children?: (values: TValue[], options: MultipleComboboxOption<TValue>[]) => React.ReactNode;
	};
	onValueChange?: (values: TValue[], options: MultipleComboboxOption<TValue>[]) => void;
	onOpenChange?: (open: boolean) => void;
	disableClear?: boolean;
};

const CLEAR_COMMAND_VALUE = "__command-clear-multi-select-combobox";

function MultipleCombobox<TValue extends string | number = string>({
	options,
	value,
	defaultValue,
	placeholder = t`Select...`,
	searchPlaceholder = t`Search...`,
	emptyMessage = t`No results found.`,
	clearLabel = t`Clear selection`,
	className,
	buttonProps,
	onValueChange,
	onOpenChange,
	disableClear = false,
	...popoverProps
}: MultipleComboboxProps<TValue>) {
	const [open, setOpen] = React.useState(false);

	const { children: buttonChildren, className: buttonClassName, ...buttonRest } = buttonProps ?? {};

	const resolvedDefaultValue = React.useMemo<TValue[]>(() => (defaultValue ? [...defaultValue] : []), [defaultValue]);

	const optionsByStringValue = React.useMemo(() => {
		return new Map(options.map((option) => [String(option.value), option]));
	}, [options]);

	const [selectedValues, setSelectedValues] = useControlledState<TValue[]>({
		value,
		defaultValue: resolvedDefaultValue,
		onChange: (next) =>
			onValueChange?.(
				next,
				next
					.map((item) => options.find((option) => option.value === item))
					.filter((option): option is MultipleComboboxOption<TValue> => Boolean(option)),
			),
	});

	const selectionSet = React.useMemo(() => new Set(selectedValues), [selectedValues]);

	const selectedOptions = React.useMemo(
		() => options.filter((option) => selectionSet.has(option.value)),
		[options, selectionSet],
	);

	const selectionCount = selectedOptions.length;
	const canClear = !disableClear && selectionCount > 0;

	const toggleOption = React.useCallback(
		(option: MultipleComboboxOption<TValue>) => {
			if (option.disabled) return;

			const isSelected = selectionSet.has(option.value);
			const nextValues = isSelected
				? selectedValues.filter((selected) => selected !== option.value)
				: [...selectedValues, option.value];

			setSelectedValues(nextValues);
		},
		[selectionSet, selectedValues, setSelectedValues],
	);

	const handleSelect = React.useCallback(
		(current: string) => {
			if (current === CLEAR_COMMAND_VALUE) {
				setSelectedValues([]);
				return;
			}

			const option = optionsByStringValue.get(current);
			if (!option) return;
			toggleOption(option);
		},
		[optionsByStringValue, toggleOption, setSelectedValues],
	);

	const handleOpenChange = React.useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen);
			onOpenChange?.(nextOpen);
		},
		[onOpenChange],
	);

	const buttonContent =
		typeof buttonChildren === "function" ? (
			buttonChildren(selectedValues, selectedOptions)
		) : (
			<>
				<span className="truncate">{selectionCount > 0 ? `${selectionCount} selected` : placeholder}</span>
				<CaretUpDownIcon aria-hidden className="ms-2 shrink-0 opacity-50" />
			</>
		);

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					role="combobox"
					variant="outline"
					aria-expanded={open}
					aria-label="Multi-select Combobox"
					className={cn("justify-between gap-2 font-normal active:scale-100", buttonClassName)}
					{...buttonRest}
				>
					{buttonContent}
				</Button>
			</PopoverTrigger>

			<PopoverContent
				align="start"
				role="listbox"
				className={cn("w-[260px] p-0", className)}
				aria-multiselectable="true"
				{...popoverProps}
			>
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyMessage}</CommandEmpty>

						<CommandGroup>
							{options.map((option) => {
								const stringValue = String(option.value);
								const isSelected = selectionSet.has(option.value);
								const isDisabled = option.disabled ?? false;

								return (
									<CommandItem
										key={stringValue}
										value={stringValue}
										keywords={option.keywords}
										onSelect={handleSelect}
										disabled={isDisabled}
										data-selected={isSelected ? "" : undefined}
										aria-selected={isSelected}
									>
										<CheckIcon
											aria-hidden
											className={cn("size-4 shrink-0 transition-opacity", isSelected ? "opacity-100" : "opacity-0")}
										/>
										<span className={cn("truncate", isDisabled && "opacity-60")}>{option.label}</span>
									</CommandItem>
								);
							})}
						</CommandGroup>

						{canClear ? (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										value={CLEAR_COMMAND_VALUE}
										onSelect={handleSelect}
										keywords={[]}
										data-selected={undefined}
										aria-selected="false"
									>
										{clearLabel}
									</CommandItem>
								</CommandGroup>
							</>
						) : null}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export type { MultipleComboboxOption, MultipleComboboxProps };

export { MultipleCombobox };
