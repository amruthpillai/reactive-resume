import { useEffect } from "react";
import { useSessionStorage } from "usehooks-ts";
import z from "zod";

export const resumeViewSchema = z.enum(["grid", "compact", "list"]);
type ResumeView = z.infer<typeof resumeViewSchema>;

export function useResumeView(view: ResumeView | undefined, userId: string): ResumeView {
	const [storedView, setStoredView] = useSessionStorage<unknown>(`resume-view:${userId}`, "grid", {
		initializeWithValue: false,
	});

	useEffect(() => {
		if (view !== undefined && storedView !== view) setStoredView(view);
	}, [view, storedView, setStoredView]);

	return view ?? resumeViewSchema.catch("grid").parse(storedView);
}
