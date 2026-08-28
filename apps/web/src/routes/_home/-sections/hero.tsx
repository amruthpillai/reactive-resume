import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, BookIcon, SparkleIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { m } from "motion/react";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { CometCard } from "@/components/animation/comet-card";
import { Spotlight } from "@/components/animation/spotlight";

export function Hero() {
	return (
		<section
			id="hero"
			className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden border-b py-24"
		>
			<Spotlight />

			<m.div
				className="w-full will-change-[transform,opacity]"
				initial={{ opacity: 0, y: 100 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 1.1, ease: "easeOut" }}
			>
				<CometCard
					glareOpacity={0}
					className="relative mx-auto -mb-12 3xl:max-w-7xl max-w-4xl px-8 md:-mb-24 md:px-12 lg:px-0"
				>
					<video
						loop
						muted
						controls
						playsInline
						preload="none"
						width={1146}
						height={720}
						poster="/videos/timelapse-v1.webp"
						src="/videos/timelapse-v1.mp4"
						aria-label={t`Timelapse of a resume being built in Reactive Resume`}
						className="aspect-[1146/720] w-full rounded-md border object-cover"
					/>

					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-40% via-transparent to-background"
					/>
				</CometCard>
			</m.div>

			<div className="relative z-10 flex max-w-2xl flex-col items-center gap-y-6 px-4 xs:px-0 text-center">
				{/* Badge */}
				<m.a
					className="will-change-[transform,opacity]"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45, delay: 0.55 }}
					whileHover={{ y: -2, scale: 1.01 }}
					whileTap={{ scale: 0.985 }}
					target="_blank"
					rel="noopener noreferrer"
					href="https://docs.rxresu.me/getting-started"
				>
					<Badge variant="secondary" className="h-auto gap-1.5 px-3 py-0.5">
						<SparkleIcon aria-hidden="true" className="size-3.5" weight="fill" />
						<Trans>What's new in the latest version?</Trans>
					</Badge>
				</m.a>

				{/* Headline */}
				<m.div
					className="will-change-[transform,opacity]"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45, delay: 0.7 }}
				>
					<Trans>
						<p className="font-medium text-muted-foreground tracking-tight md:text-lg">Finally,</p>
						<h1 className="mt-1 font-semibold text-4xl tracking-tight md:text-5xl lg:text-6xl">
							A free and open-source resume builder
						</h1>
					</Trans>
				</m.div>

				{/* Description */}
				<m.p
					className="max-w-xl text-base text-muted-foreground leading-relaxed will-change-[transform,opacity] md:text-lg"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45, delay: 0.82 }}
				>
					<Trans>
						Reactive Resume is a free and open-source resume builder that makes it easy to create, update, and share
						your resume.
					</Trans>
				</m.p>

				{/* CTA Buttons */}
				<m.div
					className="flex flex-col items-center gap-3 will-change-[transform,opacity] sm:flex-row sm:gap-4"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45, delay: 0.95 }}
				>
					<Button
						size="lg"
						nativeButton={false}
						className="group relative overflow-hidden px-4"
						render={
							<Link to="/dashboard">
								<span className="relative z-10 flex items-center gap-2">
									<Trans>Get Started</Trans>
									<ArrowRightIcon
										aria-hidden="true"
										className="size-4 transition-transform group-hover:translate-x-0.5"
									/>
								</span>
							</Link>
						}
					/>

					<Button
						size="lg"
						variant="ghost"
						className="gap-2 px-4"
						nativeButton={false}
						render={
							<a href="https://docs.rxresu.me" target="_blank" rel="noopener noreferrer">
								<BookIcon aria-hidden="true" className="size-4" />
								<Trans>Learn More</Trans>
								<span className="sr-only">
									<Trans>(opens in new tab)</Trans>
								</span>
							</a>
						}
					/>
				</m.div>
			</div>

			{/* Scroll indicator - decorative */}
			<m.div
				aria-hidden="true"
				role="presentation"
				className="absolute inset-s-1/2 bottom-8 -translate-x-1/2"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 1.25, duration: 0.7 }}
			>
				<m.div
					className="flex h-8 w-5 items-start justify-center rounded-full border border-muted-foreground/30 p-1.5 will-change-transform"
					animate={{ y: [0, 5, 0] }}
					transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
				>
					<m.div className="h-1.5 w-1 rounded-full bg-muted-foreground/50" />
				</m.div>
			</m.div>
		</section>
	);
}
