import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@reactive-resume/utils/style";

const attachmentVariants = cva(
	"group/attachment relative flex w-fit min-w-0 max-w-full shrink-0 flex-wrap rounded-xl border bg-card text-card-foreground transition-colors focus-within:ring-1 focus-within:ring-ring/50 has-[>a,>button]:hover:bg-muted/50 data-[state=error]:border-destructive/30 data-[state=idle]:border-dashed",
	{
		variants: {
			size: {
				default:
					"gap-2 text-sm has-data-[slot=attachment-media]:p-2 has-data-[slot=attachment-content]:px-2.5 has-data-[slot=attachment-content]:py-2",
				sm: "gap-2.5 text-xs has-data-[slot=attachment-media]:p-1.5 has-data-[slot=attachment-content]:px-2 has-data-[slot=attachment-content]:py-1.5",
				xs: "gap-1.5 rounded-lg text-xs has-data-[slot=attachment-media]:p-1 has-data-[slot=attachment-content]:px-1.5 has-data-[slot=attachment-content]:py-1",
			},
			orientation: {
				horizontal: "min-w-40 items-center",
				vertical: "w-24 flex-col has-data-[slot=attachment-content]:w-30",
			},
		},
	},
);

function Attachment({
	className,
	state = "done",
	size = "default",
	orientation = "horizontal",
	...props
}: React.ComponentProps<"div"> &
	VariantProps<typeof attachmentVariants> & {
		state?: "idle" | "uploading" | "processing" | "error" | "done";
	}) {
	return (
		<div
			data-slot="attachment"
			data-state={state}
			data-size={size}
			data-orientation={orientation}
			className={cn(attachmentVariants({ size, orientation }), className)}
			{...props}
		/>
	);
}

const attachmentMediaVariants = cva(
	"relative flex aspect-square w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-foreground group-data-[orientation=vertical]/attachment:w-full group-data-[size=sm]/attachment:w-8 group-data-[size=xs]/attachment:w-7 group-data-[size=xs]/attachment:rounded-md group-data-[state=error]/attachment:bg-destructive/10 group-data-[state=error]/attachment:text-destructive group-data-[orientation=vertical]/attachment:*:data-[slot=spinner]:size-6! [&_svg:not([class*='size-'])]:size-4 group-data-[orientation=vertical]/attachment:[&_svg:not([class*='size-'])]:size-6 group-data-[size=xs]/attachment:[&_svg:not([class*='size-'])]:size-3.5 [&_svg]:pointer-events-none",
	{
		variants: {
			variant: {
				icon: "",
				image:
					"opacity-60 group-data-[state=done]/attachment:opacity-100 group-data-[state=idle]/attachment:opacity-100 *:[img]:aspect-square *:[img]:w-full *:[img]:object-cover",
			},
		},
		defaultVariants: {
			variant: "icon",
		},
	},
);

function AttachmentMedia({
	className,
	variant = "icon",
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof attachmentMediaVariants>) {
	return (
		<div
			data-slot="attachment-media"
			data-variant={variant}
			className={cn(attachmentMediaVariants({ variant }), className)}
			{...props}
		/>
	);
}

function AttachmentContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="attachment-content"
			className={cn(
				"min-w-0 max-w-full flex-1 leading-tight group-data-[orientation=vertical]/attachment:px-1",
				className,
			)}
			{...props}
		/>
	);
}

function AttachmentTitle({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="attachment-title"
			className={cn(
				"group-data-[state=processing]/attachment:shimmer group-data-[state=uploading]/attachment:shimmer block min-w-0 max-w-full truncate font-medium",
				className,
			)}
			{...props}
		/>
	);
}

function AttachmentGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="attachment-group"
			className={cn(
				"scroll-fade-x scrollbar-none flex min-w-0 snap-x snap-mandatory scroll-px-1 gap-3 overflow-x-auto overscroll-x-contain py-1 *:data-[slot=attachment]:flex-none *:data-[slot=attachment]:snap-start",
				className,
			)}
			{...props}
		/>
	);
}

export { Attachment, AttachmentContent, AttachmentGroup, AttachmentMedia, AttachmentTitle };
