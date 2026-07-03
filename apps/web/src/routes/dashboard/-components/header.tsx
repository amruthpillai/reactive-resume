import type { Icon as IconType } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { SidebarTrigger } from "@reactive-resume/ui/components/sidebar";
import { cn } from "@reactive-resume/utils/style";

type Props = {
	title: string;
	icon: IconType;
	className?: string;
	actions?: ReactNode;
};

export function DashboardHeader({ title, icon: IconComponent, className, actions }: Props) {
	return (
		<div className={cn("relative flex items-center gap-x-2.5", className)}>
			<SidebarTrigger className="absolute inset-s-0 md:hidden" />
			<div className="flex flex-1 items-center justify-center gap-x-2.5 md:justify-start">
				<IconComponent weight="light" className="size-5" />
				<h1 className="font-medium text-xl tracking-tight">{title}</h1>
			</div>
			{actions ? <div className="flex items-center gap-x-2">{actions}</div> : null}
		</div>
	);
}
