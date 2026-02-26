import { t } from "@lingui/core/macro";
import { ShieldCheckIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Separator } from "@/components/ui/separator";
import { DashboardHeader } from "../../-components/header";
import { useEnabledProviders } from "./-components/hooks";
import { PasswordSection } from "./-components/password";
import { SocialProviderSection } from "./-components/social-provider";
import { TwoFactorSection } from "./-components/two-factor";

export const Route = createFileRoute("/dashboard/settings/authentication/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { enabledProviders } = useEnabledProviders();

	return (
		<div className="space-y-4">
			<DashboardHeader icon={ShieldCheckIcon} title={t`Authentication`} />

			<Separator />

			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className="grid max-w-xl gap-4"
			>
				<PasswordSection />

				<TwoFactorSection />

				{/*
					Passkeys are temporarily disabled due to an upstream issue with the authentication provider.
					See https://github.com/better-auth/better-auth/issues/7463 for more details.

					<PasskeysSection />
				*/}

				{"google" in enabledProviders && <SocialProviderSection provider="google" animationDelay={0.4} />}

				{"github" in enabledProviders && <SocialProviderSection provider="github" animationDelay={0.5} />}

				{"custom" in enabledProviders && (
					<SocialProviderSection provider="custom" animationDelay={0.6} name={enabledProviders.custom} />
				)}
			</motion.div>
		</div>
	);
}
