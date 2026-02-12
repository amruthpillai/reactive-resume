import { IconContext } from "@phosphor-icons/react";
import { use } from "react";
import { cn } from "@/utils/style";
import type { ExtendedIconProps } from "../preview";

type PageIconProps = {
	icon: string;
	className?: string;
	type?: "header" | "section" | "default";
};

export function PageIcon({ icon, className, type = "default" }: PageIconProps) {
	const iconContext = use<ExtendedIconProps>(IconContext);

	if (!icon) return null;

	// Check global hide first
	if (iconContext.hidden) return null;

	// Check specific hide based on type
	if (type === "header" && iconContext.hideHeader) return null;
	if (type === "section" && iconContext.hideSection) return null;

	return (
		<i
			className={cn("ph shrink-0", `ph-${icon}`, className)}
			style={{ fontSize: `${iconContext.size}px`, color: iconContext.color }}
		/>
	);
}
