import { Trans } from "@lingui/react/macro";
import { cn } from "@reactive-resume/utils/style";

type Props = React.ComponentProps<"div">;

export function Copyright({ className, ...props }: Props) {
	return (
		<div className={cn("text-muted-foreground/80 text-xs leading-relaxed", className)} {...props}>
			<p>
				<Trans>
					Licensed under{" "}
					<a
						href="https://github.com/AmruthPillai/Reactive-Resume/blob/main/LICENSE"
						target="_blank"
						rel="noopener"
						className="font-medium underline underline-offset-2"
					>
						MIT
					</a>
					.
				</Trans>
			</p>

			<p>
				<Trans comment="Tagline shown in app footer/about area">By the community, for the community.</Trans>
			</p>

			<p>
				<Trans>
					A passion project by{" "}
					<a
						target="_blank"
						rel="noopener"
						href="https://amruthpillai.com"
						className="font-medium underline underline-offset-2"
					>
						Amruth Pillai
					</a>
					.
				</Trans>
			</p>

			<p className="mt-4">
				<Trans comment="App version label in footer; includes semantic version variable">
					Reactive Resume v{__APP_VERSION__}
				</Trans>
			</p>
		</div>
	);
}
