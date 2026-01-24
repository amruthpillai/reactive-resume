import { type HTMLMotionProps, motion } from "motion/react";
import { Slot, type WithAsChild } from "@/components/primitives/slot";

type ButtonProps = WithAsChild<
	Omit<HTMLMotionProps<"button">, "children"> & {
		hoverScale?: number;
		tapScale?: number;
		// biome-ignore lint/suspicious/noExplicitAny: unknown type
		children?: any;
	}
>;

function Button({ hoverScale = 1.0, tapScale = 0.95, asChild = false, ...props }: ButtonProps) {
	const Component = asChild ? Slot : motion.button;

	return <Component whileTap={{ scale: tapScale }} whileHover={{ scale: hoverScale }} {...props} />;
}

export { Button, type ButtonProps };
