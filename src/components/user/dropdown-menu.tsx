import { PaletteIcon, SignOutIcon } from "@phosphor-icons/react";
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
import { isTheme } from "@/utils/theme";

type Props = {
	children: ({ session }: { session: AuthSession }) => React.ReactNode;
};

export function UserDropdownMenu({ children }: Props) {
	const router = useRouter();
	const { theme, setTheme } = useTheme();
	const { data: session } = authClient.useSession();

	function handleThemeChange(value: string) {
		if (!isTheme(value)) return;
		setTheme(value);
	}

	function handleLogout() {
		const toastId = toast.loading("Signing out...");

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
							<PaletteIcon />
							Theme
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
								<DropdownMenuRadioItem value="light">
									Light
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="dark">
									Dark
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuItem onSelect={handleLogout}>
					<SignOutIcon />
					Logout
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
