import { t } from "@lingui/core/macro";
import { WarningIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Separator } from "@reactive-resume/ui/components/separator";
import { DangerZoneSettingsPage } from "@/features/settings/pages/danger-zone";
import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/settings/danger-zone")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="space-y-4">
			<DashboardHeader icon={WarningIcon} title={t`Danger Zone`} />

			<Separator />

			<DangerZoneSettingsPage />
		</div>
	);
}
