import { XIcon } from "@phosphor-icons/react";
import {
	DialogBackdrop as DialogBackdropPrimitive,
	type DialogBackdropProps as DialogBackdropPrimitiveProps,
	DialogClose as DialogClosePrimitive,
	type DialogCloseProps as DialogClosePrimitiveProps,
	DialogDescription as DialogDescriptionPrimitive,
	type DialogDescriptionProps as DialogDescriptionPrimitiveProps,
	DialogFooter as DialogFooterPrimitive,
	type DialogFooterProps as DialogFooterPrimitiveProps,
	DialogHeader as DialogHeaderPrimitive,
	type DialogHeaderProps as DialogHeaderPrimitiveProps,
	DialogPopup as DialogPopupPrimitive,
	type DialogPopupProps as DialogPopupPrimitiveProps,
	DialogPortal as DialogPortalPrimitive,
	Dialog as DialogPrimitive,
	type DialogProps as DialogPrimitiveProps,
	DialogTitle as DialogTitlePrimitive,
	type DialogTitleProps as DialogTitlePrimitiveProps,
	DialogTrigger as DialogTriggerPrimitive,
	type DialogTriggerProps as DialogTriggerPrimitiveProps,
} from "@/components/primitives/dialog";
import { cn } from "@/utils/style";

type DialogProps = DialogPrimitiveProps;

function Dialog(props: DialogProps) {
	return <DialogPrimitive {...props} />;
}

type DialogTriggerProps = DialogTriggerPrimitiveProps;

function DialogTrigger(props: DialogTriggerProps) {
	return <DialogTriggerPrimitive {...props} />;
}

type DialogCloseProps = DialogClosePrimitiveProps;

function DialogClose(props: DialogCloseProps) {
	return <DialogClosePrimitive {...props} />;
}

type DialogBackdropProps = DialogBackdropPrimitiveProps;

function DialogBackdrop({ className, ...props }: DialogBackdropProps) {
	return <DialogBackdropPrimitive className={cn("fixed inset-0 z-50 bg-black/50", className)} {...props} />;
}

type DialogPopupProps = DialogPopupPrimitiveProps & {
	showCloseButton?: boolean;
};

function DialogPopup({ className, children, showCloseButton = true, ...props }: DialogPopupProps) {
	return (
		<DialogPortalPrimitive>
			<DialogBackdrop />
			<DialogPopupPrimitive
				className={cn(
					"fixed top-[50%] left-[50%] z-50 grid max-h-[calc(100%-2rem)] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border bg-background p-6 shadow-lg sm:max-w-2xl",
					className,
				)}
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogClosePrimitive className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-open:bg-accent data-open:text-muted-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0">
						<XIcon />
						<span className="sr-only">Close</span>
					</DialogClosePrimitive>
				)}
			</DialogPopupPrimitive>
		</DialogPortalPrimitive>
	);
}

type DialogHeaderProps = DialogHeaderPrimitiveProps;

function DialogHeader({ className, ...props }: DialogHeaderProps) {
	return <DialogHeaderPrimitive className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />;
}

type DialogFooterProps = DialogFooterPrimitiveProps;

function DialogFooter({ className, ...props }: DialogFooterProps) {
	return (
		<DialogFooterPrimitive
			className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
			{...props}
		/>
	);
}

type DialogTitleProps = DialogTitlePrimitiveProps;

function DialogTitle({ className, ...props }: DialogTitleProps) {
	return <DialogTitlePrimitive className={cn("font-semibold text-lg leading-none", className)} {...props} />;
}

type DialogDescriptionProps = DialogDescriptionPrimitiveProps;

function DialogDescription({ className, ...props }: DialogDescriptionProps) {
	return <DialogDescriptionPrimitive className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

export {
	Dialog,
	DialogClose,
	type DialogCloseProps,
	DialogDescription,
	type DialogDescriptionProps,
	DialogFooter,
	type DialogFooterProps,
	DialogHeader,
	type DialogHeaderProps,
	DialogPopup,
	type DialogPopupProps,
	type DialogProps,
	DialogTitle,
	type DialogTitleProps,
	DialogTrigger,
	type DialogTriggerProps,
};
