import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { CommandItem } from "@reactive-resume/ui/components/command";
import { changeLocale, localeMap } from "@/libs/locale";
import { BaseCommandGroup } from "../base";

export function LanguageCommandPage() {
	const { i18n } = useLingui();

	return (
		<BaseCommandGroup page="language" heading={<Trans>Language</Trans>}>
			{Object.entries(localeMap).map(([value, label]) => (
				<CommandItem key={value} onSelect={() => changeLocale(value)}>
					<span className="font-mono text-muted-foreground text-xs">{value}</span>
					{i18n.t(label)}
				</CommandItem>
			))}
		</BaseCommandGroup>
	);
}
