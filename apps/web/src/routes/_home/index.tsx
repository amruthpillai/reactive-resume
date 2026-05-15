import { createFileRoute } from "@tanstack/react-router";
import { createRootStructuredDataScript, getCanonicalRootUrl } from "@/libs/seo";
import { DonationBanner } from "./-sections/donate";
import { FAQ } from "./-sections/faq";
import { Features } from "./-sections/features";
import { Footer } from "./-sections/footer";
import { Hero } from "./-sections/hero";
import { Prefooter } from "./-sections/prefooter";
import { Statistics } from "./-sections/statistics";
import { Templates } from "./-sections/templates";
import { Testimonials } from "./-sections/testimonials";

export const Route = createFileRoute("/_home/")({
	component: RouteComponent,
	head: () => {
		const appUrl = typeof window !== "undefined" ? window.location.origin : "https://rxresu.me";
		const canonicalUrl = getCanonicalRootUrl(appUrl);

		return {
			links: [{ rel: "canonical", href: canonicalUrl }],
			scripts: [createRootStructuredDataScript(canonicalUrl)],
		};
	},
});

function RouteComponent() {
	return (
		<main id="main-content" className="relative">
			<Hero />

			<div className="container mx-auto px-4 sm:px-6 lg:px-12">
				<div className="border-border border-x [&>section:first-child]:border-t-0 [&>section]:border-border [&>section]:border-t">
					<Statistics />
					<Features />
					<Templates />
					<Testimonials />
					<DonationBanner />
					<FAQ />
					<Prefooter />
					<Footer />
				</div>
			</div>
		</main>
	);
}
