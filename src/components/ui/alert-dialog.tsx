import {
	AlertDialogBackdrop as AlertDialogBackdropPrimitive,
	type AlertDialogBackdropProps as AlertDialogBackdropPrimitiveProps,
	AlertDialogClose as AlertDialogClosePrimitive,
	type AlertDialogCloseProps as AlertDialogClosePrimitiveProps,
	AlertDialogDescription as AlertDialogDescriptionPrimitive,
	type AlertDialogDescriptionProps as AlertDialogDescriptionPrimitiveProps,
	AlertDialogFooter as AlertDialogFooterPrimitive,
	type AlertDialogFooterProps as AlertDialogFooterPrimitiveProps,
	AlertDialogHeader as AlertDialogHeaderPrimitive,
	type AlertDialogHeaderProps as AlertDialogHeaderPrimitiveProps,
	AlertDialogPopup as AlertDialogPopupPrimitive,
	type AlertDialogPopupProps as AlertDialogPopupPrimitiveProps,
	AlertDialogPortal as AlertDialogPortalPrimitive,
	AlertDialog as AlertDialogPrimitive,
	type AlertDialogProps as AlertDialogPrimitiveProps,
	AlertDialogTitle as AlertDialogTitlePrimitive,
	type AlertDialogTitleProps as AlertDialogTitlePrimitiveProps,
	AlertDialogTrigger as AlertDialogTriggerPrimitive,
	type AlertDialogTriggerProps as AlertDialogTriggerPrimitiveProps,
} from "@/components/primitives/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils/style";

type AlertDialogProps = AlertDialogPrimitiveProps;

function AlertDialog(props: AlertDialogProps) {
	return <AlertDialogPrimitive {...props} />;
}

type AlertDialogTriggerProps = AlertDialogTriggerPrimitiveProps;

function AlertDialogTrigger(props: AlertDialogTriggerProps) {
	return <AlertDialogTriggerPrimitive {...props} />;
}

type AlertDialogBackdropProps = AlertDialogBackdropPrimitiveProps;

function AlertDialogBackdrop({ className, ...props }: AlertDialogBackdropProps) {
	return <AlertDialogBackdropPrimitive className={cn("fixed inset-0 z-50 bg-black/50", className)} {...props} />;
}

type AlertDialogPopupProps = AlertDialogPopupPrimitiveProps;

function AlertDialogPopup({ className, ...props }: AlertDialogPopupProps) {
	return (
		<AlertDialogPortalPrimitive>
			<AlertDialogBackdrop />
			<AlertDialogPopupPrimitive
				className={cn(
					"fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg sm:max-w-2xl",
					className,
				)}
				{...props}
			/>
		</AlertDialogPortalPrimitive>
	);
}

type AlertDialogHeaderProps = AlertDialogHeaderPrimitiveProps;

function AlertDialogHeader({ className, ...props }: AlertDialogHeaderProps) {
	return (
		<AlertDialogHeaderPrimitive className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />
	);
}

type AlertDialogFooterProps = AlertDialogFooterPrimitiveProps;

function AlertDialogFooter({ className, ...props }: AlertDialogFooterProps) {
	return (
		<AlertDialogFooterPrimitive
			className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
			{...props}
		/>
	);
}

type AlertDialogTitleProps = AlertDialogTitlePrimitiveProps;

function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
	return <AlertDialogTitlePrimitive className={cn("font-semibold text-lg", className)} {...props} />;
}

type AlertDialogDescriptionProps = AlertDialogDescriptionPrimitiveProps;

function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
	return <AlertDialogDescriptionPrimitive className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

type AlertDialogActionProps = AlertDialogClosePrimitiveProps;

function AlertDialogAction({ className, ...props }: AlertDialogActionProps) {
	return <AlertDialogClosePrimitive className={cn(buttonVariants(), className)} {...props} />;
}

type AlertDialogCancelProps = AlertDialogClosePrimitiveProps;

function AlertDialogCancel({ className, ...props }: AlertDialogCancelProps) {
	return <AlertDialogClosePrimitive className={cn(buttonVariants({ variant: "outline" }), className)} {...props} />;
}

export {
	AlertDialog,
	AlertDialogAction,
	type AlertDialogActionProps,
	AlertDialogCancel,
	type AlertDialogCancelProps,
	AlertDialogDescription,
	type AlertDialogDescriptionProps,
	AlertDialogFooter,
	type AlertDialogFooterProps,
	AlertDialogHeader,
	type AlertDialogHeaderProps,
	AlertDialogPopup,
	type AlertDialogPopupProps,
	type AlertDialogProps,
	AlertDialogTitle,
	type AlertDialogTitleProps,
	AlertDialogTrigger,
	type AlertDialogTriggerProps,
};
