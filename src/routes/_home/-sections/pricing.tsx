import { ArrowRightIcon, CheckIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const FREE_FEATURES = [
	"1 resume",
	"3 basic templates",
	"PDF export (watermarked)",
	"2 PDF downloads/month",
	"5 AI suggestions/month",
];

const PRO_FEATURES = [
	"Unlimited resumes",
	"All 13 premium templates",
	"PDF export (no watermark)",
	"Unlimited PDF downloads",
	"Unlimited AI suggestions",
	"Custom public resume URL",
	"Priority support",
];

export function Pricing() {
	return (
		<section id="pricing" className="py-16 sm:py-24">
			<div className="mx-auto max-w-5xl px-4 sm:px-6">
				<motion.div
					className="text-center"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
				>
					<h2 className="font-bold text-3xl tracking-tight sm:text-4xl">Simple pricing</h2>
					<p className="mt-3 text-muted-foreground">Start for free. Upgrade when you need more.</p>
				</motion.div>

				<div className="mt-12 grid gap-8 md:grid-cols-2">
					{/* Free Tier */}
					<motion.div
						className="flex flex-col rounded-xl border bg-card p-8"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.1 }}
					>
						<h3 className="font-semibold text-xl">Free</h3>
						<p className="mt-1 text-muted-foreground text-sm">Get started with the basics</p>

						<div className="mt-6">
							<span className="font-bold text-4xl tracking-tight">$0</span>
							<span className="text-muted-foreground">/month</span>
						</div>

						<ul className="mt-8 flex-1 space-y-3">
							{FREE_FEATURES.map((feature) => (
								<li key={feature} className="flex items-start gap-2 text-sm">
									<CheckIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
									{feature}
								</li>
							))}
						</ul>

						<Button asChild variant="outline" size="lg" className="mt-8">
							<Link to="/auth/register">
								Get Started
								<ArrowRightIcon className="size-4" />
							</Link>
						</Button>
					</motion.div>

					{/* Pro Tier */}
					<motion.div
						className="relative flex flex-col rounded-xl border-2 border-primary bg-card p-8"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.2 }}
					>
						<Badge className="absolute -top-3 right-6">Most Popular</Badge>

						<h3 className="font-semibold text-xl">Pro</h3>
						<p className="mt-1 text-muted-foreground text-sm">Everything you need to land the job</p>

						<div className="mt-6">
							<span className="font-bold text-4xl tracking-tight">$10</span>
							<span className="text-muted-foreground">/month</span>
						</div>

						<ul className="mt-8 flex-1 space-y-3">
							{PRO_FEATURES.map((feature) => (
								<li key={feature} className="flex items-start gap-2 text-sm">
									<CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" weight="bold" />
									{feature}
								</li>
							))}
						</ul>

						<Button asChild size="lg" className="mt-8">
							<Link to="/auth/register">
								Start 7-day free trial
								<ArrowRightIcon className="size-4" />
							</Link>
						</Button>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
