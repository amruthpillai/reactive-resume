import { ChevronDownIcon } from "lucide-react";
import type * as React from "react";
import {
	AccordionHeader as AccordionHeaderPrimitive,
	AccordionItem as AccordionItemPrimitive,
	type AccordionItemProps as AccordionItemPrimitiveProps,
	AccordionPanel as AccordionPanelPrimitive,
	type AccordionPanelProps as AccordionPanelPrimitiveProps,
	Accordion as AccordionPrimitive,
	type AccordionProps as AccordionPrimitiveProps,
	AccordionTrigger as AccordionTriggerPrimitive,
	type AccordionTriggerProps as AccordionTriggerPrimitiveProps,
} from "@/components/primitives/accordion";
import { cn } from "@/utils/style";

type AccordionProps = AccordionPrimitiveProps;

function Accordion(props: AccordionProps) {
	return <AccordionPrimitive {...props} />;
}

type AccordionItemProps = AccordionItemPrimitiveProps;

function AccordionItem({ className, ...props }: AccordionItemProps) {
	return <AccordionItemPrimitive className={cn("border-b last:border-b-0", className)} {...props} />;
}

type AccordionTriggerProps = AccordionTriggerPrimitiveProps & {
	showArrow?: boolean;
};

function AccordionTrigger({ className, children, showArrow = true, ...props }: AccordionTriggerProps) {
	return (
		<AccordionHeaderPrimitive className="flex">
			<AccordionTriggerPrimitive
				className={cn(
					"flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left font-medium text-sm outline-none transition-all hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-panel-open]>svg]:rotate-180",
					className,
				)}
				{...props}
			>
				{children}
				{showArrow && (
					<ChevronDownIcon className="pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200" />
				)}
			</AccordionTriggerPrimitive>
		</AccordionHeaderPrimitive>
	);
}

type AccordionPanelProps = AccordionPanelPrimitiveProps & {
	children: React.ReactNode;
};

function AccordionPanel({ className, children, ...props }: AccordionPanelProps) {
	return (
		<AccordionPanelPrimitive {...props}>
			<div className={cn("pt-0 pb-4 text-sm", className)}>{children}</div>
		</AccordionPanelPrimitive>
	);
}

export {
	Accordion,
	AccordionItem,
	type AccordionItemProps,
	AccordionPanel,
	type AccordionPanelProps,
	type AccordionProps,
	AccordionTrigger,
	type AccordionTriggerProps,
};
