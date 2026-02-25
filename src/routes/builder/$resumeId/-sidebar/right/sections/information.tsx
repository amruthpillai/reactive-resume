import { HandHeartIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { SectionBase } from "../shared/section-base";

export function InformationSectionBuilder() {
	return (
		<SectionBase type="information" className="space-y-4">
			<div className="space-y-2 rounded-md border bg-sky-600 p-5 text-white dark:bg-sky-700">
				<h4 className="font-medium tracking-tight">
					Support the app by doing what you can!
				</h4>

				<div className="space-y-2 text-xs leading-normal">
					<p>
							Thank you for using Reactive Resume! This app is a labor of love, created mostly in my spare time, with
							wonderful support from open-source contributors around the world.
						</p>
						<p>
							If Reactive Resume has been helpful to you, and you'd like to help keep it free and open for everyone,
							please consider making a donation. Every little bit is appreciated!
						</p>
				</div>

				<Button asChild size="sm" variant="default" className="mt-2 whitespace-normal px-4! text-xs">
					<a href="http://opencollective.com/reactive-resume" target="_blank" rel="noopener">
						<HandHeartIcon />
						<span className="truncate">
							Donate to Reactive Resume
						</span>
					</a>
				</Button>
			</div>

			<div className="flex flex-wrap gap-0.5">
				<Button asChild size="sm" variant="link" className="text-xs">
					<a href="https://docs.rxresu.me" target="_blank" rel="noopener">
						Documentation
					</a>
				</Button>

				<Button asChild size="sm" variant="link" className="text-xs">
					<a href="https://github.com/amruthpillai/reactive-resume" target="_blank" rel="noopener">
						Source Code
					</a>
				</Button>

				<Button asChild size="sm" variant="link" className="text-xs">
					<a href="https://github.com/amruthpillai/reactive-resume/issues" target="_blank" rel="noopener">
						Report a Bug
					</a>
				</Button>

				<Button asChild size="sm" variant="link" className="text-xs">
					<a href="https://opencollective.com/reactive-resume" target="_blank" rel="noopener">
						Sponsors
					</a>
				</Button>
			</div>
		</SectionBase>
	);
}
