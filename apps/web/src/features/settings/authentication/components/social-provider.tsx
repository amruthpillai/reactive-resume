import type { AuthProvider } from "@reactive-resume/auth/types";
import { Trans } from "@lingui/react/macro";
import { LinkBreakIcon, LinkIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useCallback, useMemo } from "react";
import { match } from "ts-pattern";
import { Button } from "@reactive-resume/ui/components/button";
import { Separator } from "@reactive-resume/ui/components/separator";
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

	const handleLink = useCallback(async () => {
		await link(provider);
	}, [link, provider]);

	const handleUnlink = useCallback(async () => {
		if (!account?.accountId) return;
		await unlink(provider, account.accountId);
	}, [account, unlink, provider]);

	return (
		<motion.div
			className="will-change-[transform,opacity]"
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2, delay: animationDelay, ease: "easeOut" }}
		>
			<Separator />

			<div className="mt-4 flex items-center justify-between gap-x-4">
				<h2 className="flex items-center gap-x-3 font-medium text-base">
					{providerIcon}
					{providerName}
				</h2>

				{match(isConnected)
					.with(true, () => (
						<motion.div
							className="will-change-transform"
							whileHover={{ y: -1, scale: 1.01 }}
							whileTap={{ scale: 0.99 }}
							transition={{ duration: 0.14, ease: "easeOut" }}
						>
							<Button variant="outline" onClick={handleUnlink}>
								<LinkBreakIcon />
								<Trans comment="Authentication settings action to unlink a connected social login provider">
									Disconnect
								</Trans>
							</Button>
						</motion.div>
					))
					.with(false, () => (
						<motion.div
							className="will-change-transform"
							whileHover={{ y: -1, scale: 1.01 }}
							whileTap={{ scale: 0.99 }}
							transition={{ duration: 0.14, ease: "easeOut" }}
						>
							<Button variant="outline" onClick={handleLink}>
								<LinkIcon />
								<Trans comment="Authentication settings action to link a social login provider">Connect</Trans>
							</Button>
						</motion.div>
					))
					.exhaustive()}
			</div>
		</motion.div>
	);
}
