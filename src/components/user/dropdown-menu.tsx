import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { PaletteIcon, SignOutIcon, TranslateIcon } from "@phosphor-icons/react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTheme } from "@/components/theme/provider";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/integrations/auth/client";
import type { AuthSession } from "@/integrations/auth/types";
import { isLocale, loadLocale, localeMap, setLocaleServerFn } from "@/utils/locale";
import { isTheme } from "@/utils/theme";

type Props = {
	children: ({ session }: { session: AuthSession }) => React.ReactNode;
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
		<DropdownMenu>
			<DropdownMenuTrigger asChild>{children({ session })}</DropdownMenuTrigger>

			<DropdownMenuContent align="start" side="top">
				<DropdownMenuGroup>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<TranslateIcon />
							<Trans>Language</Trans>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="max-h-[400px] overflow-y-auto">
							<DropdownMenuRadioGroup value={i18n.locale} onValueChange={handleLocaleChange}>
								{Object.entries(localeMap).map(([value, label]) => (
									<DropdownMenuRadioItem key={value} value={value}>
										{i18n.t(label)}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuSub>

					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<PaletteIcon />
							<Trans>Theme</Trans>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
								<DropdownMenuRadioItem value="light">
									<Trans>Light</Trans>
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="dark">
									<Trans>Dark</Trans>
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuItem onSelect={handleLogout}>
					<SignOutIcon />
					<Trans>Logout</Trans>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
