import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { PaletteIcon, SignOutIcon, TranslateIcon } from "@phosphor-icons/react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import type { AuthSession } from "@/integrations/auth/types";

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
import { getReadableErrorMessage } from "@/utils/error-message";
import { isLocale, loadLocale, localeMap, setLocaleServerFn } from "@/utils/locale";
import { isTheme } from "@/utils/theme";

type Props = {
  children: ({ session }: { session: AuthSession }) => React.ComponentProps<typeof DropdownMenuTrigger>["render"];
};

export function UserDropdownMenu({ children }: Props) {
  const router = useRouter();
  const { i18n } = useLingui();
  const { theme, setTheme } = useTheme();
  const { data: session } = authClient.useSession();

  const handleThemeChange = (value: string) => {
    if (!isTheme(value)) return;
    setTheme(value);
  };

  const handleLocaleChange = async (value: string) => {
    if (!isLocale(value)) return;
    await Promise.all([loadLocale(value), setLocaleServerFn({ data: value })]);
    window.location.reload();
  };

  const handleLogout = async () => {
    const toastId = toast.loading(t`Signing out...`);

    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.dismiss(toastId);
          void router.invalidate();
        },
        onError: ({ error }) => {
          toast.error(
            getReadableErrorMessage(
              error,
              t({
                comment: "Fallback toast when signing out fails",
                message: "Failed to sign out. Please try again.",
              }),
            ),
            { id: toastId },
          );
        },
      },
    });
  };

  if (!session?.user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children({ session: session as AuthSession })} />

      <DropdownMenuContent align="start" side="top">
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <TranslateIcon />
              <Trans comment="Menu item that opens language selection submenu">Language</Trans>
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
              <Trans comment="Menu item that opens appearance theme selection submenu">Theme</Trans>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
                <DropdownMenuRadioItem value="light">
                  <Trans comment="Appearance theme option for light mode">Light</Trans>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <Trans comment="Appearance theme option for dark mode">Dark</Trans>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout}>
          <SignOutIcon />
          <Trans comment="User menu action to sign out of current account">Logout</Trans>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
