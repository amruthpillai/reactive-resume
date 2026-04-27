import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { type ColorResult, hsvaToRgbaString, rgbaStringToHsva } from "@uiw/color-convert";
import ReactColorColorful from "@uiw/react-color-colorful";
import { useMemo } from "react";

import { useControlledState } from "@/hooks/use-controlled-state";
import { cn } from "@/utils/style";

import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Separator } from "../ui/separator";

const presetColors = [
  "rgba(0, 0, 0, 1)",
  "rgba(231, 0, 11, 1)",
  "rgba(245, 73, 0, 1)",
  "rgba(225, 113, 0, 1)",
  "rgba(208, 135, 0, 1)",
  "rgba(94, 165, 0, 1)",
  "rgba(0, 166, 62, 1)",
  "rgba(0, 153, 102, 1)",
  "rgba(0, 146, 184, 1)",
  "rgba(0, 132, 209, 1)",
  "rgba(21, 93, 252, 1)",
  "rgba(79, 57, 246, 1)",
  "rgba(127, 34, 254, 1)",
  "rgba(200, 0, 222, 1)",
  "rgba(230, 0, 118, 1)",
  "rgba(69, 85, 108, 1)",
] as const;

type ColorPickerProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  trigger?: React.ReactNode;
  children?: React.ReactNode;
};

export function ColorPicker({ value, defaultValue, onChange, trigger, children }: ColorPickerProps) {
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
      {trigger ?? (
        <PopoverTrigger>
          <div
            className="size-6 shrink-0 cursor-pointer rounded-full border border-foreground/60 transition-all hover:scale-105 focus-visible:outline-hidden"
            style={{ backgroundColor: currentValue }}
          />
        </PopoverTrigger>
      )}

      <PopoverContent align="start" className="min-w-xs">
        {children && (
          <>
            {children}
            <Separator />
          </>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            <Trans>Presets</Trans>
          </span>

          <div className="grid grid-cols-8 gap-3 rounded bg-muted p-3">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                style={{ backgroundColor: color }}
                aria-label={t`Use color ${color}`}
                aria-pressed={currentValue === color}
                onClick={() => setCurrentValue(color)}
                className={cn(
                  "size-5 shrink-0 cursor-pointer rounded-full transition-all hover:scale-105 focus-visible:outline-hidden",
                  currentValue === color && "border border-foreground/60",
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            <Trans>Custom</Trans>
          </span>

          <div className="rounded bg-muted p-3 *:w-full! [&_.w-color-alpha]:mt-4! [&_.w-color-alpha]:h-4! [&_.w-color-alpha>div]:rounded-full! [&_.w-color-hue]:mt-4! [&_.w-color-hue]:h-4! [&_.w-color-hue]:rounded-full! [&_.w-color-saturation]:h-36! [&_.w-color-saturation]:rounded-[calc(var(--radius-lg)-0.25rem)]!">
            <ReactColorColorful color={color} onChange={onColorChange} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
