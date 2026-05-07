import type z from "zod";
import type { SingleComboboxProps } from "@/components/ui/combobox";
import { t } from "@lingui/core/macro";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { levelDesignSchema } from "@reactive-resume/schema/resume/data";
import { Combobox } from "@/components/ui/combobox";

type LevelType = z.infer<typeof levelDesignSchema>["type"];

type LevelTypeComboboxProps = Omit<SingleComboboxProps, "options">;

const getLevelTypeName = (type: LevelType) => {
	return match(type)
		.with("hidden", () => t`Hidden`)
		.with("circle", () => t`Circle`)
		.with("square", () => t`Square`)
		.with("rectangle", () => t`Rectangle`)
		.with("rectangle-full", () => t`Rectangle (Full Width)`)
		.with("progress-bar", () => t`Progress Bar`)
		.with("icon", () => t`Icon`)
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
