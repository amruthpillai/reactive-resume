import { Trans } from "@lingui/react/macro";
import { PaletteIcon, TranslateIcon } from "@phosphor-icons/react";

import { CommandItem } from "@/components/ui/command";

import { useCommandPaletteStore } from "../../store";
import { BaseCommandGroup } from "../base";
import { LanguageCommandPage } from "./language";
import { ThemeCommandPage } from "./theme";

export function PreferencesCommandGroup() {
	const pushPage = useCommandPaletteStore((state) => state.pushPage);

	return (
		<>
			<BaseCommandGroup heading={<Trans>Preferences</Trans>}>
				<CommandItem onSelect={() => pushPage("theme")}>
					<PaletteIcon />
					<Trans>Change theme to...</Trans>
				</CommandItem>

				<CommandItem onSelect={() => pushPage("language")}>
					<TranslateIcon />
					<Trans>Change language to...</Trans>
				</CommandItem>
			</BaseCommandGroup>

			<ThemeCommandPage />
			<LanguageCommandPage />
		</>
	);
}
