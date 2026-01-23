import { Trans } from "@lingui/react/macro";
import { HandHeartIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { SectionBase } from "../shared/section-base";

export function InformationSectionBuilder() {
	return (
		<SectionBase type="information" className="space-y-4">
			<div className="space-y-2 rounded-md border bg-sky-600 p-5 text-white dark:bg-sky-700">
				<h4 className="font-medium tracking-tight">
					<Trans>Support the app by doing what you can!</Trans>
				</h4>

				<div className="space-y-2 text-xs leading-normal">
					<Trans>
						<p>
							Thank you for using Reactive Resume! This app is a labor of love, created mostly in my spare time, with
							wonderful support from open-source contributors around the world.
						</p>
						<p>
							If Reactive Resume has been helpful to you, and you'd like to help keep it free and open for everyone,
							please consider making a donation. Every little bit is appreciated!
						</p>
					</Trans>
				</div>

				<Button asChild size="sm" variant="default" className="mt-2 whitespace-normal px-4! text-xs">
					<a href="http://opencollective.com/reactive-resume" target="_blank" rel="noopener">
						<HandHeartIcon />
						<span className="truncate">
							<Trans>Donate to Reactive Resume</Trans>
						</span>
					</a>
				</Button>
			</div>

			<div className="flex flex-wrap gap-0.5">
				<Button asChild size="sm" variant="link" className="text-xs">
					<a href="https://docs.rxresu.me" target="_blank" rel="noopener">
						<Trans>Documentation</Trans>
					</a>
				</Button>

				<Button asChild size="sm" variant="link" className="text-xs">
					<a href="https://github.com/amruthpillai/reactive-resume" target="_blank" rel="noopener">
						<Trans>Source Code</Trans>
					</a>
				</Button>

				<Button asChild size="sm" variant="link" className="text-xs">
					<a href="https://github.com/amruthpillai/reactive-resume/issues" target="_blank" rel="noopener">
						<Trans>Report a Bug</Trans>
					</a>
				</Button>

				<Button asChild size="sm" variant="link" className="text-xs">
					<a href="https://crowdin.com/project/reactive-resume" target="_blank" rel="noopener">
						<Trans>Translations</Trans>
					</a>
				</Button>

				<Button asChild size="sm" variant="link" className="text-xs">
					<a href="https://opencollective.com/reactive-resume" target="_blank" rel="noopener">
						<Trans>Sponsors</Trans>
					</a>
				</Button>
			</div>
		</SectionBase>
	);
}
