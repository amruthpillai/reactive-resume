import { Trans } from "@lingui/react/macro";
import { KeyIcon, LockOpenIcon, ToggleLeftIcon, ToggleRightIcon } from "@phosphor-icons/react";
import { m } from "motion/react";
import { Button } from "@reactive-resume/ui/components/button";
import { Separator } from "@reactive-resume/ui/components/separator";
import { useDialogStore } from "@/dialogs/store";
import { authClient } from "@/libs/auth/client";
import { ActionButton } from "./action-button";
import { useAuthAccounts } from "./hooks";

export function TwoFactorSection() {
	const { openDialog } = useDialogStore();
	const { hasAccount } = useAuthAccounts();
	const { data: session } = authClient.useSession();

	const hasPassword = hasAccount("credential");
	const hasTwoFactor = session?.user.twoFactorEnabled ?? false;

	if (!hasPassword) return null;

	return (
		<m.div
			className="will-change-[transform,opacity]"
			initial={{ y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2, delay: 0.2, ease: "easeOut" }}
		>
			<Separator />

			<div className="mt-4 flex items-center justify-between gap-x-4">
				<h2 className="flex items-center gap-x-3 font-medium text-base">
					{hasTwoFactor ? <LockOpenIcon /> : <KeyIcon />}
					<Trans>Two-Factor Authentication</Trans>
				</h2>

				<ActionButton>
					<Button
						variant="outline"
						onClick={() => openDialog(hasTwoFactor ? "auth.two-factor.disable" : "auth.two-factor.enable", undefined)}
					>
						{hasTwoFactor ? (
							<>
								<ToggleLeftIcon />
								<Trans>Disable 2FA</Trans>
							</>
						) : (
							<>
								<ToggleRightIcon />
								<Trans>Enable 2FA</Trans>
							</>
						)}
					</Button>
				</ActionButton>
			</div>
		</m.div>
	);
}
