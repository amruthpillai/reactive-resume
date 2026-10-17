import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";

/** The user's resumes, for From and "Resume + letter". Isolated by server like the other lists. */
export function useResumes() {
	const session = useSession();
	const options = orpc.resume.list.queryOptions({ input: {} });
	return useQuery({
		...options,
		queryKey: [...options.queryKey, session.server],
		enabled: session.status === "signed-in",
	});
}
