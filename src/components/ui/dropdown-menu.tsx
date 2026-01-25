import { CaretRightIcon, CheckIcon, CircleIcon } from "@phosphor-icons/react";
import {
	DropdownMenuCheckboxItem as DropdownMenuCheckboxItemPrimitive,
	type DropdownMenuCheckboxItemProps as DropdownMenuCheckboxItemPrimitiveProps,
	DropdownMenuContent as DropdownMenuContentPrimitive,
	type DropdownMenuContentProps as DropdownMenuContentPrimitiveProps,
	DropdownMenuGroup as DropdownMenuGroupPrimitive,
	type DropdownMenuGroupProps as DropdownMenuGroupPrimitiveProps,
	DropdownMenuItemIndicator as DropdownMenuItemIndicatorPrimitive,
	DropdownMenuItem as DropdownMenuItemPrimitive,
	type DropdownMenuItemProps as DropdownMenuItemPrimitiveProps,
	DropdownMenuLabel as DropdownMenuLabelPrimitive,
	type DropdownMenuLabelProps as DropdownMenuLabelPrimitiveProps,
	DropdownMenu as DropdownMenuPrimitive,
	type DropdownMenuProps as DropdownMenuPrimitiveProps,
	DropdownMenuRadioGroup as DropdownMenuRadioGroupPrimitive,
	type DropdownMenuRadioGroupProps as DropdownMenuRadioGroupPrimitiveProps,
	DropdownMenuRadioItem as DropdownMenuRadioItemPrimitive,
	type DropdownMenuRadioItemProps as DropdownMenuRadioItemPrimitiveProps,
	DropdownMenuSeparator as DropdownMenuSeparatorPrimitive,
	type DropdownMenuSeparatorProps as DropdownMenuSeparatorPrimitiveProps,
	DropdownMenuShortcut as DropdownMenuShortcutPrimitive,
	type DropdownMenuShortcutProps as DropdownMenuShortcutPrimitiveProps,
	DropdownMenuSubContent as DropdownMenuSubContentPrimitive,
	type DropdownMenuSubContentProps as DropdownMenuSubContentPrimitiveProps,
	DropdownMenuSub as DropdownMenuSubPrimitive,
	type DropdownMenuSubProps as DropdownMenuSubPrimitiveProps,
	DropdownMenuSubTrigger as DropdownMenuSubTriggerPrimitive,
	type DropdownMenuSubTriggerProps as DropdownMenuSubTriggerPrimitiveProps,
	DropdownMenuTrigger as DropdownMenuTriggerPrimitive,
	type DropdownMenuTriggerProps as DropdownMenuTriggerPrimitiveProps,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/utils/style";

type DropdownMenuProps = DropdownMenuPrimitiveProps;

function DropdownMenu(props: DropdownMenuProps) {
	return <DropdownMenuPrimitive {...props} />;
}

type DropdownMenuTriggerProps = DropdownMenuTriggerPrimitiveProps;

function DropdownMenuTrigger(props: DropdownMenuTriggerProps) {
	return <DropdownMenuTriggerPrimitive {...props} />;
}

type DropdownMenuContentProps = DropdownMenuContentPrimitiveProps;

function DropdownMenuContent({ sideOffset = 4, className, children, ...props }: DropdownMenuContentProps) {
	return (
		<DropdownMenuContentPrimitive
			sideOffset={sideOffset}
			className={cn(
				"z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none",
				className,
			)}
			{...props}
		>
			{children}
		</DropdownMenuContentPrimitive>
	);
}

type DropdownMenuGroupProps = DropdownMenuGroupPrimitiveProps;

function DropdownMenuGroup({ ...props }: DropdownMenuGroupProps) {
	return <DropdownMenuGroupPrimitive {...props} />;
}

type DropdownMenuItemProps = DropdownMenuItemPrimitiveProps & {
	inset?: boolean;
	variant?: "default" | "destructive";
};

function DropdownMenuItem({ className, inset, variant = "default", disabled, ...props }: DropdownMenuItemProps) {
	return (
		<DropdownMenuItemPrimitive
			disabled={disabled}
			data-inset={inset}
			data-variant={variant}
			className={cn(
				"relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden data-[disabled=true]:pointer-events-none data-inset:ps-8 data-[variant=destructive]:text-destructive data-[disabled=true]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 data-[variant=destructive]:*:[svg]:text-destructive!",
				"data-[variant=destructive]:data-highlighted:bg-destructive/10 data-[variant=destructive]:data-highlighted:text-destructive data-highlighted:bg-accent data-highlighted:text-accent-foreground dark:data-[variant=destructive]:data-highlighted:bg-destructive/20",
				className,
			)}
			{...props}
		/>
	);
}

type DropdownMenuCheckboxItemProps = DropdownMenuCheckboxItemPrimitiveProps;

function DropdownMenuCheckboxItem({ className, children, checked, disabled, ...props }: DropdownMenuCheckboxItemProps) {
	return (
		<DropdownMenuCheckboxItemPrimitive
			disabled={disabled}
			className={cn(
				"relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 ps-8 pe-2 text-sm outline-hidden data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				"data-highlighted:bg-accent data-highlighted:text-accent-foreground",
				className,
			)}
			checked={checked}
			{...props}
		>
			<span className="pointer-events-none absolute start-2 flex size-3.5 items-center justify-center">
				<DropdownMenuItemIndicatorPrimitive initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
					<CheckIcon className="size-4" />
				</DropdownMenuItemIndicatorPrimitive>
			</span>
			{children}
		</DropdownMenuCheckboxItemPrimitive>
	);
}

type DropdownMenuRadioGroupProps = DropdownMenuRadioGroupPrimitiveProps;

function DropdownMenuRadioGroup(props: DropdownMenuRadioGroupProps) {
	return <DropdownMenuRadioGroupPrimitive {...props} />;
}

type DropdownMenuRadioItemProps = DropdownMenuRadioItemPrimitiveProps;

function DropdownMenuRadioItem({ className, children, disabled, ...props }: DropdownMenuRadioItemProps) {
	return (
		<DropdownMenuRadioItemPrimitive
			disabled={disabled}
			className={cn(
				"relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 ps-8 pe-2 text-sm outline-hidden data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				"data-highlighted:bg-accent data-highlighted:text-accent-foreground",
				className,
			)}
			{...props}
		>
			<span className="pointer-events-none absolute start-2 flex size-3.5 items-center justify-center">
				<DropdownMenuItemIndicatorPrimitive layoutId="dropdown-menu-item-indicator-radio">
					<CircleIcon className="size-2 fill-current" />
				</DropdownMenuItemIndicatorPrimitive>
			</span>
			{children}
		</DropdownMenuRadioItemPrimitive>
	);
}

type DropdownMenuLabelProps = DropdownMenuLabelPrimitiveProps & {
	inset?: boolean;
};

function DropdownMenuLabel({ className, inset, ...props }: DropdownMenuLabelProps) {
	return (
		<DropdownMenuLabelPrimitive
			data-inset={inset}
			className={cn("px-2 py-1.5 font-medium text-sm data-inset:ps-8", className)}
			{...props}
		/>
	);
}

type DropdownMenuSeparatorProps = DropdownMenuSeparatorPrimitiveProps;

function DropdownMenuSeparator({ className, ...props }: DropdownMenuSeparatorProps) {
	return <DropdownMenuSeparatorPrimitive className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

type DropdownMenuShortcutProps = DropdownMenuShortcutPrimitiveProps;

function DropdownMenuShortcut({ className, ...props }: DropdownMenuShortcutProps) {
	return (
		<DropdownMenuShortcutPrimitive
			className={cn("ml-auto text-muted-foreground text-xs tracking-widest", className)}
			{...props}
		/>
	);
}

type DropdownMenuSubProps = DropdownMenuSubPrimitiveProps;

function DropdownMenuSub(props: DropdownMenuSubProps) {
	return <DropdownMenuSubPrimitive {...props} />;
}

type DropdownMenuSubTriggerProps = DropdownMenuSubTriggerPrimitiveProps & {
	inset?: boolean;
};

function DropdownMenuSubTrigger({ disabled, className, inset, children, ...props }: DropdownMenuSubTriggerProps) {
	return (
		<DropdownMenuSubTriggerPrimitive
			disabled={disabled}
			data-inset={inset}
			className={cn(
				"flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden data-inset:ps-8 data-[state=open]:text-accent-foreground",
				"data-[state=open]:**:data-[slot=chevron]:rotate-90 **:data-[slot=chevron]:transition-transform **:data-[slot=chevron]:duration-300 **:data-[slot=chevron]:ease-in-out",
				"data-highlighted:bg-accent data-highlighted:text-accent-foreground",
				className,
			)}
			{...props}
		>
			{children}
			<CaretRightIcon data-slot="chevron" className="ml-auto size-4" />
		</DropdownMenuSubTriggerPrimitive>
	);
}

type DropdownMenuSubContentProps = DropdownMenuSubContentPrimitiveProps;

function DropdownMenuSubContent({ className, ...props }: DropdownMenuSubContentProps) {
	return (
		<DropdownMenuSubContentPrimitive
			className={cn(
				"z-50 min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
				className,
			)}
			{...props}
		/>
	);
}

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
	type DropdownMenuProps,
	type DropdownMenuTriggerProps,
	type DropdownMenuContentProps,
	type DropdownMenuGroupProps,
	type DropdownMenuItemProps,
	type DropdownMenuCheckboxItemProps,
	type DropdownMenuRadioGroupProps,
	type DropdownMenuRadioItemProps,
	type DropdownMenuLabelProps,
	type DropdownMenuSeparatorProps,
	type DropdownMenuShortcutProps,
	type DropdownMenuSubProps,
	type DropdownMenuSubTriggerProps,
	type DropdownMenuSubContentProps,
};
