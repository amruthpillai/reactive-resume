import type * as React from "react";
import { cn } from "@reactive-resume/utils/style";

function Message({ className, align = "start", ...props }: React.ComponentProps<"div"> & { align?: "start" | "end" }) {
	return (
		<div
			data-slot="message"
			data-align={align}
			className={cn(
				"group/message relative flex w-full min-w-0 gap-2 text-sm data-[align=end]:flex-row-reverse",
				className,
			)}
			{...props}
		/>
	);
}

function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="message-content"
			className={cn(
				"flex w-full min-w-0 flex-col gap-2.5 break-words group-data-[align=end]/message:*:data-slot:self-end",
				className,
			)}
			{...props}
		/>
	);
}

export { Message, MessageContent };
