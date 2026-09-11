import type { ReactNode } from "react";
import { m } from "motion/react";

type ActionButtonProps = {
	children: ReactNode;
};

export function ActionButton({ children }: ActionButtonProps) {
	return (
		<m.div
			className="will-change-transform"
			whileHover={{ y: -1, scale: 1.01 }}
			whileTap={{ scale: 0.99 }}
			transition={{ duration: 0.14, ease: "easeOut" }}
		>
			{children}
		</m.div>
	);
}
