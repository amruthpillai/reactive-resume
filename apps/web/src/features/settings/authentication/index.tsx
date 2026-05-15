import { motion } from "motion/react";
import { useEnabledProviders } from "./components/hooks";
import { PasskeysSection } from "./components/passkeys";
import { PasswordSection } from "./components/password";
import { SocialProviderSection } from "./components/social-provider";
import { TwoFactorSection } from "./components/two-factor";

export function AuthenticationSettingsPage() {
	const { enabledProviders } = useEnabledProviders();

	return (
		<motion.div
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.25, ease: "easeOut" }}
			className="grid max-w-xl gap-4 will-change-[transform,opacity]"
		>
			<PasswordSection />

			<TwoFactorSection />

			<PasskeysSection />

			{"google" in enabledProviders && <SocialProviderSection provider="google" animationDelay={0.4} />}

			{"github" in enabledProviders && <SocialProviderSection provider="github" animationDelay={0.5} />}

			{"linkedin" in enabledProviders && <SocialProviderSection provider="linkedin" animationDelay={0.6} />}

			{"custom" in enabledProviders && (
				<SocialProviderSection provider="custom" animationDelay={0.7} name={enabledProviders.custom} />
			)}
		</motion.div>
	);
}
