import { Trans } from "@lingui/react/macro";
import { QuotesIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo } from "react";

const email = "hello@amruthpillai.com";

const testimonials: string[] = [
	"Great site. Love the interactive interface. You can tell it's designed by someone who wants to use it.",

	"Truly everything about the UX is so intuitive, fluid and lets you customize your CV how you want and so rapidly. I thank you so much for putting the work to release something like this.",

	"I want to appreciate you for making your projects #openSource, most especially your Reactive Resume, which is the handiest truly-free resume maker I've come across. This is a big shoutout to you. Well done!",

	"I'd like to appreciate the great work you've done with rxresu.me. The website's design, smooth functionality, and ease of use under the free plan are really impressive. It's clear that a lot of thought and effort has gone into building and maintaining such a useful platform.",

	"I just wanted to reach you out and thank you personally for your wonderful project rxresu.me. It is very valuable, and the fact that it is open source, makes it all the more meaningful, since there are lots of people who struggle to make their CV look good. For my part, it saved me a lot of time and helped me shape my CV in a very efficient way.",

	"I appreciate your effort in open-sourcing and making it free for everyone to use, it's a great effort. By using this platform, I got a job secured in the government sector of Oman, that too in a ministry. Thank you for providing this platform. Keep going, appreciate the effort. ❤️",

	"Your CV generator just saved my day! Thank you so much, great work!",

	"I want to express my heartfelt gratitude and admiration for your incredible work and remarkable skills. Your projects, especially the Resume Builder, have been immensely helpful to me, and I deeply appreciate the effort and creativity you've poured into them.",

	"Hey! Thank you so much for making this fantastic tool! It helped me get a new job as a Research Software Engineer at Arizona State University.",

	"Wow, what an impressive profile! You are very talented. I'm also a fellow SWE on the job hunt and I came across a linked to Reactive Resume on Reddit and gave it a shot. This could easily be a paid product. Very clean and useful.",

	"Thank you for creating Reactive Resume. It is an amazing product, and I love the design and how it simplifies the resume-making experience. I've been trying to create a good resume for a decade to find my first job in tech, and your tool has been incredibly helpful.",
];

type TestimonialCardProps = {
	testimonial: string;
};

function TestimonialCard({ testimonial }: TestimonialCardProps) {
	return (
		<motion.div
			className="group relative flex w-full flex-col overflow-hidden text-pretty rounded-2xl border bg-card p-4 will-change-transform"
			initial={{ scale: 1, boxShadow: "0 0 20px 0 rgba(0, 0, 0, 0)" }}
			whileHover={{ scale: 1.2, zIndex: 100, boxShadow: "0 0 40px 0 rgba(0, 0, 0, 0.5)" }}
			transition={{ type: "spring", stiffness: 320, damping: 24 }}
		>
			<QuotesIcon
				weight="fill"
				className="absolute -right-2 -bottom-4 size-18 opacity-10 transition-[bottom] duration-200 group-hover:-bottom-16"
			/>
			<p className="flex-1 text-muted-foreground leading-relaxed">{testimonial}</p>
		</motion.div>
	);
}

type TestimonialColumnProps = {
	columnId: string;
	testimonials: string[];
};

function TestimonialColumn({ columnId, testimonials }: TestimonialColumnProps) {
	return (
		<div className="flex w-[320px] shrink-0 flex-col gap-y-4 sm:w-[360px] md:w-[400px]">
			{testimonials.map((testimonial, index) => (
				<TestimonialCard key={`${columnId}-${index}`} testimonial={testimonial} />
			))}
		</div>
	);
}

type MarqueeMasonryProps = {
	columns: string[][];
	direction: "left" | "right";
	duration?: number;
};

function MarqueeMasonry({ columns, direction, duration = 30 }: MarqueeMasonryProps) {
	const animateX = direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"];
	const marqueeColumns = [...columns, ...columns];

	return (
		<motion.div
			className="flex items-start gap-x-4 will-change-transform"
			animate={{ x: animateX }}
			transition={{ x: { repeat: Number.POSITIVE_INFINITY, repeatType: "loop", duration, ease: "linear" } }}
		>
			{marqueeColumns.map((column, index) => (
				<TestimonialColumn key={index} columnId={`column-${index}`} testimonials={column} />
			))}
		</motion.div>
	);
}

export function Testimonials() {
	const columns = useMemo(() => {
		const columns: string[][] = [];

		for (let index = 0; index < testimonials.length; index += 2) {
			columns.push(testimonials.slice(index, index + 2));
		}

		return columns;
	}, []);

	return (
		<section id="testimonials" className="overflow-hidden py-12 md:py-16 xl:py-20">
			<motion.div
				className="mb-10 flex flex-col items-center space-y-4 px-4 text-center md:px-8"
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.6 }}
			>
				<h2 className="font-semibold text-2xl tracking-tight md:text-4xl xl:text-5xl">
					<Trans>Testimonials</Trans>
				</h2>

				<p className="max-w-4xl text-balance text-muted-foreground leading-relaxed">
					<Trans>
						A lot of people have written to me over the years to share their experiences with Reactive Resume and how it
						has helped them, and I never get tired of reading them. If you have a story to share, let me know by sending
						me an email at{" "}
						<a
							href={`mailto:${email}`}
							target="_blank"
							rel="noopener noreferrer"
							className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-primary"
						>
							{email}
						</a>
						.
					</Trans>
				</p>
			</motion.div>

			<div className="relative">
				{/* Left fade */}
				<div className="pointer-events-none absolute inset-s-0 top-0 bottom-0 z-10 w-16 bg-linear-to-r from-background to-transparent sm:w-24 md:w-32 lg:w-48" />

				{/* Right fade */}
				<div className="pointer-events-none absolute inset-e-0 top-0 bottom-0 z-10 w-16 bg-linear-to-l from-background to-transparent sm:w-24 md:w-32 lg:w-48" />

				<MarqueeMasonry columns={columns} direction="left" duration={60} />
			</div>
		</section>
	);
}
