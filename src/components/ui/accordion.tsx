import {
	AccordionContent as AccordionContentPrimitive,
	type AccordionContentProps as AccordionContentPrimitiveProps,
	AccordionHeader as AccordionHeaderPrimitive,
	AccordionItem as AccordionItemPrimitive,
	type AccordionItemProps as AccordionItemPrimitiveProps,
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
	return <AccordionItemPrimitive className={cn(className)} {...props} />;
}

type AccordionTriggerProps = AccordionTriggerPrimitiveProps;

function AccordionTrigger({ className, children, ...props }: AccordionTriggerProps) {
	return (
		<AccordionHeaderPrimitive className="flex">
			<AccordionTriggerPrimitive
				className={cn(
					"flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-start font-medium text-sm outline-none transition-all hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=closed]>svg]:rotate-0 [&[data-state=open]>svg]:rotate-90 [&[data-state=open]>svg]:transition-transform",
					className,
				)}
				{...props}
			>
				{children}
			</AccordionTriggerPrimitive>
		</AccordionHeaderPrimitive>
	);
}

type AccordionContentProps = AccordionContentPrimitiveProps;

function AccordionContent({ className, children, ...props }: AccordionContentProps) {
	return (
		<AccordionContentPrimitive {...props}>
			<div className={cn("pt-0 pb-4 text-sm", className)}>{children}</div>
		</AccordionContentPrimitive>
	);
}

export {
	Accordion,
	AccordionItem,
	AccordionTrigger,
	AccordionContent,
	type AccordionProps,
	type AccordionItemProps,
	type AccordionTriggerProps,
	type AccordionContentProps,
};
