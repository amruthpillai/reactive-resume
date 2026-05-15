import { t } from "@lingui/core/macro";
import { ShieldCheckIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Separator } from "@reactive-resume/ui/components/separator";
import { AuthenticationSettingsPage } from "@/features/settings/authentication";
import { DashboardHeader } from "../../-components/header";

export const Route = createFileRoute("/dashboard/settings/authentication/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="space-y-4">
			<DashboardHeader icon={ShieldCheckIcon} title={t`Authentication`} />

			<Separator />

			<AuthenticationSettingsPage />
		</div>
	);
}
