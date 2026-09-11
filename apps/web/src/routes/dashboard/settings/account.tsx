import { t } from "@lingui/core/macro";
import { UserGearIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Separator } from "@reactive-resume/ui/components/separator";
import { AccountSettingsPage } from "@/features/settings/pages/account";
import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/settings/account")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="space-y-4">
			<DashboardHeader icon={UserGearIcon} title={t`Account`} />

			<Separator />

			<AccountSettingsPage />
		</div>
	);
}
