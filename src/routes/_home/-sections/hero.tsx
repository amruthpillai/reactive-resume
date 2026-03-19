import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, BookIcon, SparkleIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";

import { CometCard } from "@/components/animation/comet-card";
import { Spotlight } from "@/components/animation/spotlight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-svh w-svw flex-col items-center justify-center overflow-hidden border-b py-24"
    >
      <Spotlight />

      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        style={{ willChange: "transform, opacity" }}
      >
        <CometCard glareOpacity={0} className="3xl:max-w-7xl relative -mb-12 max-w-4xl px-8 md:-mb-24 md:px-12 lg:px-0">
          <video
            loop
            muted
            autoPlay
            playsInline
            // @ts-expect-error - typescript doesn't know about fetchPriority for video elements
            fetchPriority="high"
            src="/videos/timelapse.mp4"
            aria-label={t`Timelapse demonstration of building a resume with Reactive Resume`}
            className="pointer-events-none size-full rounded-md border object-cover"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-transparent via-40% to-background"
          />
        </CometCard>
      </motion.div>

      <div className="xs:px-0 relative z-10 flex max-w-2xl flex-col items-center gap-y-6 px-4 text-center">
        {/* Badge */}
        <motion.a
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.55 }}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.985 }}
          style={{ willChange: "transform, opacity" }}
          target="_blank"
          rel="noopener noreferrer"
          href="https://docs.rxresu.me/getting-started"
        >
          <Badge variant="secondary" className="h-auto gap-1.5 px-3 py-0.5">
            <SparkleIcon aria-hidden="true" className="size-3.5" weight="fill" />
            <Trans>What's new in the latest version?</Trans>
          </Badge>
        </motion.a>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.7 }}
          style={{ willChange: "transform, opacity" }}
        >
          <Trans>
            <p className="font-medium tracking-tight text-muted-foreground md:text-lg">Finally,</p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              A free and open-source resume builder
            </h1>
          </Trans>
        </motion.div>

        {/* Description */}
        <motion.p
          className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.82 }}
          style={{ willChange: "transform, opacity" }}
        >
          <Trans>
            Reactive Resume is a free and open-source resume builder that simplifies the process of creating, updating,
            and sharing your resume.
          </Trans>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.95 }}
          style={{ willChange: "transform, opacity" }}
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
        </motion.div>
      </div>

      {/* Scroll indicator - decorative */}
      <motion.div
        aria-hidden="true"
        role="presentation"
        className="absolute inset-s-1/2 bottom-8 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.25, duration: 0.7 }}
      >
        <motion.div
          className="flex h-8 w-5 items-start justify-center rounded-full border border-muted-foreground/30 p-1.5"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: "transform" }}
        >
          <motion.div className="h-1.5 w-1 rounded-full bg-muted-foreground/50" />
        </motion.div>
      </motion.div>
    </section>
  );
}
