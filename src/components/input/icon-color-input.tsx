import { ColorPicker } from "./color-picker";

const iconColorPresets = [
  "rgba(0, 0, 0, 1)",
  "rgba(69, 85, 108, 1)",
  "rgba(231, 0, 11, 1)",
  "rgba(245, 73, 0, 1)",
  "rgba(208, 135, 0, 1)",
  "rgba(94, 165, 0, 1)",
  "rgba(0, 153, 102, 1)",
  "rgba(0, 146, 184, 1)",
  "rgba(21, 93, 252, 1)",
  "rgba(79, 57, 246, 1)",
  "rgba(127, 34, 254, 1)",
  "rgba(230, 0, 118, 1)",
] as const;

type IconColorInputProps = {
  value?: string;
  onChange: (value: string) => void;
};

export function IconColorInput({ value, onChange }: IconColorInputProps) {
  return (
    <div className="flex h-9 items-center border-y border-e border-input bg-background px-2">
      <ColorPicker value={value || "rgba(0, 0, 0, 1)"} presetColors={iconColorPresets} onChange={onChange} />
    </div>
  );
}
