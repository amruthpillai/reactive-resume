import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { PaletteIcon, SignOutIcon, TranslateIcon } from "@phosphor-icons/react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTheme } from "@/components/theme/provider";
import {
	Menu,
	MenuGroup,
	MenuItem,
	MenuPanel,
	MenuRadioGroup,
	MenuRadioItem,
	MenuSeparator,
	MenuSubmenu,
	MenuSubmenuPanel,
	MenuSubmenuTrigger,
	MenuTrigger,
} from "@/components/ui/menu";
import { authClient } from "@/integrations/auth/client";
import type { AuthSession } from "@/integrations/auth/types";
import { isLocale, loadLocale, localeMap, setLocaleServerFn } from "@/utils/locale";
import { isTheme } from "@/utils/theme";

type Props = {
	children: ({ session }: { session: AuthSession }) => React.ComponentProps<typeof MenuTrigger>["render"];
};

export function UserDropdownMenu({ children }: Props) {
	const router = useRouter();
	const { i18n } = useLingui();
	const { theme, setTheme } = useTheme();
	const { data: session } = authClient.useSession();

	function handleThemeChange(value: string) {
		if (!isTheme(value)) return;
		setTheme(value);
	}

	async function handleLocaleChange(value: string) {
		if (!isLocale(value)) return;
		await Promise.all([loadLocale(value), setLocaleServerFn({ data: value })]);
		window.location.reload();
	}

	function handleLogout() {
		const toastId = toast.loading(t`Signing out...`);

		authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					toast.dismiss(toastId);
					router.invalidate();
				},
				onError: ({ error }) => {
					toast.error(error.message, { id: toastId });
				},
			},
		});
	}

	if (!session?.user) return null;

	return (
		<Menu>
			<MenuTrigger render={children({ session })} />

			<MenuPanel align="start" side="top">
				<MenuGroup>
					<MenuSubmenu>
						<MenuSubmenuTrigger>
							<TranslateIcon />
							<Trans>Language</Trans>
						</MenuSubmenuTrigger>
						<MenuSubmenuPanel className="max-h-[400px] overflow-y-auto">
							<MenuRadioGroup value={i18n.locale} onValueChange={handleLocaleChange}>
								{Object.entries(localeMap).map(([value, label]) => (
									<MenuRadioItem key={value} value={value}>
										{i18n.t(label)}
									</MenuRadioItem>
								))}
							</MenuRadioGroup>
						</MenuSubmenuPanel>
					</MenuSubmenu>

					<MenuSubmenu>
						<MenuSubmenuTrigger>
							<PaletteIcon />
							<Trans>Theme</Trans>
						</MenuSubmenuTrigger>
						<MenuSubmenuPanel>
							<MenuRadioGroup value={theme} onValueChange={handleThemeChange}>
								<MenuRadioItem value="light">
									<Trans>Light</Trans>
								</MenuRadioItem>
								<MenuRadioItem value="dark">
									<Trans>Dark</Trans>
								</MenuRadioItem>
							</MenuRadioGroup>
						</MenuSubmenuPanel>
					</MenuSubmenu>
				</MenuGroup>

				<MenuSeparator />

				<MenuItem onClick={handleLogout}>
					<SignOutIcon />
					<Trans>Logout</Trans>
				</MenuItem>
			</MenuPanel>
		</Menu>
	);
}
