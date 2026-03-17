import {
	PopoverBackdrop as PopoverBackdropPrimitive,
	type PopoverBackdropProps as PopoverBackdropPrimitiveProps,
	PopoverClose as PopoverClosePrimitive,
	type PopoverCloseProps as PopoverClosePrimitiveProps,
	PopoverDescription as PopoverDescriptionPrimitive,
	type PopoverDescriptionProps as PopoverDescriptionPrimitiveProps,
	PopoverPopup as PopoverPopupPrimitive,
	type PopoverPopupProps as PopoverPopupPrimitiveProps,
	PopoverPortal as PopoverPortalPrimitive,
	PopoverPositioner as PopoverPositionerPrimitive,
	type PopoverPositionerProps as PopoverPositionerPrimitiveProps,
	Popover as PopoverPrimitive,
	type PopoverProps as PopoverPrimitiveProps,
	PopoverTitle as PopoverTitlePrimitive,
	type PopoverTitleProps as PopoverTitlePrimitiveProps,
	PopoverTrigger as PopoverTriggerPrimitive,
	type PopoverTriggerProps as PopoverTriggerPrimitiveProps,
} from "@/components/primitives/popover";
import { cn } from "@/utils/style";

type PopoverProps = PopoverPrimitiveProps;

function Popover(props: PopoverProps) {
	return <PopoverPrimitive {...props} />;
}

type PopoverTriggerProps = PopoverTriggerPrimitiveProps;

function PopoverTrigger(props: PopoverTriggerProps) {
	return <PopoverTriggerPrimitive {...props} />;
}

type PopoverPanelProps = PopoverPositionerPrimitiveProps & PopoverPopupPrimitiveProps;

function PopoverPanel({
	className,
	align = "center",
	sideOffset = 4,
	initialFocus,
	finalFocus,
	style,
	children,
	...props
}: PopoverPanelProps) {
	return (
		<PopoverPortalPrimitive>
			<PopoverPositionerPrimitive align={align} sideOffset={sideOffset} className="z-50" {...props}>
				<PopoverPopupPrimitive
					initialFocus={initialFocus}
					finalFocus={finalFocus}
					className={cn(
						"w-72 origin-(--transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden",
						className,
					)}
					style={style}
				>
					{children}
				</PopoverPopupPrimitive>
			</PopoverPositionerPrimitive>
		</PopoverPortalPrimitive>
	);
}

type PopoverCloseProps = PopoverClosePrimitiveProps;

function PopoverClose(props: PopoverCloseProps) {
	return <PopoverClosePrimitive {...props} />;
}

type PopoverBackdropProps = PopoverBackdropPrimitiveProps;

function PopoverBackdrop(props: PopoverBackdropProps) {
	return <PopoverBackdropPrimitive {...props} />;
}

type PopoverTitleProps = PopoverTitlePrimitiveProps;

function PopoverTitle(props: PopoverTitleProps) {
	return <PopoverTitlePrimitive {...props} />;
}

type PopoverDescriptionProps = PopoverDescriptionPrimitiveProps;

function PopoverDescription(props: PopoverDescriptionProps) {
	return <PopoverDescriptionPrimitive {...props} />;
}

export {
	Popover,
	PopoverBackdrop,
	type PopoverBackdropProps,
	PopoverClose,
	type PopoverCloseProps,
	PopoverDescription,
	type PopoverDescriptionProps,
	PopoverPanel,
	type PopoverPanelProps,
	type PopoverProps,
	PopoverTitle,
	type PopoverTitleProps,
	PopoverTrigger,
	type PopoverTriggerProps,
};
