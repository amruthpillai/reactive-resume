import { t } from "@lingui/core/macro";
import { BrainIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useIsClient } from "usehooks-ts";
import { Separator } from "@reactive-resume/ui/components/separator";
import { DashboardHeader } from "../../-components/header";
import { AISettingsSection } from "./-components/ai-section";

export const Route = createFileRoute("/dashboard/settings/integrations")({
	component: RouteComponent,
});

function RouteComponent() {
	const isClient = useIsClient();

	if (!isClient) return null;

	return (
		<div className="space-y-4">
			<DashboardHeader icon={BrainIcon} title={t`Integrations`} />

			<Separator />

			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.25, ease: "easeOut" }}
				className="grid max-w-xl gap-8 will-change-[transform,opacity]"
			>
				<AISettingsSection />
			</motion.div>
		</div>
	);
}
