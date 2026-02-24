import { PaletteIcon } from "@phosphor-icons/react";
import { CommandItem } from "@/components/ui/command";
import { useCommandPaletteStore } from "../../store";
import { BaseCommandGroup } from "../base";
import { ThemeCommandPage } from "./theme";

export function PreferencesCommandGroup() {
	const pushPage = useCommandPaletteStore((state) => state.pushPage);

	return (
		<>
			<BaseCommandGroup heading="Preferences">
				<CommandItem onSelect={() => pushPage("theme")}>
					<PaletteIcon />
					Change theme to...
				</CommandItem>
			</BaseCommandGroup>

			<ThemeCommandPage />
		</>
	);
}
