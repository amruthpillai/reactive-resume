import { type HTMLMotionProps, motion, type TargetAndTransition, type VariantLabels } from "motion/react";
import { Switch as SwitchPrimitives } from "radix-ui";
import * as React from "react";
import { useControlledState } from "@/hooks/use-controlled-state";
import { getStrictContext } from "@/utils/get-strict-context";

type SwitchContextType = {
	isChecked: boolean;
	setIsChecked: (isChecked: boolean) => void;
	isPressed: boolean;
	setIsPressed: (isPressed: boolean) => void;
};

const [SwitchProvider, useSwitch] = getStrictContext<SwitchContextType>("SwitchContext");

type SwitchProps = Omit<React.ComponentProps<typeof SwitchPrimitives.Root>, "asChild"> & HTMLMotionProps<"button">;

function Switch(props: SwitchProps) {
	const [isPressed, setIsPressed] = React.useState(false);
	const { checked, defaultChecked, onCheckedChange, ...restProps } = props;

	const [isChecked, setIsChecked] = useControlledState({
		value: checked,
		defaultValue: defaultChecked,
		onChange: onCheckedChange,
	});

	return (
		<SwitchProvider value={{ isChecked, setIsChecked, isPressed, setIsPressed }}>
			<SwitchPrimitives.Root
				{...restProps}
				asChild
				checked={isChecked}
				defaultChecked={defaultChecked}
				onCheckedChange={setIsChecked}
			>
				<motion.button
					{...restProps}
					whileTap="tap"
					initial={false}
					data-slot="switch"
					onTap={() => setIsPressed(false)}
					onTapStart={() => setIsPressed(true)}
					onTapCancel={() => setIsPressed(false)}
				/>
			</SwitchPrimitives.Root>
		</SwitchProvider>
	);
}

type SwitchThumbProps = Omit<React.ComponentProps<typeof SwitchPrimitives.Thumb>, "asChild"> &
	HTMLMotionProps<"div"> & {
		pressedAnimation?: TargetAndTransition | VariantLabels | boolean;
	};

function SwitchThumb({
	pressedAnimation,
	transition = { type: "spring", stiffness: 300, damping: 25 },
	...props
}: SwitchThumbProps) {
	const { isPressed } = useSwitch();

	return (
		<SwitchPrimitives.Thumb asChild>
			<motion.div
				layout
				whileTap="tab"
				data-slot="switch-thumb"
				transition={transition}
				animate={isPressed ? pressedAnimation : undefined}
				{...props}
			/>
		</SwitchPrimitives.Thumb>
	);
}

type SwitchIconPosition = "left" | "right" | "thumb";

type SwitchIconProps = HTMLMotionProps<"div"> & {
	position: SwitchIconPosition;
};

function SwitchIcon({ position, transition = { type: "spring", bounce: 0 }, ...props }: SwitchIconProps) {
	const { isChecked } = useSwitch();

	const isAnimated = React.useMemo(() => {
		if (position === "right") return !isChecked;
		if (position === "left") return isChecked;
		if (position === "thumb") return true;
		return false;
	}, [position, isChecked]);

	return (
		<motion.div
			data-slot={`switch-${position}-icon`}
			animate={isAnimated ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
			transition={transition}
			{...props}
		/>
	);
}

export {
	Switch,
	SwitchThumb,
	SwitchIcon,
	useSwitch,
	type SwitchProps,
	type SwitchThumbProps,
	type SwitchIconProps,
	type SwitchIconPosition,
	type SwitchContextType,
};
