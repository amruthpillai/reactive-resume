import type { Application } from "./types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/api/client";
import { getServer, useSession } from "@/auth/session";

/** Same unfiltered list for list, board, calendar and detail; isolated by server. */
export const applicationsListQueryOptions = (server = getServer()) => {
	const options = orpc.applications.list.queryOptions({ input: {} });
	return { ...options, queryKey: [...options.queryKey, server] };
};
export const applicationsListQueryKey = (server = getServer()) => applicationsListQueryOptions(server).queryKey;
export const applicationDetailQueryOptions = (id: string, server = getServer()) => {
	const options = orpc.applications.getById.queryOptions({ input: { id } });
	return { ...options, queryKey: [...options.queryKey, server] };
};
export const applicationDetailQueryKey = (id: string, server = getServer()) =>
	applicationDetailQueryOptions(id, server).queryKey;

export function useApplications() {
	const session = useSession();
	return useQuery({ ...applicationsListQueryOptions(session.server), enabled: session.status === "signed-in" });
}
export function useApplication(id: string) {
	const session = useSession();
	return useQuery({
		...applicationDetailQueryOptions(id, session.server),
		enabled: session.status === "signed-in" && !!id,
	});
}

/** Invalidates all application views, tags, stats and linked document summaries after writes. */
export function useInvalidateApplications() {
	const queryClient = useQueryClient();
	return async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: orpc.applications.key() }),
			queryClient.invalidateQueries({ queryKey: orpc.documents.list.key() }),
		]);
	};
}

export function useApplicationMutations() {
	const invalidate = useInvalidateApplications();
	const queryClient = useQueryClient();
	// Settlement refetches authoritative state, including after a lost reply or optimistic rollback.
	const onSettled = () => {
		void invalidate();
	};
	const create = useMutation({ ...orpc.applications.create.mutationOptions(), onSettled });
	const update = useMutation({
		...orpc.applications.update.mutationOptions(),
		onMutate: async (input) => {
			const listKey = applicationsListQueryKey();
			await queryClient.cancelQueries({ queryKey: listKey });
			const previous = queryClient.getQueryData<Application[]>(listKey);
			queryClient.setQueryData<Application[]>(listKey, (rows) =>
				rows?.map((row) =>
					row.id === input.id
						? {
								...row,
								...(input.status ? { status: input.status } : {}),
								...(input.closedReason !== undefined ? { closedReason: input.closedReason } : {}),
							}
						: row,
				),
			);
			return { previous, listKey };
		},
		onError: (_error, _input, context) => {
			if (context?.previous) queryClient.setQueryData(context.listKey, context.previous);
		},
		onSettled,
	});
	const remove = useMutation({ ...orpc.applications.delete.mutationOptions(), onSettled });
	const bulkUpdate = useMutation({ ...orpc.applications.bulkUpdate.mutationOptions(), onSettled });
	const bulkDelete = useMutation({ ...orpc.applications.bulkDelete.mutationOptions(), onSettled });
	const importCsv = useMutation({ ...orpc.applications.import.mutationOptions(), onSettled });
	return { create, update, remove, bulkUpdate, bulkDelete, importCsv };
}
