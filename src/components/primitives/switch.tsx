import { Switch as SwitchPrimitives } from "@base-ui/react/switch";
import { type HTMLMotionProps, motion, type TargetAndTransition, type VariantLabels } from "motion/react";
import * as React from "react";
import { useControlledState } from "@/hooks/use-controlled-state";
import { getStrictContext } from "@/utils/get-strict-context";

type SwitchContextType = {
	isChecked: boolean;
	setIsChecked: SwitchProps["onCheckedChange"];
	isPressed: boolean;
	setIsPressed: (isPressed: boolean) => void;
};

const [SwitchProvider, useSwitch] = getStrictContext<SwitchContextType>("SwitchContext");

type SwitchProps = Omit<React.ComponentProps<typeof SwitchPrimitives.Root>, "render"> & HTMLMotionProps<"button">;

function Switch({
	name,
	defaultChecked,
	checked,
	onCheckedChange,
	nativeButton,
	disabled,
	readOnly,
	required,
	inputRef,
	id,
	...props
}: SwitchProps) {
	const [isPressed, setIsPressed] = React.useState(false);
	const [isChecked, setIsChecked] = useControlledState({
		value: checked,
		defaultValue: defaultChecked,
		onChange: onCheckedChange,
	});

	return (
		<SwitchProvider value={{ isChecked, setIsChecked, isPressed, setIsPressed }}>
			<SwitchPrimitives.Root
				name={name}
				defaultChecked={defaultChecked}
				checked={checked}
				onCheckedChange={setIsChecked}
				nativeButton={nativeButton}
				disabled={disabled}
				readOnly={readOnly}
				required={required}
				inputRef={inputRef}
				id={id}
				render={
					<motion.button
						data-slot="switch"
						whileTap="tap"
						initial={false}
						onTapStart={() => setIsPressed(true)}
						onTapCancel={() => setIsPressed(false)}
						onTap={() => setIsPressed(false)}
						{...props}
					/>
				}
			/>
		</SwitchProvider>
	);
}

type SwitchThumbProps = Omit<React.ComponentProps<typeof SwitchPrimitives.Thumb>, "render"> &
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
		<SwitchPrimitives.Thumb
			render={
				<motion.div
					data-slot="switch-thumb"
					whileTap="tab"
					layout
					transition={transition}
					animate={isPressed ? pressedAnimation : undefined}
					{...props}
				/>
			}
		/>
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
	type SwitchContextType,
	SwitchIcon,
	type SwitchIconPosition,
	type SwitchIconProps,
	type SwitchProps,
	SwitchThumb,
	type SwitchThumbProps,
	useSwitch,
};
