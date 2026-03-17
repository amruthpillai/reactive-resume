import { CaretRightIcon, CheckIcon, CircleIcon } from "@phosphor-icons/react";
import type * as React from "react";
import {
	MenuArrow as MenuArrowPrimitive,
	type MenuArrowProps as MenuArrowPrimitiveProps,
	MenuCheckboxItemIndicator as MenuCheckboxItemIndicatorPrimitive,
	MenuCheckboxItem as MenuCheckboxItemPrimitive,
	type MenuCheckboxItemProps as MenuCheckboxItemPrimitiveProps,
	MenuGroupLabel as MenuGroupLabelPrimitive,
	type MenuGroupLabelProps as MenuGroupLabelPrimitiveProps,
	MenuGroup as MenuGroupPrimitive,
	type MenuGroupProps as MenuGroupPrimitiveProps,
	MenuItem as MenuItemPrimitive,
	type MenuItemProps as MenuItemPrimitiveProps,
	MenuPopup as MenuPopupPrimitive,
	type MenuPopupProps as MenuPopupPrimitiveProps,
	MenuPortal as MenuPortalPrimitive,
	type MenuPortalProps as MenuPortalPrimitiveProps,
	MenuPositioner as MenuPositionerPrimitive,
	type MenuPositionerProps as MenuPositionerPrimitiveProps,
	Menu as MenuPrimitive,
	type MenuProps as MenuPrimitiveProps,
	MenuRadioGroup as MenuRadioGroupPrimitive,
	type MenuRadioGroupProps as MenuRadioGroupPrimitiveProps,
	MenuRadioItemIndicator as MenuRadioItemIndicatorPrimitive,
	MenuRadioItem as MenuRadioItemPrimitive,
	type MenuRadioItemProps as MenuRadioItemPrimitiveProps,
	MenuSeparator as MenuSeparatorPrimitive,
	type MenuSeparatorProps as MenuSeparatorPrimitiveProps,
	MenuShortcut as MenuShortcutPrimitive,
	type MenuShortcutProps as MenuShortcutPrimitiveProps,
	MenuSubmenu as MenuSubmenuPrimitive,
	type MenuSubmenuProps as MenuSubmenuPrimitiveProps,
	MenuSubmenuTrigger as MenuSubmenuTriggerPrimitive,
	type MenuSubmenuTriggerProps as MenuSubmenuTriggerPrimitiveProps,
	MenuTrigger as MenuTriggerPrimitive,
	type MenuTriggerProps as MenuTriggerPrimitiveProps,
} from "@/components/primitives/menu";
import { cn } from "@/utils/style";

type MenuProps = MenuPrimitiveProps;

function Menu(props: MenuProps) {
	return <MenuPrimitive {...props} />;
}

type MenuTriggerProps = MenuTriggerPrimitiveProps;

function MenuTrigger(props: MenuTriggerProps) {
	return <MenuTriggerPrimitive {...props} />;
}

type MenuPortalProps = MenuPortalPrimitiveProps;

function MenuPortal(props: MenuPortalProps) {
	return <MenuPortalPrimitive {...props} />;
}

type MenuPanelProps = MenuPopupPrimitiveProps & MenuPositionerPrimitiveProps;

function MenuPanel({
	className,
	finalFocus,
	id,
	children,
	sideOffset = 4,
	transition = { duration: 0.2 },
	...props
}: MenuPanelProps) {
	return (
		<MenuPortal>
			<MenuPositionerPrimitive className="z-50" sideOffset={sideOffset} {...props}>
				<MenuPopupPrimitive
					finalFocus={finalFocus}
					transition={transition}
					id={id}
					className={cn(
						"max-h-(--available-height) min-w-32 origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none",
						className,
					)}
				>
					{children}
				</MenuPopupPrimitive>
			</MenuPositionerPrimitive>
		</MenuPortal>
	);
}

type MenuGroupProps = MenuGroupPrimitiveProps;

function MenuGroup(props: MenuGroupProps) {
	return <MenuGroupPrimitive {...props} />;
}

type MenuGroupLabelProps = MenuGroupLabelPrimitiveProps & {
	inset?: boolean;
};

function MenuGroupLabel({ className, inset, ...props }: MenuGroupLabelProps) {
	return (
		<MenuGroupLabelPrimitive
			data-inset={inset}
			className={cn("px-2 py-1.5 font-medium text-sm data-inset:pl-8", className)}
			{...props}
		/>
	);
}

type MenuItemProps = MenuItemPrimitiveProps & {
	inset?: boolean;
	variant?: "default" | "destructive";
};

function MenuItem({ className, inset, variant = "default", disabled, ...props }: MenuItemProps) {
	return (
		<MenuItemPrimitive
			disabled={disabled}
			data-inset={inset}
			data-variant={variant}
			className={cn(
				"relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden focus:text-accent-foreground data-[disabled=true]:pointer-events-none data-inset:pl-8 data-[variant=destructive]:text-destructive data-[disabled=true]:opacity-50 data-[variant=destructive]:focus:text-destructive [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 data-[variant=destructive]:*:[svg]:text-destructive!",
				className,
			)}
			{...props}
		/>
	);
}

type MenuCheckboxItemProps = MenuCheckboxItemPrimitiveProps;

function MenuCheckboxItem({ className, children, checked, disabled, ...props }: MenuCheckboxItemProps) {
	return (
		<MenuCheckboxItemPrimitive
			disabled={disabled}
			className={cn(
				"relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden focus:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			checked={checked}
			{...props}
		>
			<span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
				<MenuCheckboxItemIndicatorPrimitive initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
					<CheckIcon className="size-4" />
				</MenuCheckboxItemIndicatorPrimitive>
			</span>
			{children}
		</MenuCheckboxItemPrimitive>
	);
}

type MenuRadioGroupProps = MenuRadioGroupPrimitiveProps;

function MenuRadioGroup(props: MenuRadioGroupProps) {
	return <MenuRadioGroupPrimitive {...props} />;
}

type MenuRadioItemProps = MenuRadioItemPrimitiveProps;

function MenuRadioItem({ className, children, disabled, ...props }: MenuRadioItemProps) {
	return (
		<MenuRadioItemPrimitive
			disabled={disabled}
			className={cn(
				"relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden focus:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			{...props}
		>
			<span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
				<MenuRadioItemIndicatorPrimitive layoutId="dropdown-menu-item-indicator-radio">
					<CircleIcon className="size-2 fill-current" />
				</MenuRadioItemIndicatorPrimitive>
			</span>
			{children}
		</MenuRadioItemPrimitive>
	);
}

type MenuSeparatorProps = MenuSeparatorPrimitiveProps;

function MenuSeparator({ className, ...props }: MenuSeparatorProps) {
	return <MenuSeparatorPrimitive className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

type MenuShortcutProps = MenuShortcutPrimitiveProps;

function MenuShortcut({ className, ...props }: MenuShortcutProps) {
	return (
		<MenuShortcutPrimitive
			className={cn("ml-auto text-muted-foreground text-xs tracking-widest", className)}
			{...props}
		/>
	);
}

type MenuArrowProps = MenuArrowPrimitiveProps;

function MenuArrow(props: MenuArrowProps) {
	return <MenuArrowPrimitive {...props} />;
}

type MenuSubmenuProps = MenuSubmenuPrimitiveProps;

function MenuSubmenu(props: MenuSubmenuProps) {
	return <MenuSubmenuPrimitive {...props} />;
}

type MenuSubmenuTriggerProps = MenuSubmenuTriggerPrimitiveProps & {
	inset?: boolean;
	children?: React.ReactNode;
};

function MenuSubmenuTrigger({ disabled, className, inset, children, ...props }: MenuSubmenuTriggerProps) {
	return (
		<MenuSubmenuTriggerPrimitive
			disabled={disabled}
			data-inset={inset}
			className={cn(
				"flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden focus:text-accent-foreground data-inset:pl-8 data-[state=open]:text-accent-foreground",
				"**:data-[slot=chevron]:transition-transform **:data-[slot=chevron]:duration-300 **:data-[slot=chevron]:ease-in-out aria-expanded:**:data-[slot=chevron]:rotate-90",
				className,
			)}
			{...props}
		>
			{children}
			<CaretRightIcon data-slot="chevron" className="ml-auto size-4" />
		</MenuSubmenuTriggerPrimitive>
	);
}

type MenuSubmenuPanelProps = MenuPopupPrimitiveProps & MenuPositionerPrimitiveProps;

function MenuSubmenuPanel({
	className,
	finalFocus,
	id,
	children,
	sideOffset = 4,
	transition = { duration: 0.2 },
	...props
}: MenuSubmenuPanelProps) {
	return (
		<MenuPortal>
			<MenuPositionerPrimitive className="z-50" sideOffset={sideOffset} {...props}>
				<MenuPopupPrimitive
					finalFocus={finalFocus}
					transition={transition}
					id={id}
					className={cn(
						"max-h-(--available-height) min-w-32 origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
						className,
					)}
				>
					{children}
				</MenuPopupPrimitive>
			</MenuPositionerPrimitive>
		</MenuPortal>
	);
}

export {
	Menu,
	MenuArrow,
	type MenuArrowProps,
	MenuCheckboxItem,
	type MenuCheckboxItemProps,
	MenuGroup,
	MenuGroupLabel,
	type MenuGroupLabelProps,
	type MenuGroupProps,
	MenuItem,
	type MenuItemProps,
	MenuPanel,
	type MenuPanelProps,
	MenuPortal,
	type MenuPortalProps,
	type MenuProps,
	MenuRadioGroup,
	type MenuRadioGroupProps,
	MenuRadioItem,
	type MenuRadioItemProps,
	MenuSeparator,
	type MenuSeparatorProps,
	MenuShortcut,
	type MenuShortcutProps,
	MenuSubmenu,
	MenuSubmenuPanel,
	type MenuSubmenuPanelProps,
	type MenuSubmenuProps,
	MenuSubmenuTrigger,
	type MenuSubmenuTriggerProps,
	MenuTrigger,
	type MenuTriggerProps,
};
