import { m } from "motion/react";
import { useIsClient } from "usehooks-ts";
import { AISettingsSection } from "./components/ai-section";

export function IntegrationsSettingsPage() {
	const isClient = useIsClient();

	if (!isClient) return null;

	return (
		<m.div
			initial={{ y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.25, ease: "easeOut" }}
			className="grid max-w-4xl gap-8 will-change-[transform,opacity]"
		>
			<AISettingsSection />
		</m.div>
	);
}
