import { AnimatePresence, type HTMLMotionProps, motion } from "motion/react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type * as React from "react";
import { useControlledState } from "@/hooks/use-controlled-state";
import { getStrictContext } from "@/utils/get-strict-context";

type AlertDialogContextType = {
	isOpen: boolean;
	setIsOpen: AlertDialogProps["onOpenChange"];
};

const [AlertDialogProvider, useAlertDialog] = getStrictContext<AlertDialogContextType>("AlertDialogContext");

type AlertDialogProps = React.ComponentProps<typeof AlertDialogPrimitive.Root>;

function AlertDialog(props: AlertDialogProps) {
	const [isOpen, setIsOpen] = useControlledState({
		value: props?.open,
		defaultValue: props?.defaultOpen,
		onChange: props?.onOpenChange,
	});

	return (
		<AlertDialogProvider value={{ isOpen, setIsOpen }}>
			<AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} onOpenChange={setIsOpen} />
		</AlertDialogProvider>
	);
}

type AlertDialogTriggerProps = React.ComponentProps<typeof AlertDialogPrimitive.Trigger>;

function AlertDialogTrigger(props: AlertDialogTriggerProps) {
	return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

type AlertDialogPortalProps = Omit<React.ComponentProps<typeof AlertDialogPrimitive.Portal>, "forceMount">;

function AlertDialogPortal(props: AlertDialogPortalProps) {
	const { isOpen } = useAlertDialog();

	return (
		<AnimatePresence>
			{isOpen && <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" forceMount {...props} />}
		</AnimatePresence>
	);
}

type AlertDialogOverlayProps = Omit<
	React.ComponentProps<typeof AlertDialogPrimitive.Overlay>,
	"forceMount" | "asChild"
> &
	HTMLMotionProps<"div">;

function AlertDialogOverlay({ transition = { duration: 0.2, ease: "easeInOut" }, ...props }: AlertDialogOverlayProps) {
	return (
		<AlertDialogPrimitive.Overlay data-slot="alert-dialog-overlay" asChild forceMount>
			<motion.div
				key="alert-dialog-overlay"
				initial={{ opacity: 0, filter: "blur(4px)" }}
				animate={{ opacity: 1, filter: "blur(0px)" }}
				exit={{ opacity: 0, filter: "blur(4px)" }}
				transition={transition}
				{...props}
			/>
		</AlertDialogPrimitive.Overlay>
	);
}

type AlertDialogFlipDirection = "top" | "bottom" | "left" | "right";

type AlertDialogContentProps = Omit<
	React.ComponentProps<typeof AlertDialogPrimitive.Content>,
	"forceMount" | "asChild"
> &
	HTMLMotionProps<"div"> & {
		from?: AlertDialogFlipDirection;
	};

function AlertDialogContent({
	from = "top",
	onOpenAutoFocus,
	onCloseAutoFocus,
	onEscapeKeyDown,
	transition = { type: "spring", stiffness: 250, damping: 25 },
	...props
}: AlertDialogContentProps) {
	const initialRotation = from === "bottom" || from === "left" ? "20deg" : "-20deg";
	const isVertical = from === "top" || from === "bottom";
	const rotateAxis = isVertical ? "rotateX" : "rotateY";

	return (
		<AlertDialogPrimitive.Content
			asChild
			forceMount
			onOpenAutoFocus={onOpenAutoFocus}
			onCloseAutoFocus={onCloseAutoFocus}
			onEscapeKeyDown={onEscapeKeyDown}
		>
			<motion.div
				key="alert-dialog-content"
				data-slot="alert-dialog-content"
				transition={transition}
				initial={{
					opacity: 0,
					filter: "blur(4px)",
					transform: `perspective(500px) ${rotateAxis}(${initialRotation}) scale(0.8)`,
				}}
				animate={{
					opacity: 1,
					filter: "blur(0px)",
					transform: `perspective(500px) ${rotateAxis}(0deg) scale(1)`,
				}}
				exit={{
					opacity: 0,
					filter: "blur(4px)",
					transform: `perspective(500px) ${rotateAxis}(${initialRotation}) scale(0.8)`,
				}}
				{...props}
			/>
		</AlertDialogPrimitive.Content>
	);
}

type AlertDialogCancelProps = React.ComponentProps<typeof AlertDialogPrimitive.Cancel>;

function AlertDialogCancel(props: AlertDialogCancelProps) {
	return <AlertDialogPrimitive.Cancel data-slot="alert-dialog-cancel" {...props} />;
}

type AlertDialogActionProps = React.ComponentProps<typeof AlertDialogPrimitive.Action>;

function AlertDialogAction(props: AlertDialogActionProps) {
	return <AlertDialogPrimitive.Action data-slot="alert-dialog-action" {...props} />;
}

type AlertDialogHeaderProps = React.ComponentProps<"div">;

function AlertDialogHeader(props: AlertDialogHeaderProps) {
	return <div data-slot="alert-dialog-header" {...props} />;
}

type AlertDialogFooterProps = React.ComponentProps<"div">;

function AlertDialogFooter(props: AlertDialogFooterProps) {
	return <div data-slot="alert-dialog-footer" {...props} />;
}

type AlertDialogTitleProps = React.ComponentProps<typeof AlertDialogPrimitive.Title>;

function AlertDialogTitle(props: AlertDialogTitleProps) {
	return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" {...props} />;
}

type AlertDialogDescriptionProps = React.ComponentProps<typeof AlertDialogPrimitive.Description>;

function AlertDialogDescription(props: AlertDialogDescriptionProps) {
	return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" {...props} />;
}

export {
	AlertDialog,
	AlertDialogPortal,
	AlertDialogOverlay,
	AlertDialogCancel,
	AlertDialogAction,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	useAlertDialog,
	type AlertDialogProps,
	type AlertDialogTriggerProps,
	type AlertDialogPortalProps,
	type AlertDialogCancelProps,
	type AlertDialogActionProps,
	type AlertDialogOverlayProps,
	type AlertDialogContentProps,
	type AlertDialogHeaderProps,
	type AlertDialogFooterProps,
	type AlertDialogTitleProps,
	type AlertDialogDescriptionProps,
	type AlertDialogContextType,
	type AlertDialogFlipDirection,
};
