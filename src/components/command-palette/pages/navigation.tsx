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
import { CommandItem } from "@/components/ui/command";
import { useCommandPaletteStore } from "../store";
import { BaseCommandGroup } from "./base";

export function NavigationCommandGroup() {
	const navigate = useNavigate();
	const { session } = useRouteContext({ strict: false });
	const reset = useCommandPaletteStore((state) => state.reset);
	const pushPage = useCommandPaletteStore((state) => state.pushPage);

	function onNavigate(path: string) {
		navigate({ to: path });
		reset();
	}

	return (
		<>
			<BaseCommandGroup heading={Go to...}>
				<CommandItem keywords={["Home"]} value="navigation.home" onSelect={() => onNavigate("/")}>
					<HouseSimpleIcon />
					Home
				</CommandItem>

				<CommandItem
					disabled={!session}
					keywords={["Resumes"]}
					value="navigation.resumes"
					onSelect={() => onNavigate("/dashboard/resumes")}
				>
					<ReadCvLogoIcon />
					Resumes
				</CommandItem>

				<CommandItem
					disabled={!session}
					keywords={["Settings"]}
					value="navigation.settings"
					onSelect={() => pushPage("settings")}
				>
					<GearIcon />
					Settings
				</CommandItem>
			</BaseCommandGroup>

			<BaseCommandGroup page="settings" heading={Settings}>
				<CommandItem
					keywords={["Profile"]}
					value="navigation.settings.profile"
					onSelect={() => onNavigate("/dashboard/settings/profile")}
				>
					<UserCircleIcon />
					Profile
				</CommandItem>

				<CommandItem
					keywords={["Preferences"]}
					value="navigation.settings.preferences"
					onSelect={() => onNavigate("/dashboard/settings/preferences")}
				>
					<GearIcon />
					Preferences
				</CommandItem>

				<CommandItem
					keywords={["Authentication"]}
					value="navigation.settings.authentication"
					onSelect={() => onNavigate("/dashboard/settings/authentication")}
				>
					<ShieldCheckIcon />
					Authentication
				</CommandItem>

				<CommandItem
					keywords={["API Keys"]}
					value="navigation.settings.api-keys"
					onSelect={() => onNavigate("/dashboard/settings/api-keys")}
				>
					<KeyIcon />
					API Keys
				</CommandItem>

				<CommandItem
					keywords={["Artificial Intelligence"]}
					value="navigation.settings.ai"
					onSelect={() => onNavigate("/dashboard/settings/ai")}
				>
					<OpenAiLogoIcon />
					Artificial Intelligence
				</CommandItem>

				<CommandItem
					keywords={["Danger Zone"]}
					value="navigation.settings.danger-zone"
					onSelect={() => onNavigate("/dashboard/settings/danger-zone")}
				>
					<WarningIcon />
					Danger Zone
				</CommandItem>
			</BaseCommandGroup>
		</>
	);
}
