import { Trans } from "@lingui/react/macro";
import { LinkBreakIcon, LinkIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useCallback, useMemo } from "react";
import { match } from "ts-pattern";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { AuthProvider } from "@/integrations/auth/types";
import { getProviderIcon, getProviderName, useAuthAccounts, useAuthProviderActions } from "./hooks";

type SocialProviderSectionProps = {
	provider: AuthProvider;
	name?: string;
	animationDelay?: number;
};

export function SocialProviderSection({ provider, name, animationDelay = 0 }: SocialProviderSectionProps) {
	const { link, unlink } = useAuthProviderActions();
	const { hasAccount, getAccountByProviderId } = useAuthAccounts();

	const providerName = useMemo(() => name ?? getProviderName(provider), [name, provider]);
	const providerIcon = useMemo(() => getProviderIcon(provider), [provider]);

	const account = useMemo(() => getAccountByProviderId(provider), [getAccountByProviderId, provider]);
	const isConnected = useMemo(() => hasAccount(provider), [hasAccount, provider]);

	const handleLink = useCallback(() => {
		link(provider);
	}, [link, provider]);

	const handleUnlink = useCallback(() => {
		if (!account?.accountId) return;
		unlink(provider, account.accountId);
	}, [account, unlink, provider]);

	return (
		<motion.div
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: animationDelay }}
		>
			<Separator />

			<div className="mt-4 flex items-center justify-between gap-x-4">
				<h2 className="flex items-center gap-x-3 font-medium text-base">
					{providerIcon}
					{providerName}
				</h2>

				{match(isConnected)
					.with(true, () => (
						<Button variant="outline" onClick={handleUnlink}>
							<LinkBreakIcon />
							<Trans>Disconnect</Trans>
						</Button>
					))
					.with(false, () => (
						<Button variant="outline" onClick={handleLink}>
							<LinkIcon />
							<Trans>Connect</Trans>
						</Button>
					))
					.exhaustive()}
			</div>
		</motion.div>
	);
}
