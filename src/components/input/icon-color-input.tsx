import { ColorPicker } from "./color-picker";

type IconColorInputProps = {
  value?: string;
  onChange: (value: string) => void;
};

export function IconColorInput({ value, onChange }: IconColorInputProps) {
  return (
    <div className="flex h-9 items-center border-y border-e border-input bg-background px-2">
      <ColorPicker value={value || "rgba(0, 0, 0, 1)"} onChange={onChange} />
    </div>
  );
}
