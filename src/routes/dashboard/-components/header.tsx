import type { Icon as IconType } from "@phosphor-icons/react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/utils/style";

type Props = {
	title: string;
	icon: IconType;
	className?: string;
};

export function DashboardHeader({ title, icon: IconComponent, className }: Props) {
	return (
		<div className={cn("relative flex items-center justify-center gap-x-2.5 md:justify-start", className)}>
			<SidebarTrigger className="absolute start-0 md:hidden" />
			<IconComponent weight="light" className="size-5" />
			<h1 className="font-medium text-xl tracking-tight">{title}</h1>
		</div>
	);
}
