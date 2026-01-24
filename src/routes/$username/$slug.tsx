import { Trans } from "@lingui/react/macro";
import { ORPCError } from "@orpc/client";
import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { ResumePreview } from "@/components/resume/preview";
import { useResumeStore } from "@/components/resume/store/resume";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { orpc } from "@/integrations/orpc/client";
import { downloadFromUrl } from "@/utils/file";
import { cn } from "@/utils/style";

export const Route = createFileRoute("/$username/$slug")({
	component: RouteComponent,
	loader: async ({ context, params: { username, slug } }) => {
		const resume = await context.queryClient.ensureQueryData(
			orpc.resume.getBySlug.queryOptions({ input: { username, slug } }),
		);

		return { resume };
	},
	head: ({ loaderData }) => ({
		meta: [{ title: loaderData ? `${loaderData.resume.name} - Reactive Resume` : "Reactive Resume" }],
	}),
	onError: (error) => {
		if (error instanceof ORPCError && error.code === "NEED_PASSWORD") {
			const data = error.data as { username?: string; slug?: string } | undefined;
			const username = data?.username;
			const slug = data?.slug;

			if (username && slug) {
				throw redirect({
					to: "/auth/resume-password",
					search: { redirect: `/${username}/${slug}` },
				});
			}
		}

		throw notFound();
	},
});

function RouteComponent() {
	const { username, slug } = Route.useParams();
	const isReady = useResumeStore((state) => state.isReady);
	const initialize = useResumeStore((state) => state.initialize);

	const { data: resume } = useQuery(orpc.resume.getBySlug.queryOptions({ input: { username, slug } }));
	const { mutateAsync: printResumeAsPDF, isPending: isPrinting } = useMutation(
		orpc.printer.printResumeAsPDF.mutationOptions(),
	);

	useEffect(() => {
		if (!resume) return;
		initialize(resume);
		return () => initialize(null);
	}, [resume, initialize]);

	const handleDownload = useCallback(async () => {
		if (!resume) return;
		const { url } = await printResumeAsPDF({ id: resume.id });
		downloadFromUrl(url, `resume-${resume.name}.pdf`);
	}, [resume, printResumeAsPDF]);

	if (!isReady) return <LoadingScreen />;

	return (
		<>
			<div
				className={cn("mx-auto max-w-[210mm]", "print:m-0 print:block print:max-w-full print:px-0", "md:my-4 md:px-4")}
			>
				<ResumePreview pageClassName="print:w-full! w-full max-w-full" />
			</div>

			<Button
				size="lg"
				variant="secondary"
				disabled={isPrinting}
				className="fixed right-4 bottom-4 z-50 hidden rounded-full px-4 md:inline-flex print:hidden"
				onClick={handleDownload}
			>
				{isPrinting ? <Spinner /> : <DownloadSimpleIcon />}
				{isPrinting ? <Trans>Downloading...</Trans> : <Trans>Download</Trans>}
			</Button>
		</>
	);
}
