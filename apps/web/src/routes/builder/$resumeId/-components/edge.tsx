import { cn } from "@reactive-resume/utils/style";

type Props = {
	side: "left" | "right";
	children: React.ReactNode;
};

export function BuilderSidebarEdge({ side, children }: Props) {
	return (
		<div
			className={cn(
				// `md:` (not `sm:`) so the strip only shows on real desktop; the mobile shell takes over below 768px.
				"absolute inset-y-0 hidden min-h-0 w-12 flex-col items-center overflow-hidden bg-popover py-2.5 md:flex",
				side === "left" ? "inset-s-0 border-r" : "inset-e-0 border-l",
			)}
		>
			{children}
		</div>
	);
}
