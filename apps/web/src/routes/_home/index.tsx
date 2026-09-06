import { ORPCError } from "@orpc/client";
import { ClientOnly, createFileRoute, lazyRouteComponent, redirect } from "@tanstack/react-router";
import { getResumeSocialMeta } from "@reactive-resume/resume/social-meta";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { NotFoundScreen } from "@/components/layout/not-found-screen";
import { orpc } from "@/libs/orpc/client";
import {
	createNoindexFollowMeta,
	createResumeSocialMeta,
	createRootStructuredDataScript,
	getCanonicalRootUrl,
} from "@/libs/seo";
import { DonationBanner } from "./-sections/donate";
import { Faq } from "./-sections/faq";
import { Features } from "./-sections/features";
import { Footer } from "./-sections/footer";
import { Hero } from "./-sections/hero";
import { Prefooter } from "./-sections/prefooter";
import { Sponsors } from "./-sections/sponsors";
import { Statistics } from "./-sections/statistics";
import { Templates } from "./-sections/templates";
import { Testimonials } from "./-sections/testimonials";

const PublicResumePage = lazyRouteComponent(() => import("@/features/resume/public/public-resume"), "PublicResumePage");

export const Route = createFileRoute("/_home/")({
	component: RouteComponent,
	loader: async ({ context }) => ({
		root: await context.queryClient.fetchQuery(orpc.resume.getRoot.queryOptions({ staleTime: 0 })),
	}),
	onError: (error) => {
		if (error instanceof ORPCError && error.code === "NEED_PASSWORD") {
			const { username, slug } = error.data as { username: string; slug: string };
			throw redirect({ to: "/auth/resume-password", search: { redirect: `/${username}/${slug}`, returnTo: "/" } });
		}
	},
	head: ({ loaderData }) => {
		const root = loaderData?.root;
		if (root && root.status !== "disabled") {
			const { canonicalUrl } = root;
			if (root.status === "unavailable") {
				return {
					meta: [{ title: "Reactive Resume" }, createNoindexFollowMeta()],
					links: [{ rel: "canonical", href: canonicalUrl }],
				};
			}
			const social = getResumeSocialMeta(root.resume.data, root.resume.name || "Resume");
			return {
				meta: [
					{ title: `${social.name} - Reactive Resume` },
					createNoindexFollowMeta(),
					...createResumeSocialMeta({
						canonicalUrl,
						title: social.title,
						description: social.description,
						imageUrl: `${canonicalUrl}opengraph/banner.jpg`,
					}),
				],
				links: [{ rel: "canonical", href: canonicalUrl }],
			};
		}
		const appUrl = typeof window !== "undefined" ? window.location.origin : "https://rxresu.me";
		const canonicalUrl = getCanonicalRootUrl(appUrl);

		return {
			links: [
				{ rel: "canonical", href: canonicalUrl },
				{ rel: "preload", href: "/videos/timelapse-v1.webp", as: "image", fetchPriority: "high" },
			],
			scripts: [createRootStructuredDataScript(canonicalUrl)],
		};
	},
});

function RouteComponent() {
	const { flags } = Route.useRouteContext();
	const { root } = Route.useLoaderData();
	if (root.status === "unavailable")
		return (
			<main id="main-content">
				<NotFoundScreen />
			</main>
		);
	if (root.status === "public") {
		return (
			<ClientOnly fallback={<LoadingScreen />}>
				<PublicResumePage resume={root.resume} username={root.username} slug={root.slug} flags={flags} isRoot />
			</ClientOnly>
		);
	}

	return (
		<main id="main-content" className="relative">
			<Hero />

			<div className="container mx-auto px-4 sm:px-6 lg:px-12">
				<div className="border-border border-x [&>section:first-child]:border-t-0 [&>section]:border-border [&>section]:border-t">
					<Statistics />
					<Sponsors show={flags.showSponsors} />
					<Features />
					<Templates />
					<Testimonials />
					<DonationBanner />
					<Faq />
					<Prefooter />
					<Footer />
				</div>
			</div>
		</main>
	);
}
