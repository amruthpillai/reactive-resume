import { type ColorResult, hsvaToRgbaString, rgbaStringToHsva } from "@uiw/color-convert";
import ReactColorColorful from "@uiw/react-color-colorful";
import { useMemo } from "react";
import { useControlledState } from "@/hooks/use-controlled-state";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

type ColorPickerProps = {
	value?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
};

export function ColorPicker({ value, defaultValue, onChange }: ColorPickerProps) {
	const [currentValue, setCurrentValue] = useControlledState<string>({
		value,
		defaultValue,
		onChange,
	});

	const color = useMemo(() => rgbaStringToHsva(currentValue), [currentValue]);

	function onColorChange(color: ColorResult) {
		const rgbaString = hsvaToRgbaString(color.hsva);
		setCurrentValue(rgbaString);
	}

	return (
		<Popover>
			<PopoverTrigger>
				<div
					className="size-6 shrink-0 cursor-pointer rounded-full border border-foreground transition-opacity hover:opacity-60"
					style={{ backgroundColor: currentValue }}
				/>
			</PopoverTrigger>

			<PopoverContent className="max-w-fit rounded-xl p-2">
				<ReactColorColorful color={color} onChange={onColorChange} />
			</PopoverContent>
		</Popover>
	);
}
