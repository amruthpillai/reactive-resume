import { CircleNotchIcon } from "@phosphor-icons/react";
import { cn } from "@reactive-resume/utils/style";

function Spinner({ className, color, ...props }: React.ComponentProps<"svg">) {
	return (
		<CircleNotchIcon
			role="status"
			aria-label="Loading"
			color={color ?? "currentColor"}
			className={cn("size-4 animate-spin", className)}
			{...props}
		/>
	);
}

export { Spinner };
