import { Trans } from "@lingui/react/macro";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { CommandItem } from "@reactive-resume/ui/components/command";
import { useTheme } from "@/components/theme/provider";
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
		<BaseCommandGroup page="theme" heading={<Trans>Theme</Trans>}>
			<CommandItem value="light" onSelect={() => handleThemeChange("light")}>
				<SunIcon />
				<Trans>Light theme</Trans>
			</CommandItem>

			<CommandItem value="dark" onSelect={() => handleThemeChange("dark")}>
				<MoonIcon />
				<Trans>Dark theme</Trans>
			</CommandItem>
		</BaseCommandGroup>
	);
}
