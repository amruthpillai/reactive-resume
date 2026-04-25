import { t } from "@lingui/core/macro";
import { ORPCError } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useEffect } from "react";

import type { ResumeData } from "@/schema/resume/data";

import { LoadingScreen } from "@/components/layout/loading-screen";
import { ResumePreview } from "@/components/resume/preview";
import { useResumeStore } from "@/components/resume/store/resume";
import { orpc, type RouterOutput } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";

type LoaderData = Omit<RouterOutput["resume"]["getBySlug"], "data"> & { data: ResumeData };

export const Route = createFileRoute("/$username/$slug")({
  component: RouteComponent,
  loader: async ({ context, params, ...rest }) => {
    console.log("$username/$slug loader", JSON.stringify({ params, context, rest }, null, 2));

    const { username, slug } = params;
    const resume = await context.queryClient.ensureQueryData(
      orpc.resume.getBySlug.queryOptions({ input: { username, slug } }),
    );

    return { resume: resume as LoaderData };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.resume.name} - ${t({
              comment: "Brand name suffix in browser tab title for public resume pages",
              message: "Reactive Resume",
            })}`
          : t({
              comment: "Browser tab title before the public resume finishes loading",
              message: "Reactive Resume",
            }),
      },
    ],
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

  useEffect(() => {
    if (!resume) return;
    initialize(resume);
    return () => initialize(null);
  }, [resume, initialize]);

  if (!isReady) return <LoadingScreen />;

  return (
    <>
      <div
        className={cn("mx-auto max-w-[210mm]", "print:m-0 print:block print:max-w-full print:px-0", "md:my-4 md:px-4")}
      >
        <ResumePreview className="space-y-4" pageClassName="print:w-full! w-full max-w-full" />
      </div>
    </>
  );
}
