import { type HTMLMotionProps, isMotionComponent, motion } from "motion/react";
import * as React from "react";
import { cn } from "@/utils/style";

type AnyProps = Record<string, unknown>;

type DOMMotionProps<T extends HTMLElement = HTMLElement> = Omit<HTMLMotionProps<keyof HTMLElementTagNameMap>, "ref"> & {
	ref?: React.Ref<T>;
};

type WithAsChild<Base extends object> =
	| (Base & { asChild: true; children: React.ReactElement })
	| (Base & { asChild?: false | undefined });

type SlotProps<T extends HTMLElement = HTMLElement> = {
	children?: React.ReactElement;
} & DOMMotionProps<T>;

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
	return (node) => {
		refs.forEach((ref) => {
			if (!ref) return;
			if (typeof ref === "function") {
				ref(node);
			} else {
				(ref as React.RefObject<T | null>).current = node;
			}
		});
	};
}

function mergeProps<T extends HTMLElement>(childProps: AnyProps, slotProps: DOMMotionProps<T>): AnyProps {
	const merged: AnyProps = { ...childProps, ...slotProps };

	if (childProps.className || slotProps.className) {
		merged.className = cn(childProps.className as string, slotProps.className as string);
	}

	if (childProps.style || slotProps.style) {
		merged.style = {
			...(childProps.style as React.CSSProperties),
			...(slotProps.style as React.CSSProperties),
		};
	}

	return merged;
}

function Slot<T extends HTMLElement = HTMLElement>({ children, ref, ...props }: SlotProps<T>) {
	const isAlreadyMotion =
		children && typeof children.type === "object" && children.type !== null && isMotionComponent(children.type);

	const Base = React.useMemo(
		() => (isAlreadyMotion ? (children.type as React.ElementType) : motion.create(children?.type as React.ElementType)),
		[isAlreadyMotion, children],
	);

	if (!React.isValidElement(children)) return null;

	const { ref: childRef, ...childProps } = children.props as AnyProps;

	const mergedProps = mergeProps(childProps, props);

	return <Base {...mergedProps} ref={mergeRefs(childRef as React.Ref<T>, ref)} />;
}

export { Slot, type SlotProps, type WithAsChild, type DOMMotionProps, type AnyProps };
