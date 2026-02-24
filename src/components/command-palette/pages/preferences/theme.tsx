import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "@/components/theme/provider";
import { CommandItem } from "@/components/ui/command";
import { useCommandPaletteStore } from "../../store";
import { BaseCommandGroup } from "../base";

export function ThemeCommandPage() {
	const { setTheme } = useTheme();
	const setOpen = useCommandPaletteStore((state) => state.setOpen);

	const handleThemeChange = (theme: "light" | "dark") => {
		setTheme(theme, { playSound: false });
		setOpen(false);
	};

	return (
		<BaseCommandGroup page="theme" heading={Theme}>
			<CommandItem value="light" onSelect={() => handleThemeChange("light")}>
				<SunIcon />
				Light theme
			</CommandItem>

			<CommandItem value="dark" onSelect={() => handleThemeChange("dark")}>
				<MoonIcon />
				Dark theme
			</CommandItem>
		</BaseCommandGroup>
	);
}
