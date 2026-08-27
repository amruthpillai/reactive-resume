import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@reactive-resume/utils/style";

const THUMB_POSITION_KEYS = ["single", "start", "end"] as const;

function Slider({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	id: _id,
	"aria-describedby": ariaDescribedBy,
	"aria-invalid": _ariaInvalid,
	...props
}: SliderPrimitive.Root.Props) {
	const _values = Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max];
	const thumbDescriptors = _values.map((thumbValue, position) => ({
		key:
			_values.length === 1
				? THUMB_POSITION_KEYS[0]
				: (THUMB_POSITION_KEYS[position + 1] ?? `thumb-${position}-${thumbValue}`),
	}));

	return (
		<SliderPrimitive.Root
			className={cn("data-vertical:h-full data-horizontal:w-full", className)}
			defaultValue={defaultValue}
			value={value}
			min={min}
			max={max}
			thumbAlignment="edge"
			{...props}
			data-slot="slider"
		>
			<SliderPrimitive.Control className="relative flex w-full touch-none select-none items-center data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col data-disabled:opacity-50">
				<SliderPrimitive.Track
					data-slot="slider-track"
					className="relative grow select-none overflow-hidden rounded-full bg-muted data-horizontal:h-1 data-vertical:h-full data-horizontal:w-full data-vertical:w-1"
				>
					<SliderPrimitive.Indicator
						data-slot="slider-range"
						className="select-none bg-primary data-horizontal:h-full data-vertical:w-full"
					/>
				</SliderPrimitive.Track>
				{thumbDescriptors.map((thumb) => (
					<SliderPrimitive.Thumb
						data-slot="slider-thumb"
						key={thumb.key}
						aria-describedby={ariaDescribedBy}
						className="relative block size-3 shrink-0 select-none rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] after:absolute after:-inset-2 hover:ring-3 focus-visible:outline-hidden focus-visible:ring-3 active:ring-3 disabled:pointer-events-none disabled:opacity-50"
					/>
				))}
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	);
}

export { Slider };
