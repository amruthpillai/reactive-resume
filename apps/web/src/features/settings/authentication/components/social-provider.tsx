import type { AuthProvider } from "@reactive-resume/auth/types";
import { Trans } from "@lingui/react/macro";
import { LinkBreakIcon, LinkIcon } from "@phosphor-icons/react";
import { m } from "motion/react";
import { Button } from "@reactive-resume/ui/components/button";
import { Separator } from "@reactive-resume/ui/components/separator";
import { ActionButton } from "./action-button";
import { getProviderIcon, getProviderName, useAuthAccounts, useAuthProviderActions } from "./hooks";

type SocialProviderSectionProps = {
	provider: AuthProvider;
	name?: string;
	animationDelay?: number;
};

export function SocialProviderSection({ provider, name, animationDelay = 0 }: SocialProviderSectionProps) {
	const { link, unlink } = useAuthProviderActions();
	const { hasAccount, getAccountByProviderId } = useAuthAccounts();

	const providerName = name ?? getProviderName(provider);
	const providerIcon = getProviderIcon(provider);

	const account = getAccountByProviderId(provider);
	const isConnected = hasAccount(provider);

	return (
		<m.div
			className="will-change-[transform,opacity]"
			initial={{ y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2, delay: animationDelay, ease: "easeOut" }}
		>
			<Separator />

			<div className="mt-4 flex items-center justify-between gap-x-4">
				<h2 className="flex items-center gap-x-3 font-medium text-base">
					{providerIcon}
					{providerName}
				</h2>

				<ActionButton>
					{isConnected ? (
						<Button
							variant="outline"
							onClick={() => {
								if (account?.accountId) void unlink(provider, account.accountId);
							}}
						>
							<LinkBreakIcon />
							<Trans comment="Authentication settings action to unlink a connected social login provider">
								Disconnect
							</Trans>
						</Button>
					) : (
						<Button variant="outline" onClick={() => void link(provider)}>
							<LinkIcon />
							<Trans comment="Authentication settings action to link a social login provider">Connect</Trans>
						</Button>
					)}
				</ActionButton>
			</div>
		</m.div>
	);
}
