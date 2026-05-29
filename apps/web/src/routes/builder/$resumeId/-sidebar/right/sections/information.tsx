import { Trans } from "@lingui/react/macro";
import { Button } from "@reactive-resume/ui/components/button";
import { SectionBase } from "../shared/section-base";

export function InformationSectionBuilder() {
	return (
		<SectionBase type="information" className="space-y-4">
			<div className="flex flex-wrap gap-0.5">
				<Button
					size="sm"
					variant="link"
					className="text-xs"
					nativeButton={false}
					render={
						<a href="https://docs.rxresu.me" target="_blank" rel="noopener">
							<Trans>Documentation</Trans>
						</a>
					}
				/>

				<Button
					size="sm"
					variant="link"
					className="text-xs"
					nativeButton={false}
					render={
						<a href="https://github.com/amruthpillai/reactive-resume" target="_blank" rel="noopener">
							<Trans>Source Code</Trans>
						</a>
					}
				/>

				<Button
					size="sm"
					variant="link"
					className="text-xs"
					nativeButton={false}
					render={
						<a href="https://github.com/amruthpillai/reactive-resume/issues" target="_blank" rel="noopener">
							<Trans>Report a Bug</Trans>
						</a>
					}
				/>

				<Button
					size="sm"
					variant="link"
					className="text-xs"
					nativeButton={false}
					render={
						<a href="https://crowdin.com/project/reactive-resume" target="_blank" rel="noopener">
							<Trans>Translations</Trans>
						</a>
					}
				/>
			</div>
		</SectionBase>
	);
}
