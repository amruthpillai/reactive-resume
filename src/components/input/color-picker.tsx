import { EyedropperIcon } from "@phosphor-icons/react";
import { Slider as SliderPrimitive, Slot as SlotPrimitive } from "radix-ui";
import * as React from "react";
import { VisuallyHiddenInput } from "@/components/input/visually-hidden-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	type ColorValue,
	type HSVColorValue,
	hexToRgb,
	hsvToRgb,
	parseRgbString,
	rgbToHsv,
	rgbToString,
} from "@/utils/color";
import { useComposedRefs } from "@/utils/compose-refs";
import { cn } from "@/utils/style";

interface EyeDropper {
	open: (options?: { signal?: AbortSignal }) => Promise<{ sRGBHex: string }>;
}

declare global {
	interface Window {
		EyeDropper?: {
			new (): EyeDropper;
		};
	}
}

type Direction = "ltr" | "rtl";

const DirectionContext = React.createContext<Direction | undefined>(undefined);

function useDirection(dirProp?: Direction): Direction {
	const contextDir = React.useContext(DirectionContext);
	return dirProp ?? contextDir ?? "ltr";
}

function useLazyRef<T>(fn: () => T) {
	const ref = React.useRef<T | null>(null);

	if (ref.current === null) {
		ref.current = fn();
	}

	return ref as React.RefObject<T>;
}

interface ColorPickerStoreState {
	color: ColorValue;
	hsv: HSVColorValue;
	open: boolean;
}

interface ColorPickerStoreCallbacks {
	onColorChange?: (colorString: string) => void;
	onOpenChange?: (open: boolean) => void;
}

function colorValuesEqual(a: ColorValue, b: ColorValue): boolean {
	return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

function hsvValuesEqual(a: HSVColorValue, b: HSVColorValue): boolean {
	return a.h === b.h && a.s === b.s && a.v === b.v && a.a === b.a;
}

interface ColorPickerStore {
	subscribe: (cb: () => void) => () => void;
	getState: () => ColorPickerStoreState;
	setColor: (value: ColorValue) => void;
	setHsv: (value: HSVColorValue) => void;
	setOpen: (value: boolean) => void;
	syncColor: (value: ColorValue) => void;
	notify: () => void;
}

function createColorPickerStore(
	listenersRef: React.RefObject<Set<() => void>>,
	stateRef: React.RefObject<ColorPickerStoreState>,
	callbacks?: ColorPickerStoreCallbacks,
): ColorPickerStore {
	const store: ColorPickerStore = {
		subscribe: (cb) => {
			if (listenersRef.current) {
				listenersRef.current.add(cb);
				return () => listenersRef.current?.delete(cb);
			}
			return () => {};
		},
		getState: () =>
			stateRef.current || {
				color: { r: 0, g: 0, b: 0, a: 1 },
				hsv: { h: 0, s: 0, v: 0, a: 1 },
				open: false,
			},
		setColor: (value: ColorValue) => {
			if (!stateRef.current) return;
			if (colorValuesEqual(stateRef.current.color, value)) return;

			stateRef.current.color = value;
			stateRef.current.hsv = rgbToHsv(value);

			if (callbacks?.onColorChange) {
				const colorString = rgbToString(value);
				callbacks.onColorChange(colorString);
			}

			store.notify();
		},
		setHsv: (value: HSVColorValue) => {
			if (!stateRef.current) return;
			if (hsvValuesEqual(stateRef.current.hsv, value)) return;

			stateRef.current.hsv = value;
			stateRef.current.color = hsvToRgb(value);

			if (callbacks?.onColorChange) {
				const colorString = rgbToString(stateRef.current.color);
				callbacks.onColorChange(colorString);
			}

			store.notify();
		},
		syncColor: (value: ColorValue) => {
			if (!stateRef.current) return;
			if (colorValuesEqual(stateRef.current.color, value)) return;

			stateRef.current.color = value;
			stateRef.current.hsv = rgbToHsv(value);
			store.notify();
		},
		setOpen: (value: boolean) => {
			if (!stateRef.current) return;
			if (Object.is(stateRef.current.open, value)) return;

			stateRef.current.open = value;

			if (callbacks?.onOpenChange) {
				callbacks.onOpenChange(value);
			}

			store.notify();
		},
		notify: () => {
			if (listenersRef.current) {
				for (const cb of listenersRef.current) {
					cb();
				}
			}
		},
	};

	return store;
}

function useColorPickerStoreContext(consumerName: string) {
	const context = React.useContext(ColorPickerStoreContext);
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`ColorPickerRoot\``);
	}
	return context;
}

function useColorPickerStore<U>(selector: (state: ColorPickerStoreState) => U): U {
	const store = useColorPickerStoreContext("useColorPickerStoreSelector");

	const getSnapshot = React.useCallback(() => selector(store.getState()), [store, selector]);

	return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

interface ColorPickerContextValue {
	dir: Direction;
	disabled?: boolean;
	readOnly?: boolean;
	required?: boolean;
}

const ColorPickerStoreContext = React.createContext<ColorPickerStore | null>(null);
const ColorPickerContext = React.createContext<ColorPickerContextValue | null>(null);

function useColorPickerContext(consumerName: string) {
	const context = React.useContext(ColorPickerContext);
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`ColorPickerRoot\``);
	}
	return context;
}

interface ColorPickerRootProps
	extends Omit<React.ComponentProps<"div">, "onValueChange">,
		Pick<React.ComponentProps<typeof Popover>, "defaultOpen" | "open" | "onOpenChange" | "modal"> {
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	dir?: Direction;
	name?: string;
	asChild?: boolean;
	disabled?: boolean;
	readOnly?: boolean;
	required?: boolean;
}

function ColorPickerRoot(props: ColorPickerRootProps) {
	const {
		value: valueProp,
		defaultValue = "rgb(0, 0, 0)",
		onValueChange,
		defaultOpen,
		open: openProp,
		onOpenChange,
		name,
		disabled,
		readOnly,
		required,
		...rootProps
	} = props;

	const initialColor = React.useMemo(() => {
		const colorString = valueProp ?? defaultValue;
		const parsed = parseRgbString(colorString);
		const color = parsed ?? { r: 0, g: 0, b: 0, a: 1 };

		return {
			color,
			hsv: rgbToHsv(color),
			open: openProp ?? defaultOpen ?? false,
		};
	}, [valueProp, defaultValue, openProp, defaultOpen]);

	const stateRef = useLazyRef(() => initialColor);
	const listenersRef = useLazyRef(() => new Set<() => void>());

	const storeCallbacks = React.useMemo<ColorPickerStoreCallbacks>(
		() => ({
			onColorChange: onValueChange,
			onOpenChange: onOpenChange,
		}),
		[onValueChange, onOpenChange],
	);

	const store = React.useMemo(
		() => createColorPickerStore(listenersRef, stateRef, storeCallbacks),
		[listenersRef, stateRef, storeCallbacks],
	);

	return (
		<ColorPickerStoreContext.Provider value={store}>
			<ColorPickerRootImpl
				{...rootProps}
				value={valueProp}
				defaultOpen={defaultOpen}
				open={openProp}
				onOpenChange={onOpenChange}
				name={name}
				disabled={disabled}
				readOnly={readOnly}
				required={required}
			/>
		</ColorPickerStoreContext.Provider>
	);
}

interface ColorPickerRootImplProps extends Omit<ColorPickerRootProps, "defaultValue" | "onValueChange"> {}

function ColorPickerRootImpl(props: ColorPickerRootImplProps) {
	const {
		value: valueProp,
		dir: dirProp,
		defaultOpen,
		open: openProp,
		onOpenChange,
		name,
		ref,
		asChild,
		disabled,
		modal,
		readOnly,
		required,
		...rootProps
	} = props;

	const store = useColorPickerStoreContext("ColorPickerRootImpl");

	const dir = useDirection(dirProp);

	const [formTrigger, setFormTrigger] = React.useState<HTMLDivElement | null>(null);
	const composedRef = useComposedRefs(ref, (node) => setFormTrigger(node));

	const isFormControl = formTrigger ? !!formTrigger.closest("form") : true;

	React.useEffect(() => {
		if (valueProp !== undefined) {
			const parsed = parseRgbString(valueProp);
			if (parsed) {
				const currentState = store.getState();
				const color = { ...parsed, a: parsed.a ?? currentState.color.a };
				store.syncColor(color);
			}
		}
	}, [valueProp, store]);

	React.useEffect(() => {
		if (openProp !== undefined) {
			store.setOpen(openProp);
		}
	}, [openProp, store]);

	const contextValue = React.useMemo<ColorPickerContextValue>(
		() => ({
			dir,
			disabled,
			readOnly,
			required,
		}),
		[dir, disabled, readOnly, required],
	);

	const value = useColorPickerStore((state) => rgbToString(state.color));

	const open = useColorPickerStore((state) => state.open);

	const onPopoverOpenChange = React.useCallback(
		(newOpen: boolean) => {
			store.setOpen(newOpen);
			onOpenChange?.(newOpen);
		},
		[store, onOpenChange],
	);

	const RootPrimitive = asChild ? SlotPrimitive.Slot : "div";

	return (
		<ColorPickerContext.Provider value={contextValue}>
			<Popover defaultOpen={defaultOpen} open={open} onOpenChange={onPopoverOpenChange} modal={modal}>
				<RootPrimitive {...rootProps} ref={composedRef} />
				{isFormControl && (
					<VisuallyHiddenInput
						type="hidden"
						name={name}
						value={value}
						disabled={disabled}
						readOnly={readOnly}
						required={required}
						control={formTrigger}
					/>
				)}
			</Popover>
		</ColorPickerContext.Provider>
	);
}

interface ColorPickerTriggerProps extends React.ComponentProps<typeof PopoverTrigger> {}

function ColorPickerTrigger(props: ColorPickerTriggerProps) {
	const { asChild, ...triggerProps } = props;
	const context = useColorPickerContext("ColorPickerTrigger");

	const TriggerPrimitive = asChild ? SlotPrimitive.Slot : PopoverTrigger;

	return (
		<PopoverTrigger asChild disabled={context.disabled}>
			<TriggerPrimitive data-slot="color-picker-trigger" {...triggerProps} />
		</PopoverTrigger>
	);
}

interface ColorPickerContentProps extends React.ComponentProps<typeof PopoverContent> {}

function ColorPickerContent(props: ColorPickerContentProps) {
	const { asChild, className, children, ...popoverContentProps } = props;

	return (
		<PopoverContent
			data-slot="color-picker-content"
			asChild={asChild}
			{...popoverContentProps}
			className={cn("flex w-[340px] flex-col gap-4 p-4", className)}
		>
			{children}
		</PopoverContent>
	);
}

interface ColorPickerSwatchProps extends React.ComponentProps<"div"> {
	asChild?: boolean;
}

function ColorPickerSwatch(props: ColorPickerSwatchProps) {
	const { asChild, className, ...swatchProps } = props;
	const context = useColorPickerContext("ColorPickerSwatch");

	const color = useColorPickerStore((state) => state.color);

	const backgroundStyle = React.useMemo(() => {
		if (!color) {
			return {
				background:
					"linear-gradient(to bottom right, transparent calc(50% - 1px), hsl(var(--destructive)) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) no-repeat",
			};
		}

		const colorString = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;

		if (color.a < 1) {
			return {
				background: `linear-gradient(${colorString}, ${colorString}), repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0% 50% / 8px 8px`,
			};
		}

		return {
			backgroundColor: colorString,
		};
	}, [color]);

	const ariaLabel = !color ? "No color selected" : `Current color: ${rgbToString(color)}`;

	const SwatchPrimitive = asChild ? SlotPrimitive.Slot : "div";

	return (
		<div className="flex size-9 items-center justify-start">
			<SwatchPrimitive
				{...swatchProps}
				role="img"
				aria-label={ariaLabel}
				data-slot="color-picker-swatch"
				className={cn("box-border size-7 rounded-md border", context.disabled && "opacity-50", className)}
				style={{
					...backgroundStyle,
					forcedColorAdjust: "none",
				}}
			/>
		</div>
	);
}

interface ColorPickerAreaProps extends React.ComponentProps<"div"> {
	asChild?: boolean;
}

function ColorPickerArea(props: ColorPickerAreaProps) {
	const { asChild, className, ref, ...areaProps } = props;
	const context = useColorPickerContext("ColorPickerArea");
	const store = useColorPickerStoreContext("ColorPickerArea");

	const hsv = useColorPickerStore((state) => state.hsv);

	const isDraggingRef = React.useRef(false);
	const areaRef = React.useRef<HTMLDivElement>(null);
	const composedRef = useComposedRefs(ref, areaRef);

	const updateColorFromPosition = React.useCallback(
		(clientX: number, clientY: number) => {
			if (!areaRef.current) return;

			const rect = areaRef.current.getBoundingClientRect();
			const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
			const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));

			const newHsv: HSVColorValue = {
				h: hsv?.h ?? 0,
				s: Math.round(x * 100),
				v: Math.round(y * 100),
				a: hsv?.a ?? 1,
			};

			store.setHsv(newHsv);
		},
		[hsv, store],
	);

	const onPointerDown = React.useCallback(
		(event: React.PointerEvent) => {
			if (context.disabled) return;

			isDraggingRef.current = true;
			areaRef.current?.setPointerCapture(event.pointerId);
			updateColorFromPosition(event.clientX, event.clientY);
		},
		[context.disabled, updateColorFromPosition],
	);

	const onPointerMove = React.useCallback(
		(event: React.PointerEvent) => {
			if (isDraggingRef.current) {
				updateColorFromPosition(event.clientX, event.clientY);
			}
		},
		[updateColorFromPosition],
	);

	const onPointerUp = React.useCallback((event: React.PointerEvent) => {
		isDraggingRef.current = false;
		areaRef.current?.releasePointerCapture(event.pointerId);
	}, []);

	const hue = hsv?.h ?? 0;
	const backgroundHue = hsvToRgb({ h: hue, s: 100, v: 100, a: 1 });

	const AreaPrimitive = asChild ? SlotPrimitive.Slot : "div";

	return (
		<AreaPrimitive
			data-slot="color-picker-area"
			{...areaProps}
			className={cn(
				"relative h-40 w-full cursor-crosshair touch-none rounded-md border",
				context.disabled && "pointer-events-none opacity-50",
				className,
			)}
			ref={composedRef}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
		>
			<div className="absolute inset-0 overflow-hidden rounded-md">
				<div
					className="absolute inset-0"
					style={{
						backgroundColor: `rgb(${backgroundHue.r}, ${backgroundHue.g}, ${backgroundHue.b})`,
					}}
				/>
				<div
					className="absolute inset-0"
					style={{
						background: "linear-gradient(to right, #fff, transparent)",
					}}
				/>
				<div
					className="absolute inset-0"
					style={{
						background: "linear-gradient(to bottom, transparent, #000)",
					}}
				/>
			</div>
			<div
				className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
				style={{
					left: `${hsv?.s ?? 0}%`,
					top: `${100 - (hsv?.v ?? 0)}%`,
				}}
			/>
		</AreaPrimitive>
	);
}

interface ColorPickerHueSliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {}

function ColorPickerHueSlider(props: ColorPickerHueSliderProps) {
	const { className, ...sliderProps } = props;
	const context = useColorPickerContext("ColorPickerHueSlider");
	const store = useColorPickerStoreContext("ColorPickerHueSlider");

	const hsv = useColorPickerStore((state) => state.hsv);

	const onValueChange = React.useCallback(
		(values: number[]) => {
			const newHsv: HSVColorValue = {
				h: values[0] ?? 0,
				s: hsv?.s ?? 0,
				v: hsv?.v ?? 0,
				a: hsv?.a ?? 1,
			};
			store.setHsv(newHsv);
		},
		[hsv, store],
	);

	return (
		<SliderPrimitive.Root
			data-slot="color-picker-hue-slider"
			{...sliderProps}
			max={360}
			step={1}
			className={cn("relative flex w-full touch-none select-none items-center", className)}
			value={[hsv?.h ?? 0]}
			onValueChange={onValueChange}
			disabled={context.disabled}
		>
			<SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-[linear-gradient(to_right,#ff0000_0%,#ffff00_16.66%,#00ff00_33.33%,#00ffff_50%,#0000ff_66.66%,#ff00ff_83.33%,#ff0000_100%)]">
				<SliderPrimitive.Range className="absolute h-full" />
			</SliderPrimitive.Track>
			<SliderPrimitive.Thumb className="block size-4 rounded-full border border-primary/50 bg-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
		</SliderPrimitive.Root>
	);
}

type ColorPickerEyeDropperProps = React.ComponentProps<typeof Button>;

function ColorPickerEyeDropper(props: ColorPickerEyeDropperProps) {
	const { children, size, ...buttonProps } = props;
	const context = useColorPickerContext("ColorPickerEyeDropper");
	const store = useColorPickerStoreContext("ColorPickerEyeDropper");

	const color = useColorPickerStore((state) => state.color);

	const onEyeDropper = React.useCallback(async () => {
		if (!window.EyeDropper) return;

		try {
			const eyeDropper = new window.EyeDropper();
			const result = await eyeDropper.open();

			if (result.sRGBHex) {
				const currentAlpha = color?.a ?? 1;
				const newColor = hexToRgb(result.sRGBHex, currentAlpha);
				store.setColor(newColor);
			}
		} catch (error) {
			console.warn("EyeDropper error:", error);
		}
	}, [color, store]);

	const hasEyeDropper = typeof window !== "undefined" && !!window.EyeDropper;

	if (!hasEyeDropper) return null;

	const buttonSize = size ?? (children ? "default" : "icon");

	return (
		<Button
			data-slot="color-picker-eye-dropper"
			{...buttonProps}
			variant="outline"
			size={buttonSize}
			onClick={onEyeDropper}
			disabled={context.disabled}
		>
			{children ?? <EyedropperIcon />}
		</Button>
	);
}

interface ColorPickerAlphaSliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {}

function ColorPickerAlphaSlider(props: ColorPickerAlphaSliderProps) {
	const { className, ...sliderProps } = props;
	const context = useColorPickerContext("ColorPickerAlphaSlider");
	const store = useColorPickerStoreContext("ColorPickerAlphaSlider");

	const color = useColorPickerStore((state) => state.color);

	const onValueChange = React.useCallback(
		(values: number[]) => {
			const alpha = (values[0] ?? 0) / 100;
			const newColor = { ...color, a: alpha };
			store.setColor(newColor);
		},
		[color, store],
	);

	const gradientColor = `rgb(${color?.r ?? 0}, ${color?.g ?? 0}, ${color?.b ?? 0})`;

	return (
		<SliderPrimitive.Root
			data-slot="color-picker-alpha-slider"
			{...sliderProps}
			max={100}
			step={1}
			disabled={context.disabled}
			className={cn("relative flex w-full touch-none select-none items-center", className)}
			value={[Math.round((color?.a ?? 1) * 100)]}
			onValueChange={onValueChange}
		>
			<SliderPrimitive.Track
				className="relative h-3 w-full grow overflow-hidden rounded-full"
				style={{
					background:
						"linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
					backgroundSize: "8px 8px",
					backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
				}}
			>
				<div
					className="absolute inset-0 rounded-full"
					style={{
						background: `linear-gradient(to right, transparent, ${gradientColor})`,
					}}
				/>
				<SliderPrimitive.Range className="absolute h-full" />
			</SliderPrimitive.Track>
			<SliderPrimitive.Thumb className="block size-4 rounded-full border border-primary/50 bg-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
		</SliderPrimitive.Root>
	);
}

interface ColorPickerInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> {
	withoutAlpha?: boolean;
}

function ColorPickerInput(props: ColorPickerInputProps) {
	const context = useColorPickerContext("ColorPickerInput");
	const store = useColorPickerStoreContext("ColorPickerInput");

	const color = useColorPickerStore((state) => state.color);

	const onChannelChange = React.useCallback(
		(channel: "r" | "g" | "b" | "a", max: number, isAlpha = false) =>
			(event: React.ChangeEvent<HTMLInputElement>) => {
				const value = Number.parseInt(event.target.value, 10);
				if (!Number.isNaN(value) && value >= 0 && value <= max) {
					const newValue = isAlpha ? value / 100 : value;
					const newColor = { ...color, [channel]: newValue };
					store.setColor(newColor);
				}
			},
		[color, store],
	);

	const rValue = Math.round(color?.r ?? 0);
	const gValue = Math.round(color?.g ?? 0);
	const bValue = Math.round(color?.b ?? 0);
	const alphaValue = Math.round((color?.a ?? 1) * 100);

	return (
		<div data-slot="color-picker-input-wrapper" className="flex items-center gap-2">
			<span>R</span>
			<Input
				type="number"
				aria-label="Red color component (0-255)"
				placeholder="0"
				inputMode="numeric"
				pattern="[0-9]*"
				min="0"
				max="255"
				className="flex-1 shrink-0"
				value={rValue}
				onChange={onChannelChange("r", 255)}
				disabled={context.disabled}
			/>
			<span>G</span>
			<Input
				type="number"
				aria-label="Green color component (0-255)"
				placeholder="0"
				inputMode="numeric"
				pattern="[0-9]*"
				min="0"
				max="255"
				className="flex-1 shrink-0"
				value={gValue}
				onChange={onChannelChange("g", 255)}
				disabled={context.disabled}
			/>
			<span>B</span>
			<Input
				type="number"
				aria-label="Blue color component (0-255)"
				placeholder="0"
				inputMode="numeric"
				pattern="[0-9]*"
				min="0"
				max="255"
				className="flex-1 shrink-0"
				value={bValue}
				onChange={onChannelChange("b", 255)}
				disabled={context.disabled}
			/>
			{!props.withoutAlpha && (
				<>
					<span>A</span>
					<Input
						type="number"
						aria-label="Alpha transparency percentage"
						placeholder="100"
						inputMode="numeric"
						pattern="[0-9]*"
						min="0"
						max="100"
						className="flex-1 shrink-0"
						value={alphaValue}
						onChange={onChannelChange("a", 100, true)}
						disabled={context.disabled}
					/>
				</>
			)}
		</div>
	);
}

type ColorPickerProps = Omit<React.ComponentProps<typeof ColorPickerRoot>, never>;

const ColorPicker = (props: ColorPickerProps) => {
	return (
		<ColorPickerRoot {...props}>
			<ColorPickerTrigger asChild>
				<ColorPickerSwatch />
			</ColorPickerTrigger>
			<ColorPickerContent>
				<ColorPickerArea />
				<div className="flex items-center gap-4">
					<ColorPickerEyeDropper />
					<div className="flex flex-1 flex-col gap-4">
						<ColorPickerHueSlider />
						<ColorPickerAlphaSlider />
					</div>
				</div>
				<ColorPickerInput />
			</ColorPickerContent>
		</ColorPickerRoot>
	);
};

export {
	ColorPicker,
	//
	ColorPickerRoot,
	ColorPickerTrigger,
	ColorPickerContent,
	ColorPickerArea,
	ColorPickerHueSlider,
	ColorPickerAlphaSlider,
	ColorPickerSwatch,
	ColorPickerEyeDropper,
	ColorPickerInput,
	//
	ColorPickerRoot as Root,
	ColorPickerTrigger as Trigger,
	ColorPickerContent as Content,
	ColorPickerArea as Area,
	ColorPickerHueSlider as HueSlider,
	ColorPickerAlphaSlider as AlphaSlider,
	ColorPickerSwatch as Swatch,
	ColorPickerEyeDropper as EyeDropper,
	ColorPickerInput as Input,
};
