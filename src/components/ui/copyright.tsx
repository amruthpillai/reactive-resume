import { cn } from "@/utils/style";

type Props = React.ComponentProps<"div">;

export function Copyright({ className, ...props }: Props) {
	return (
		<div className={cn("text-muted-foreground/80 text-xs leading-relaxed", className)} {...props}>
			<p>
				Licensed under{" "}
					<a href="#" target="_blank" rel="noopener" className="font-medium underline underline-offset-2">
						MIT
					</a>
					.
			</p>

			<p>
				By the community, for the community.
			</p>

			<p>
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
			</p>

			<p className="mt-4">Reactive Resume v{__APP_VERSION__}</p>
		</div>
	);
}
