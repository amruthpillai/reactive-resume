import { useEffect } from "react";
import { toast } from "sonner";
import { Toaster } from "@reactive-resume/ui/components/sonner";

// Toaster is the toast host. Fire a persistent toast on mount so the card
// shows a real notification instead of an empty portal.
export const Notification = () => {
	useEffect(() => {
		toast.success("Resume published", {
			description: "“Software Engineer” is now live at rxresume.me/jane-doe.",
			duration: Number.POSITIVE_INFINITY,
		});
	}, []);
	return (
		<div style={{ minHeight: 140 }}>
			<Toaster position="top-center" />
		</div>
	);
};
