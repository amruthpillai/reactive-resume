import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { AnimatePresence, type HTMLMotionProps, motion } from "motion/react";
import * as React from "react";
import { useControlledState } from "@/hooks/use-controlled-state";
import { useDataState } from "@/hooks/use-data-state";
import { getStrictContext } from "@/utils/get-strict-context";

type MenuActiveValueContextType = {
	highlightedValue: string | null;
	setHighlightedValue: (value: string | null) => void;
};

type MenuContextType = {
	isOpen: boolean;
	setIsOpen: MenuProps["onOpenChange"];
};

const [MenuActiveValueProvider, useMenuActiveValue] =
	getStrictContext<MenuActiveValueContextType>("MenuActiveValueContext");
const [MenuProvider, useMenu] = getStrictContext<MenuContextType>("MenuContext");

type MenuProps = React.ComponentProps<typeof MenuPrimitive.Root>;

function Menu(props: MenuProps) {
	const [isOpen, setIsOpen] = useControlledState({
		value: props?.open,
		defaultValue: props?.defaultOpen,
		onChange: props?.onOpenChange,
	});
	const [highlightedValue, setHighlightedValue] = React.useState<string | null>(null);

	return (
		<MenuActiveValueProvider value={{ highlightedValue, setHighlightedValue }}>
			<MenuProvider value={{ isOpen, setIsOpen }}>
				<MenuPrimitive.Root data-slot="menu" {...props} onOpenChange={setIsOpen} />
			</MenuProvider>
		</MenuActiveValueProvider>
	);
}

type MenuTriggerProps = React.ComponentProps<typeof MenuPrimitive.Trigger>;

function MenuTrigger(props: MenuTriggerProps) {
	return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />;
}

type MenuPortalProps = Omit<React.ComponentProps<typeof MenuPrimitive.Portal>, "keepMounted">;

function MenuPortal(props: MenuPortalProps) {
	const { isOpen } = useMenu();

	return (
		<AnimatePresence>
			{isOpen && <MenuPrimitive.Portal keepMounted data-slot="menu-portal" {...props} />}
		</AnimatePresence>
	);
}

type MenuGroupProps = React.ComponentProps<typeof MenuPrimitive.Group>;

function MenuGroup(props: MenuGroupProps) {
	return <MenuPrimitive.Group data-slot="menu-group" {...props} />;
}

type MenuGroupLabelProps = React.ComponentProps<typeof MenuPrimitive.GroupLabel>;

function MenuGroupLabel(props: MenuGroupLabelProps) {
	return <MenuPrimitive.GroupLabel data-slot="menu-group-label" {...props} />;
}

type MenuSubmenuProps = React.ComponentProps<typeof MenuPrimitive.SubmenuRoot>;

function MenuSubmenu(props: MenuSubmenuProps) {
	const [isOpen, setIsOpen] = useControlledState({
		value: props?.open,
		defaultValue: props?.defaultOpen,
		onChange: props?.onOpenChange,
	});

	return (
		<MenuProvider value={{ isOpen, setIsOpen }}>
			<MenuPrimitive.SubmenuRoot data-slot="menu-submenu" {...props} onOpenChange={setIsOpen} />
		</MenuProvider>
	);
}

type MenuSubmenuTriggerProps = Omit<React.ComponentProps<typeof MenuPrimitive.SubmenuTrigger>, "render"> &
	HTMLMotionProps<"div"> & {
		disabled?: boolean;
	};

function MenuSubmenuTrigger({ label, id, nativeButton, ...props }: MenuSubmenuTriggerProps) {
	const { setHighlightedValue } = useMenuActiveValue();
	const [, highlightedRef] = useDataState<HTMLDivElement>("highlighted", undefined, (value) => {
		if (value === true) {
			const el = highlightedRef.current;
			const v = el?.dataset.value || el?.id || null;
			if (v) setHighlightedValue(v);
		}
	});

	return (
		<MenuPrimitive.SubmenuTrigger
			ref={highlightedRef}
			label={label}
			id={id}
			nativeButton={nativeButton}
			data-slot="menu-submenu-trigger"
			{...props}
		/>
	);
}

type MenuPositionerProps = React.ComponentProps<typeof MenuPrimitive.Positioner>;

function MenuPositioner(props: MenuPositionerProps) {
	return <MenuPrimitive.Positioner data-slot="menu-positioner" {...props} />;
}

type MenuPopupProps = Omit<React.ComponentProps<typeof MenuPrimitive.Popup>, "render"> & HTMLMotionProps<"div">;

function MenuPopup({ finalFocus, id, transition = { duration: 0.2 }, style, ...props }: MenuPopupProps) {
	return (
		<MenuPrimitive.Popup
			finalFocus={finalFocus}
			id={id}
			render={
				<motion.div
					key="menu-popup"
					data-slot="menu-popup"
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.95 }}
					transition={transition}
					style={{ willChange: "opacity, transform", ...style }}
					{...props}
				/>
			}
		/>
	);
}

type MenuItemProps = Omit<React.ComponentProps<typeof MenuPrimitive.Item>, "render"> & HTMLMotionProps<"div">;

function MenuItem({ disabled, label, closeOnClick, nativeButton, id, ...props }: MenuItemProps) {
	const { setHighlightedValue } = useMenuActiveValue();
	const [, highlightedRef] = useDataState<HTMLDivElement>("highlighted", undefined, (value) => {
		if (value === true) {
			const el = highlightedRef.current;
			const v = el?.dataset.value || el?.id || null;
			if (v) setHighlightedValue(v);
		}
	});

	return (
		<MenuPrimitive.Item
			ref={highlightedRef}
			label={label}
			closeOnClick={closeOnClick}
			nativeButton={nativeButton}
			disabled={disabled}
			id={id}
			data-slot="menu-item"
			{...props}
		/>
	);
}

type MenuCheckboxItemProps = Omit<React.ComponentProps<typeof MenuPrimitive.CheckboxItem>, "render">;

function MenuCheckboxItem({
	label,
	defaultChecked,
	checked,
	onCheckedChange,
	disabled,
	closeOnClick,
	nativeButton,
	id,
	...props
}: MenuCheckboxItemProps) {
	const { setHighlightedValue } = useMenuActiveValue();
	const [, highlightedRef] = useDataState<HTMLDivElement>("highlighted", undefined, (value) => {
		if (value === true) {
			const el = highlightedRef.current;
			const v = el?.dataset.value || el?.id || null;
			if (v) setHighlightedValue(v);
		}
	});
	return (
		<MenuPrimitive.CheckboxItem
			ref={highlightedRef}
			label={label}
			checked={checked}
			defaultChecked={defaultChecked}
			onCheckedChange={onCheckedChange}
			disabled={disabled}
			closeOnClick={closeOnClick}
			nativeButton={nativeButton}
			id={id}
			data-slot="menu-checkbox-item"
			{...props}
		/>
	);
}

type MenuCheckboxItemIndicatorProps = Omit<React.ComponentProps<typeof MenuPrimitive.CheckboxItemIndicator>, "render"> &
	HTMLMotionProps<"div">;

function MenuCheckboxItemIndicator({ keepMounted, ...props }: MenuCheckboxItemIndicatorProps) {
	return (
		<MenuPrimitive.CheckboxItemIndicator
			data-slot="menu-checkbox-item-indicator"
			keepMounted={keepMounted}
			render={<motion.div data-slot="menu-checkbox-item-indicator" {...props} />}
		/>
	);
}

type MenuRadioGroupProps = React.ComponentProps<typeof MenuPrimitive.RadioGroup>;

function MenuRadioGroup(props: MenuRadioGroupProps) {
	return <MenuPrimitive.RadioGroup data-slot="menu-radio-group" {...props} />;
}

type MenuRadioItemProps = Omit<React.ComponentProps<typeof MenuPrimitive.RadioItem>, "render">;

function MenuRadioItem({ value, disabled, label, closeOnClick, nativeButton, id, ...props }: MenuRadioItemProps) {
	const { setHighlightedValue } = useMenuActiveValue();
	const [, highlightedRef] = useDataState<HTMLDivElement>("highlighted", undefined, (value) => {
		if (value === true) {
			const el = highlightedRef.current;
			const v = el?.dataset.value || el?.id || null;
			if (v) setHighlightedValue(v);
		}
	});
	return (
		<MenuPrimitive.RadioItem
			ref={highlightedRef}
			value={value}
			disabled={disabled}
			label={label}
			closeOnClick={closeOnClick}
			nativeButton={nativeButton}
			id={id}
			data-slot="menu-radio-item"
			{...props}
		/>
	);
}

type MenuRadioItemIndicatorProps = Omit<React.ComponentProps<typeof MenuPrimitive.RadioItemIndicator>, "render"> &
	HTMLMotionProps<"div">;

function MenuRadioItemIndicator({ keepMounted, ...props }: MenuRadioItemIndicatorProps) {
	return (
		<MenuPrimitive.RadioItemIndicator
			data-slot="menu-radio-item-indicator"
			keepMounted={keepMounted}
			render={<motion.div data-slot="menu-radio-item-indicator" {...props} />}
		/>
	);
}

type MenuShortcutProps = React.ComponentProps<"span">;

function MenuShortcut(props: MenuShortcutProps) {
	return <span data-slot="menu-shortcut" {...props} />;
}

type MenuArrowProps = React.ComponentProps<typeof MenuPrimitive.Arrow>;

function MenuArrow(props: MenuArrowProps) {
	return <MenuPrimitive.Arrow data-slot="menu-arrow" {...props} />;
}

type MenuSeparatorProps = React.ComponentProps<typeof MenuPrimitive.Separator>;

function MenuSeparator(props: MenuSeparatorProps) {
	return <MenuPrimitive.Separator data-slot="menu-separator" {...props} />;
}

export {
	Menu,
	type MenuActiveValueContextType,
	MenuArrow,
	type MenuArrowProps,
	MenuCheckboxItem,
	MenuCheckboxItemIndicator,
	type MenuCheckboxItemIndicatorProps,
	type MenuCheckboxItemProps,
	type MenuContextType,
	MenuGroup,
	MenuGroupLabel,
	type MenuGroupLabelProps,
	type MenuGroupProps,
	MenuItem,
	type MenuItemProps,
	MenuPopup,
	type MenuPopupProps,
	MenuPortal,
	type MenuPortalProps,
	MenuPositioner,
	type MenuPositionerProps,
	type MenuProps,
	MenuRadioGroup,
	type MenuRadioGroupProps,
	MenuRadioItem,
	MenuRadioItemIndicator,
	type MenuRadioItemIndicatorProps,
	type MenuRadioItemProps,
	MenuSeparator,
	type MenuSeparatorProps,
	MenuShortcut,
	type MenuShortcutProps,
	MenuSubmenu,
	type MenuSubmenuProps,
	MenuSubmenuTrigger,
	type MenuSubmenuTriggerProps,
	MenuTrigger,
	type MenuTriggerProps,
	useMenu,
	useMenuActiveValue,
};
