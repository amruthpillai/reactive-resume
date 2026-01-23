import { LevelDisplay } from "@/components/level/display";
import { cn } from "@/utils/style";
import { useResumeStore } from "../store/resume";

type Props = React.ComponentProps<"div"> & {
	level: number;
};

export function PageLevel({ level, className, ...props }: Props) {
	const { icon, type } = useResumeStore((state) => state.resume.data.metadata.design.level);

	return <LevelDisplay icon={icon} type={type} level={level} className={cn("h-4", className)} {...props} />;
}
