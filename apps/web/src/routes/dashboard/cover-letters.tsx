import { t } from "@lingui/core/macro";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Separator } from "@reactive-resume/ui/components/separator";
import { CoverLetterLibrary } from "@/features/cover-letters/library";
import { DashboardHeader } from "./-components/header";

export const Route = createFileRoute("/dashboard/cover-letters")({ component: RouteComponent });

function RouteComponent() {
	return (
		<div className="space-y-4">
			<DashboardHeader icon={EnvelopeSimpleIcon} title={t`Cover letters`} />
			<Separator />
			<CoverLetterLibrary />
		</div>
	);
}
