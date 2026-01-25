import {
	DialogClose as DialogClosePrimitive,
	type DialogCloseProps as DialogClosePrimitiveProps,
	DialogContent as DialogContentPrimitive,
	type DialogContentProps as DialogContentPrimitiveProps,
	DialogDescription as DialogDescriptionPrimitive,
	type DialogDescriptionProps as DialogDescriptionPrimitiveProps,
	DialogFooter as DialogFooterPrimitive,
	type DialogFooterProps as DialogFooterPrimitiveProps,
	DialogHeader as DialogHeaderPrimitive,
	type DialogHeaderProps as DialogHeaderPrimitiveProps,
	DialogOverlay as DialogOverlayPrimitive,
	type DialogOverlayProps as DialogOverlayPrimitiveProps,
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

type DialogOverlayProps = DialogOverlayPrimitiveProps;

function DialogOverlay({ className, ...props }: DialogOverlayProps) {
	return <DialogOverlayPrimitive className={cn("fixed inset-0 z-50 bg-black/50", className)} {...props} />;
}

type DialogContentProps = DialogContentPrimitiveProps;

function DialogContent({ className, children, ...props }: DialogContentProps) {
	return (
		<DialogPortalPrimitive>
			<DialogOverlay />
			<DialogContentPrimitive
				className={cn(
					"fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg sm:max-w-2xl",
					className,
				)}
				{...props}
			>
				{children}
			</DialogContentPrimitive>
		</DialogPortalPrimitive>
	);
}

type DialogHeaderProps = DialogHeaderPrimitiveProps;

function DialogHeader({ className, ...props }: DialogHeaderProps) {
	return (
		<DialogHeaderPrimitive className={cn("flex flex-col gap-2 text-center sm:text-start", className)} {...props} />
	);
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
	DialogTrigger,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
	type DialogProps,
	type DialogTriggerProps,
	type DialogCloseProps,
	type DialogContentProps,
	type DialogHeaderProps,
	type DialogFooterProps,
	type DialogTitleProps,
	type DialogDescriptionProps,
};
