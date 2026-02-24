import { useRouter } from "@tanstack/react-router";
import { isTheme, setThemeServerFn, themeMap } from "@/utils/theme";
import { Combobox, type ComboboxProps } from "../ui/combobox";
import { useTheme } from "./provider";

type Props = Omit<ComboboxProps, "options" | "value" | "onValueChange">;

export function ThemeCombobox(props: Props) {
	const router = useRouter();
	const { theme, setTheme } = useTheme();

	const options = Object.entries(themeMap).map(([value, label]) => ({
		value,
		label: label,
		keywords: [label],
	}));

	const onThemeChange = async (value: string | null) => {
		if (!value || !isTheme(value)) return;
		await setThemeServerFn({ data: value });
		setTheme(value);
		router.invalidate();
	};

	return <Combobox options={options} defaultValue={theme} onValueChange={onThemeChange} {...props} />;
}
