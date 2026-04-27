import { type ColorResult, hsvaToRgbaString, rgbaStringToHsva } from "@uiw/color-convert";
import ReactColorColorful from "@uiw/react-color-colorful";
import { useMemo } from "react";

import { useControlledState } from "@/hooks/use-controlled-state";

import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

type ColorPickerProps = {
  value?: string;
  defaultValue?: string;
  presetColors?: readonly string[];
  onChange?: (value: string) => void;
};

export function ColorPicker({ value, defaultValue, presetColors = [], onChange }: ColorPickerProps) {
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

  const hasPresetColors = presetColors.length > 0;

  return (
    <Popover>
      <PopoverTrigger>
        <div
          className="size-6 shrink-0 cursor-pointer rounded-full border border-foreground transition-opacity hover:opacity-60"
          style={{ backgroundColor: currentValue }}
        />
      </PopoverTrigger>

      <PopoverContent className={hasPresetColors ? "w-64 rounded-md p-2" : "max-w-fit rounded-md p-2"}>
        {hasPresetColors && (
          <div className="mb-2 grid grid-cols-8 gap-2 rounded-md bg-muted/40 p-2">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                className="size-5 rounded-full border border-border shadow-xs transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden"
                style={{ backgroundColor: color }}
                title={color}
                aria-label={color}
                onClick={() => setCurrentValue(color)}
              />
            ))}
          </div>
        )}

        <ReactColorColorful color={color} onChange={onColorChange} />
      </PopoverContent>
    </Popover>
  );
}
