import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { useFormControl } from "@reactive-resume/ui/components/form";
import { cn } from "@reactive-resume/utils/style";

const THUMB_POSITION_KEYS = ["single", "start", "end"] as const;

function Slider({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	// Inside FormControl the generated id belongs to the real control
	// (input[type=range]) that syncThumbInput applies it to — repeating it here
	// would duplicate the id on the wrapper div. Standalone usage has no
	// FormControl context, so an explicit caller id must survive there.
	id: idProp,
	"aria-labelledby": ariaLabelledBy,
	"aria-describedby": ariaDescribedBy,
	"aria-invalid": ariaInvalid,
	...props
}: SliderPrimitive.Root.Props) {
	const { id: controlId, labelId } = useFormControl();
	const id = controlId == null ? idProp : undefined;

	const _values = Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max];
	const thumbDescriptors = _values.map((thumbValue, position) => ({
		key:
			_values.length === 1
				? THUMB_POSITION_KEYS[0]
				: (THUMB_POSITION_KEYS[position + 1] ?? `thumb-${position}-${thumbValue}`),
	}));

	// Base UI owns the accessible control (input[type=range]): it renders the input from a
	// fixed prop list, generates the input's id internally, and only applies aria-invalid
	// through its own Field validation context. Bridge FormControl's generated id and error
	// state onto the input via inputRef. A range slider renders one input per thumb, so only
	// a single-thumb slider may claim the id — the rule Base UI applies to its own ids too.
	const ownsControlId = controlId != null && _values.length === 1;
	const syncThumbInput = (input: HTMLInputElement | null) => {
		if (!input) return;
		if (ariaInvalid == null) {
			input.removeAttribute("aria-invalid");
		} else {
			input.setAttribute("aria-invalid", String(ariaInvalid));
		}
		if (ownsControlId) input.id = controlId;
	};

	return (
		<SliderPrimitive.Root
			className={cn("data-vertical:h-full data-horizontal:w-full", className)}
			id={id}
			defaultValue={defaultValue}
			value={value}
			min={min}
			max={max}
			thumbAlignment="edge"
			data-slot="slider"
			aria-labelledby={ariaLabelledBy ?? labelId}
			{...props}
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
						inputRef={syncThumbInput}
						className="relative block size-3 shrink-0 select-none rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] after:absolute after:-inset-2 hover:ring-3 focus-visible:outline-hidden focus-visible:ring-3 active:ring-3 disabled:pointer-events-none disabled:opacity-50"
					/>
				))}
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	);
}

export { Slider };
