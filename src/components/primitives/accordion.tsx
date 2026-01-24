import { AnimatePresence, type HTMLMotionProps, motion } from "motion/react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import * as React from "react";
import { useControlledState } from "@/hooks/use-controlled-state";
import { getStrictContext } from "@/utils/get-strict-context";

type AccordionContextType = {
	value: string | string[] | undefined;
	setValue: (value: string | string[] | undefined) => void;
};

type AccordionItemContextType = {
	value: string;
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
};

const [AccordionProvider, useAccordion] = getStrictContext<AccordionContextType>("AccordionContext");

const [AccordionItemProvider, useAccordionItem] = getStrictContext<AccordionItemContextType>("AccordionItemContext");

type AccordionProps = React.ComponentProps<typeof AccordionPrimitive.Root>;

function Accordion(props: AccordionProps) {
	const [value, setValue] = useControlledState<string | string[] | undefined>({
		value: props?.value,
		defaultValue: props?.defaultValue,
		onChange: props?.onValueChange as (value: string | string[] | undefined) => void,
	});

	return (
		<AccordionProvider value={{ value, setValue }}>
			<AccordionPrimitive.Root data-slot="accordion" {...props} onValueChange={setValue} />
		</AccordionProvider>
	);
}

type AccordionItemProps = React.ComponentProps<typeof AccordionPrimitive.Item>;

function AccordionItem(props: AccordionItemProps) {
	const { value } = useAccordion();
	const [isOpen, setIsOpen] = React.useState(value?.includes(props?.value) ?? false);

	React.useEffect(() => {
		setIsOpen(value?.includes(props?.value) ?? false);
	}, [value, props?.value]);

	return (
		<AccordionItemProvider value={{ isOpen, setIsOpen, value: props.value }}>
			<AccordionPrimitive.Item data-slot="accordion-item" {...props} />
		</AccordionItemProvider>
	);
}

type AccordionHeaderProps = React.ComponentProps<typeof AccordionPrimitive.Header>;

function AccordionHeader(props: AccordionHeaderProps) {
	return <AccordionPrimitive.Header data-slot="accordion-header" {...props} />;
}

type AccordionTriggerProps = React.ComponentProps<typeof AccordionPrimitive.Trigger>;

function AccordionTrigger(props: AccordionTriggerProps) {
	return <AccordionPrimitive.Trigger data-slot="accordion-trigger" {...props} />;
}

type AccordionContentProps = Omit<React.ComponentProps<typeof AccordionPrimitive.Content>, "asChild" | "forceMount"> &
	HTMLMotionProps<"div"> & {
		keepRendered?: boolean;
	};

function AccordionContent({
	keepRendered = false,
	transition = { duration: 0.35, ease: "easeInOut" },
	...props
}: AccordionContentProps) {
	const { isOpen } = useAccordionItem();

	return (
		<AnimatePresence>
			{keepRendered ? (
				<AccordionPrimitive.Content asChild forceMount>
					<motion.div
						key="accordion-content"
						data-slot="accordion-content"
						initial={{ height: 0, opacity: 0, "--mask-stop": "0%", y: 20 }}
						animate={
							isOpen
								? { height: "auto", opacity: 1, "--mask-stop": "100%", y: 0 }
								: { height: 0, opacity: 0, "--mask-stop": "0%", y: 20 }
						}
						transition={transition}
						style={{
							maskImage: "linear-gradient(black var(--mask-stop), transparent var(--mask-stop))",
							WebkitMaskImage: "linear-gradient(black var(--mask-stop), transparent var(--mask-stop))",
							overflow: "hidden",
						}}
						{...props}
					/>
				</AccordionPrimitive.Content>
			) : (
				isOpen && (
					<AccordionPrimitive.Content asChild forceMount>
						<motion.div
							key="accordion-content"
							data-slot="accordion-content"
							initial={{ height: 0, opacity: 0, "--mask-stop": "0%", y: 20 }}
							animate={{
								height: "auto",
								opacity: 1,
								"--mask-stop": "100%",
								y: 0,
							}}
							exit={{ height: 0, opacity: 0, "--mask-stop": "0%", y: 20 }}
							transition={transition}
							style={{
								maskImage: "linear-gradient(black var(--mask-stop), transparent var(--mask-stop))",
								WebkitMaskImage: "linear-gradient(black var(--mask-stop), transparent var(--mask-stop))",
								overflow: "hidden",
							}}
							{...props}
						/>
					</AccordionPrimitive.Content>
				)
			)}
		</AnimatePresence>
	);
}

export {
	Accordion,
	AccordionItem,
	AccordionHeader,
	AccordionTrigger,
	AccordionContent,
	useAccordion,
	useAccordionItem,
	type AccordionProps,
	type AccordionItemProps,
	type AccordionHeaderProps,
	type AccordionTriggerProps,
	type AccordionContentProps,
	type AccordionContextType,
	type AccordionItemContextType,
};
