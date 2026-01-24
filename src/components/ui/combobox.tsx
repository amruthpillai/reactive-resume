import { t } from "@lingui/core/macro";
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useControlledState } from "@/hooks/use-controlled-state";
import { cn } from "@/utils/style";

type ComboboxOption<TValue extends string | number = string> = {
	value: TValue;
	label: React.ReactNode;
	keywords?: string[];
	disabled?: boolean;
};

type ComboboxProps<TValue extends string | number = string> = Omit<
	React.ComponentProps<typeof PopoverContent>,
	"value" | "defaultValue" | "children"
> & {
	disabled?: boolean;
	clearable?: boolean;
	options: ReadonlyArray<ComboboxOption<TValue>>;
	value?: TValue | null;
	defaultValue?: TValue | null;
	placeholder?: React.ReactNode;
	searchPlaceholder?: string;
	emptyMessage?: React.ReactNode;
	buttonProps?: Omit<React.ComponentProps<typeof Button>, "children"> & {
		children?: (value: TValue | null, option: ComboboxOption<TValue> | null) => React.ReactNode;
	};
	onValueChange?: (value: TValue | null, option: ComboboxOption<TValue> | null) => void;
};

function Combobox<TValue extends string | number = string>({
	disabled = false,
	clearable = true,
	options,
	value,
	defaultValue = null,
	placeholder = t`Select...`,
	searchPlaceholder = t`Search...`,
	emptyMessage = t`No results found.`,
	className,
	buttonProps,
	onValueChange,
	...props
}: ComboboxProps<TValue>) {
	const { className: buttonClassName, children: buttonChildren, ...buttonRestProps } = buttonProps ?? {};
	const [open, setOpen] = React.useState(false);

	const [selectedValue, setSelectedValue] = useControlledState<TValue | null>({
		value,
		defaultValue,
		onChange: (next) => onValueChange?.(next, options.find((o) => o.value === next) ?? null),
	});

	const selectedOption = React.useMemo(() => {
		return options.find((option) => option.value === selectedValue) ?? null;
	}, [options, selectedValue]);

	const selectedLabel = selectedOption?.label;

	const onSelect = React.useCallback(
		(current: string) => {
			const next = (current as unknown as TValue) ?? null;

			if (!clearable && selectedValue === next) {
				setOpen(false);
				return;
			}

			const toggled = selectedValue === next ? null : next;
			setSelectedValue(toggled);
			setOpen(false);
		},
		[clearable, selectedValue, setSelectedValue],
	);

	// Prevent opening popover and handling interaction if disabled
	const handleOpenChange = React.useCallback(
		(nextOpen: boolean) => {
			if (disabled) return;
			setOpen(nextOpen);
		},
		[disabled],
	);

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					role="combobox"
					variant="outline"
					aria-expanded={open}
					disabled={disabled}
					aria-disabled={disabled}
					tapScale={1}
					className={cn(
						"font-normal active:scale-100",
						typeof buttonChildren === "function" ? "" : "justify-between",
						disabled && "pointer-events-none opacity-60",
						buttonClassName,
					)}
					{...buttonRestProps}
				>
					{typeof buttonChildren === "function" ? (
						buttonChildren(selectedValue, selectedOption)
					) : (
						<>
							{selectedLabel ?? placeholder}
							<CaretUpDownIcon className="ml-2 shrink-0 opacity-50" />
						</>
					)}
				</Button>
			</PopoverTrigger>

			<PopoverContent
				align="start"
				aria-disabled={disabled}
				tabIndex={disabled ? -1 : undefined}
				className={cn("min-w-[200px] p-0", className, disabled && "pointer-events-none select-none opacity-60")}
				{...props}
			>
				<Command>
					<CommandInput placeholder={searchPlaceholder} disabled={disabled} />
					<CommandList>
						<CommandEmpty>{emptyMessage}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => {
								const isSelected = selectedValue === option.value;
								const isDisabled = option.disabled ?? (false || disabled);

								return (
									<CommandItem
										key={String(option.value)}
										value={String(option.value)}
										keywords={option.keywords}
										disabled={isDisabled}
										onSelect={isDisabled ? undefined : onSelect}
										aria-disabled={isDisabled}
										className={cn(isDisabled && "pointer-events-none opacity-60")}
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
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export type { ComboboxOption, ComboboxProps };

export { Combobox };
