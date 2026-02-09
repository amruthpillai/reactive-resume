import { t } from "@lingui/core/macro";
import type z from "zod";
import type { levelDesignSchema } from "@/schema/resume/data";
import { cn } from "@/utils/style";
import { PageIcon } from "../resume/shared/page-icon";

type Props = z.infer<typeof levelDesignSchema> & React.ComponentProps<"div"> & { level: number };

export function LevelDisplay({ icon, type, level, className, ...props }: Props) {
	if (level === 0) return null;
	if (type === "hidden" || icon === "") return null;

	return (
		<div
			role="presentation"
			aria-label={t`Level ${level} of 5`}
			className={cn(
				"flex items-center gap-x-1.5",
				type === "progress-bar" && "gap-x-0",
				type === "rectangle-full" && "gap-x-2",
				className,
			)}
			{...props}
		>
			{Array.from({ length: 5 }).map((_, index) => {
				const isActive = index < level;

				if (type === "progress-bar") {
					return (
						<div
							key={index}
							data-active={isActive}
							className={cn(
								"h-2.5 flex-1 border border-(--page-primary-color) border-x-0 first:border-l last:border-r",
								isActive && "bg-(--page-primary-color)",
							)}
						/>
					);
				}

				if (type === "icon") {
					return (
						<PageIcon
							key={index}
							icon={icon}
							className={cn("h-3 overflow-visible text-(--page-primary-color)", !isActive && "opacity-40")}
						/>
					);
				}

				return (
					<div
						key={index}
						data-active={isActive}
						className={cn(
							"size-2.5 border border-(--page-primary-color)",
							isActive && "bg-(--page-primary-color)",
							type === "circle" && "rounded-full",
							type === "rectangle" && "w-7",
							type === "rectangle-full" && "w-auto flex-1",
						)}
					/>
				);
			})}
		</div>
	);
}
