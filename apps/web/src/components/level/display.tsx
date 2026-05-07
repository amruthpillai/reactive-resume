import type { levelDesignSchema } from "@reactive-resume/schema/resume/data";
import type z from "zod";
import { t } from "@lingui/core/macro";
import { cn } from "@reactive-resume/utils/style";

type Props = z.infer<typeof levelDesignSchema> & React.ComponentProps<"div"> & { level: number };

export function LevelDisplay({ icon, type, level, className, ...props }: Props) {
	if (level === 0) return null;
	if (type === "hidden" || icon === "") return null;

	return (
		<div
			role="img"
			aria-label={t({
				comment: "Accessible label for skill/proficiency level indicator, where level is current value out of 5",
				message: `Level ${level} of 5`,
			})}
			className={cn("flex items-center gap-x-2", type === "progress-bar" && "gap-x-0", className)}
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
						<i
							key={index}
							className={cn("ph size-2.5 text-(--page-primary-color)", `ph-${icon}`, !isActive && "opacity-40")}
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
