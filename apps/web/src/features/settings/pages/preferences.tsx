import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { m } from "motion/react";
import { Button } from "@reactive-resume/ui/components/button";
import { Label } from "@reactive-resume/ui/components/label";
import { LocaleCombobox } from "@/features/locale/combobox";
import { ThemeCombobox } from "@/features/theme/combobox";

export function PreferencesSettingsPage() {
	return (
		<m.div
			initial={{ y: -20 }}
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
					className="h-5 justify-start text-muted-foreground text-xs"
					render={
						<a href="https://crowdin.com/project/reactive-resume" target="_blank" rel="noopener noreferrer">
							<Trans>Help translate the app to your language</Trans>
							<ArrowRightIcon className="size-3" />
						</a>
					}
				/>
			</div>
		</m.div>
	);
}
