import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
	GearIcon,
	HouseSimpleIcon,
	KeyIcon,
	OpenAiLogoIcon,
	ReadCvLogoIcon,
	ShieldCheckIcon,
	UserCircleIcon,
	WarningIcon,
} from "@phosphor-icons/react";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { CommandItem } from "@reactive-resume/ui/components/command";
import { useCommandPaletteStore } from "../store";
import { BaseCommandGroup } from "./base";

export function NavigationCommandGroup() {
	const navigate = useNavigate();
	const { session } = useRouteContext({ strict: false });
	const reset = useCommandPaletteStore((state) => state.reset);
	const pushPage = useCommandPaletteStore((state) => state.pushPage);

	const onNavigate = async (path: string) => {
		await navigate({ to: path });
		reset();
	};

	return (
		<>
			<BaseCommandGroup heading={<Trans>Go to...</Trans>}>
				<CommandItem keywords={[t`Home`]} value="navigation.home" onSelect={() => onNavigate("/")}>
					<HouseSimpleIcon />
					<Trans>Home</Trans>
				</CommandItem>

				<CommandItem
					disabled={!session}
					keywords={[t`Resumes`]}
					value="navigation.resumes"
					onSelect={() => onNavigate("/dashboard/resumes")}
				>
					<ReadCvLogoIcon />
					<Trans>Resumes</Trans>
				</CommandItem>

				<CommandItem
					disabled={!session}
					keywords={[t`Settings`]}
					value="navigation.settings"
					onSelect={() => pushPage("settings")}
				>
					<GearIcon />
					<Trans>Settings</Trans>
				</CommandItem>
			</BaseCommandGroup>

			<BaseCommandGroup page="settings" heading={<Trans>Settings</Trans>}>
				<CommandItem
					keywords={[t`Profile`]}
					value="navigation.settings.profile"
					onSelect={() => onNavigate("/dashboard/settings/profile")}
				>
					<UserCircleIcon />
					<Trans>Profile</Trans>
				</CommandItem>

				<CommandItem
					keywords={[t`Preferences`]}
					value="navigation.settings.preferences"
					onSelect={() => onNavigate("/dashboard/settings/preferences")}
				>
					<GearIcon />
					<Trans>Preferences</Trans>
				</CommandItem>

				<CommandItem
					keywords={[t`Authentication`]}
					value="navigation.settings.authentication"
					onSelect={() => onNavigate("/dashboard/settings/authentication")}
				>
					<ShieldCheckIcon />
					<Trans>Authentication</Trans>
				</CommandItem>

				<CommandItem
					keywords={[t`API Keys`]}
					value="navigation.settings.api-keys"
					onSelect={() => onNavigate("/dashboard/settings/api-keys")}
				>
					<KeyIcon />
					<Trans>API Keys</Trans>
				</CommandItem>

				<CommandItem
					keywords={[t`Integrations`, t`Artificial Intelligence`]}
					value="navigation.settings.integrations"
					onSelect={() => onNavigate("/dashboard/settings/integrations")}
				>
					<OpenAiLogoIcon />
					<Trans>Integrations</Trans>
				</CommandItem>

				<CommandItem
					keywords={[t`Danger Zone`]}
					value="navigation.settings.danger-zone"
					onSelect={() => onNavigate("/dashboard/settings/danger-zone")}
				>
					<WarningIcon />
					<Trans>Danger Zone</Trans>
				</CommandItem>
			</BaseCommandGroup>
		</>
	);
}
