import { useMemo } from "react";
import { match } from "ts-pattern";
import type z from "zod";
import { levelDesignSchema } from "@/schema/resume/data";
import { Combobox, type ComboboxProps } from "../ui/combobox";

type LevelType = z.infer<typeof levelDesignSchema>["type"];

type LevelTypeComboboxProps = Omit<ComboboxProps, "options">;

export const getLevelTypeName = (type: LevelType) => {
	return match(type)
		.with("hidden", () => "Hidden")
		.with("circle", () => "Circle")
		.with("square", () => "Square")
		.with("rectangle", () => "Rectangle")
		.with("rectangle-full", () => "Rectangle (Full Width)")
		.with("progress-bar", () => "Progress Bar")
		.with("icon", () => "Icon")
		.exhaustive();
};

export function LevelTypeCombobox({ ...props }: LevelTypeComboboxProps) {
	const options = useMemo(() => {
		return levelDesignSchema.shape.type.options.map((option) => ({
			value: option,
			label: getLevelTypeName(option),
		}));
	}, []);

	return <Combobox options={options} {...props} />;
}
