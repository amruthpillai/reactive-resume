import { Trans } from "@lingui/react/macro";
import { PasswordIcon, PencilSimpleLineIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { m } from "motion/react";
import { Button } from "@reactive-resume/ui/components/button";
import { useDialogStore } from "@/dialogs/store";
import { ActionButton } from "./action-button";
import { useAuthAccounts } from "./hooks";

export function PasswordSection() {
	const { openDialog } = useDialogStore();
	const { hasAccount } = useAuthAccounts();

	const hasPassword = hasAccount("credential");

	return (
		<m.div
			initial={{ y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2, delay: 0.1, ease: "easeOut" }}
			className="flex items-center justify-between gap-x-4 will-change-[transform,opacity]"
		>
			<h2 className="flex items-center gap-x-3 font-medium text-base">
				<PasswordIcon />
				<Trans>Password</Trans>
			</h2>

			<ActionButton>
				{hasPassword ? (
					<Button variant="outline" onClick={() => openDialog("auth.change-password", undefined)}>
						<PencilSimpleLineIcon />
						<Trans>Update Password</Trans>
					</Button>
				) : (
					<Button
						variant="outline"
						nativeButton={false}
						render={
							<Link to="/auth/forgot-password">
								<Trans>Set Password</Trans>
							</Link>
						}
					/>
				)}
			</ActionButton>
		</m.div>
	);
}
