import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, GearSixIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Button } from "@reactive-resume/ui/components/button";
import { Label } from "@reactive-resume/ui/components/label";
import { Separator } from "@reactive-resume/ui/components/separator";
import { LocaleCombobox } from "@/components/locale/combobox";
import { ThemeCombobox } from "@/components/theme/combobox";
import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/settings/preferences")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="space-y-4">
			<DashboardHeader icon={GearSixIcon} title={t`Preferences`} />

			<Separator />

			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.25, ease: "easeOut" }}
				className="grid max-w-xl gap-6 will-change-[transform,opacity]"
			>
				<div className="grid gap-1.5">
					<Label className="mb-0.5">
						<Trans>Theme</Trans>
					</Label>
					<ThemeCombobox />
				</div>

				<div className="grid gap-1.5">
					<Label className="mb-0.5">
						<Trans>Language</Trans>
					</Label>
					<LocaleCombobox />
					<Button
						size="sm"
						variant="link"
						nativeButton={false}
						className="h-5 justify-start text-muted-foreground text-xs active:scale-100"
						render={
							<a href="https://crowdin.com/project/reactive-resume" target="_blank" rel="noopener noreferrer">
								<Trans>Help translate the app to your language</Trans>
								<ArrowRightIcon className="size-3" />
							</a>
						}
					/>
				</div>
			</motion.div>
		</div>
	);
}
