import { cn } from "@/utils/style";

type Props = {
	side: "left" | "right";
	children: React.ReactNode;
};

export function BuilderSidebarEdge({ side, children }: Props) {
	return (
		<div
			className={cn(
				"absolute inset-y-0 hidden w-12 flex-col items-center justify-between bg-popover py-2.5 sm:flex",
				side === "left" ? "start-0 border-r" : "end-0 border-l",
			)}
		>
			{children}
		</div>
	);
}
