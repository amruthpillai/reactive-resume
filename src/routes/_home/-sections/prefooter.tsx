import { Trans } from "@lingui/react/macro";
import { motion } from "motion/react";
import { TextMaskEffect } from "@/components/animation/text-mask";

export function Prefooter() {
	return (
		<section id="prefooter" className="relative overflow-hidden py-16 md:py-24">
			{/* Background decoration */}
			<div aria-hidden="true" className="pointer-events-none absolute inset-0">
				<div className="absolute start-1/4 top-0 size-96 rounded-full bg-primary/5 blur-3xl" />
				<div className="absolute end-1/4 bottom-0 size-96 rounded-full bg-primary/5 blur-3xl" />
			</div>

			<div className="relative space-y-8">
				<TextMaskEffect aria-hidden="true" text="Reactive Resume" className="hidden md:block" />

				<motion.div
					className="mx-auto max-w-3xl space-y-8 px-6 text-center md:px-8 xl:px-0"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
				>
					<h2 className="font-bold text-2xl tracking-tight md:text-4xl">
						<Trans>By the community, for the community.</Trans>
					</h2>

					<p className="text-muted-foreground leading-relaxed">
						<Trans>
							Reactive Resume continues to grow thanks to its vibrant community. This project owes its progress to
							numerous individuals who've dedicated their time and skills to make it better. We celebrate the coders
							who've enhanced its features on GitHub, the linguists whose translations on Crowdin have made it
							accessible to a broader audience, and the people who've donated to support its continued development.
						</Trans>
					</p>
				</motion.div>
			</div>
		</section>
	);
}
