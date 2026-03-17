import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { AnimatePresence, type HTMLMotionProps, motion } from "motion/react";
import type * as React from "react";
import { useControlledState } from "@/hooks/use-controlled-state";
import { getStrictContext } from "@/utils/get-strict-context";

type DialogContextType = {
	isOpen: boolean;
	setIsOpen: DialogProps["onOpenChange"];
};

const [DialogProvider, useDialog] = getStrictContext<DialogContextType>("DialogContext");

type DialogProps = React.ComponentProps<typeof DialogPrimitive.Root>;

function Dialog(props: DialogProps) {
	const [isOpen, setIsOpen] = useControlledState({
		value: props?.open,
		defaultValue: props?.defaultOpen,
		onChange: props?.onOpenChange,
	});

	return (
		<DialogProvider value={{ isOpen, setIsOpen }}>
			<DialogPrimitive.Root data-slot="dialog" {...props} onOpenChange={setIsOpen} />
		</DialogProvider>
	);
}

type DialogTriggerProps = React.ComponentProps<typeof DialogPrimitive.Trigger>;

function DialogTrigger(props: DialogTriggerProps) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

type DialogPortalProps = Omit<React.ComponentProps<typeof DialogPrimitive.Portal>, "keepMounted">;

function DialogPortal(props: DialogPortalProps) {
	const { isOpen } = useDialog();

	return (
		<AnimatePresence>
			{isOpen && <DialogPrimitive.Portal data-slot="dialog-portal" keepMounted {...props} />}
		</AnimatePresence>
	);
}

type DialogBackdropProps = Omit<React.ComponentProps<typeof DialogPrimitive.Backdrop>, "render"> &
	HTMLMotionProps<"div">;

function DialogBackdrop({ transition = { duration: 0.2, ease: "easeInOut" }, ...props }: DialogBackdropProps) {
	return (
		<DialogPrimitive.Backdrop
			data-slot="dialog-backdrop"
			render={
				<motion.div
					key="dialog-backdrop"
					initial={{ opacity: 0, filter: "blur(4px)" }}
					animate={{ opacity: 1, filter: "blur(0px)" }}
					exit={{ opacity: 0, filter: "blur(4px)" }}
					transition={transition}
					{...props}
				/>
			}
		/>
	);
}

type DialogFlipDirection = "top" | "bottom" | "left" | "right";

type DialogPopupProps = Omit<React.ComponentProps<typeof DialogPrimitive.Popup>, "render"> &
	HTMLMotionProps<"div"> & {
		from?: DialogFlipDirection;
	};

function DialogPopup({
	from = "top",
	initialFocus,
	finalFocus,
	transition = { type: "spring", stiffness: 150, damping: 25 },
	...props
}: DialogPopupProps) {
	const initialRotation = from === "bottom" || from === "left" ? "20deg" : "-20deg";
	const isVertical = from === "top" || from === "bottom";
	const rotateAxis = isVertical ? "rotateX" : "rotateY";

	return (
		<DialogPrimitive.Popup
			initialFocus={initialFocus}
			finalFocus={finalFocus}
			render={
				<motion.div
					key="dialog-popup"
					data-slot="dialog-popup"
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
					transition={transition}
					{...props}
				/>
			}
		/>
	);
}

type DialogCloseProps = React.ComponentProps<typeof DialogPrimitive.Close>;

function DialogClose(props: DialogCloseProps) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

type DialogHeaderProps = React.ComponentProps<"div">;

function DialogHeader(props: DialogHeaderProps) {
	return <div data-slot="dialog-header" {...props} />;
}

type DialogFooterProps = React.ComponentProps<"div">;

function DialogFooter(props: DialogFooterProps) {
	return <div data-slot="dialog-footer" {...props} />;
}

type DialogTitleProps = React.ComponentProps<typeof DialogPrimitive.Title>;

function DialogTitle(props: DialogTitleProps) {
	return <DialogPrimitive.Title data-slot="dialog-title" {...props} />;
}

type DialogDescriptionProps = React.ComponentProps<typeof DialogPrimitive.Description>;

function DialogDescription(props: DialogDescriptionProps) {
	return <DialogPrimitive.Description data-slot="dialog-description" {...props} />;
}

export {
	Dialog,
	DialogBackdrop,
	type DialogBackdropProps,
	DialogClose,
	type DialogCloseProps,
	type DialogContextType,
	DialogDescription,
	type DialogDescriptionProps,
	type DialogFlipDirection,
	DialogFooter,
	type DialogFooterProps,
	DialogHeader,
	type DialogHeaderProps,
	DialogPopup,
	type DialogPopupProps,
	DialogPortal,
	type DialogPortalProps,
	type DialogProps,
	DialogTitle,
	type DialogTitleProps,
	DialogTrigger,
	type DialogTriggerProps,
	useDialog,
};
