import { Trans } from "@lingui/react/macro";
import { motion } from "motion/react";
import { useMemo } from "react";
import type { TemplateMetadata } from "@/dialogs/resume/template/data";
import { templates } from "@/dialogs/resume/template/data";

type TemplateItemProps = {
	metadata: TemplateMetadata;
};

function TemplateItem({ metadata }: TemplateItemProps) {
	return (
		<motion.div
			className="group relative shrink-0"
			initial={{ scale: 1, zIndex: 10 }}
			whileHover={{ scale: 1.08, zIndex: 20 }}
			transition={{ type: "spring", stiffness: 300, damping: 25 }}
		>
			<div className="relative aspect-page w-48 overflow-hidden rounded-lg border bg-card shadow-lg transition-all duration-300 group-hover:shadow-2xl sm:w-56 md:w-64 lg:w-72">
				<img src={metadata.imageUrl} alt={metadata.name} className="size-full object-cover" />

				{/* Subtle overlay on hover */}
				<div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

				{/* Template name on hover */}
				<div className="absolute start-0 end-0 bottom-0 translate-y-full p-4 transition-transform duration-300 group-hover:translate-y-0">
					<p className="font-semibold text-white drop-shadow-lg">{metadata.name}</p>
				</div>

				{/* Shine effect on hover */}
				<div className="pointer-events-none absolute inset-0 -translate-x-full rotate-12 bg-linear-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
			</div>
		</motion.div>
	);
}

type MarqueeRowProps = {
	templates: Array<[string, TemplateMetadata]>;
	rowId: string;
	direction: "left" | "right";
	duration?: number;
};

function MarqueeRow({ templates, rowId, direction, duration = 40 }: MarqueeRowProps) {
	const animateX = direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"];

	return (
		<motion.div
			className="flex gap-x-4 will-change-transform sm:gap-x-6"
			animate={{ x: animateX }}
			transition={{
				x: {
					repeat: Infinity,
					repeatType: "loop",
					duration,
					ease: "linear",
				},
			}}
		>
			{templates.map(([template, metadata], index) => (
				<TemplateItem key={`${rowId}-${template}-${index}`} metadata={metadata} />
			))}
		</motion.div>
	);
}

export function Templates() {
	// Split templates into two rows and duplicate for seamless infinite scroll
	const { row1, row2 } = useMemo(() => {
		const entries = Object.entries(templates);
		const half = Math.ceil(entries.length / 2);
		const firstHalf = entries.slice(0, half);
		const secondHalf = entries.slice(half);

		// Duplicate each row for seamless scrolling
		return {
			row1: [...firstHalf, ...firstHalf],
			row2: [...secondHalf, ...secondHalf],
		};
	}, []);

	return (
		<section id="templates" className="overflow-hidden border-t-0! p-4 md:p-8 xl:py-16">
			<motion.div
				className="space-y-4"
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.6 }}
			>
				<h2 className="font-semibold text-2xl tracking-tight md:text-4xl xl:text-5xl">
					<Trans>Templates</Trans>
				</h2>

				<p className="max-w-2xl text-muted-foreground leading-relaxed">
					<Trans>
						Explore our diverse selection of templates, each designed to fit different styles, professions, and
						personalities. Reactive Resume currently offers 12 templates, with more on the way.
					</Trans>
				</p>
			</motion.div>

			<div className="relative mt-8 -rotate-3 py-8 sm:-rotate-4 lg:mt-0 lg:-rotate-5">
				{/* Marquee container with minimum height */}
				<div className="flex min-h-[280px] flex-col gap-y-4 sm:min-h-[320px] sm:gap-y-6 md:min-h-[380px] lg:min-h-[420px]">
					{/* First row - moves left to right */}
					<MarqueeRow templates={row1} rowId="row1" direction="left" duration={45} />

					{/* Second row - moves right to left (opposite direction) */}
					<MarqueeRow templates={row2} rowId="row2" direction="right" duration={50} />
				</div>
			</div>
		</section>
	);
}
