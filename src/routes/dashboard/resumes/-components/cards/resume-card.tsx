import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { CircleNotchIcon, DotsThreeIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { match, P } from "ts-pattern";

import { Button } from "@/components/ui/button";
import { orpc, type RouterOutput } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";

import { ResumeContextMenu } from "../menus/context-menu";
import { ResumeDropdownMenu } from "../menus/dropdown-menu";
import { BaseCard } from "./base-card";

type ResumeCardProps = {
  resume: RouterOutput["resume"]["list"][number];
};

export function ResumeCard({ resume }: ResumeCardProps) {
  const { i18n } = useLingui();

  const { data: screenshotData, isLoading } = useQuery(
    orpc.printer.getResumeScreenshot.queryOptions({ input: { id: resume.id } }),
  );

  const updatedAt = useMemo(() => {
    return Intl.DateTimeFormat(i18n.locale, { dateStyle: "long", timeStyle: "short" }).format(resume.updatedAt);
  }, [i18n.locale, resume.updatedAt]);

  return (
    <ResumeContextMenu resume={resume}>
      <motion.div
        whileHover={{ y: -2, scale: 1.005 }}
        whileTap={{ scale: 0.998 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        style={{ willChange: "transform" }}
        className="group/card relative"
      >
        <Link to="/builder/$resumeId" params={{ resumeId: resume.id }} className="block cursor-default">
          <BaseCard title={resume.name} description={t`Last updated on ${updatedAt}`} tags={resume.tags}>
            {match({ isLoading, imageSrc: screenshotData?.url })
              .with({ isLoading: true }, () => (
                <div className="flex size-full items-center justify-center">
                  <CircleNotchIcon weight="thin" className="size-12 animate-spin" />
                </div>
              ))
              .with({ imageSrc: P.string }, ({ imageSrc }) => (
                <img
                  src={imageSrc}
                  alt={resume.name}
                  className={cn("size-full object-cover transition-all", resume.isLocked && "blur-xs")}
                />
              ))
              .otherwise(() => null)}

            <ResumeLockOverlay isLocked={resume.isLocked} />
          </BaseCard>
        </Link>

        <div className="absolute top-3 right-3 z-20 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within/card:opacity-100 sm:group-hover/card:opacity-100">
          <ResumeDropdownMenu resume={resume} align="end">
            <Button
              size="icon-sm"
              variant="secondary"
              aria-label={t`Resume actions`}
              className="rounded-full bg-background/80 shadow-sm backdrop-blur-xs"
            >
              <DotsThreeIcon className="size-4" />
            </Button>
          </ResumeDropdownMenu>
        </div>
      </motion.div>
    </ResumeContextMenu>
  );
}

function ResumeLockOverlay({ isLocked }: { isLocked: boolean }) {
  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          key="resume-lock-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ willChange: "opacity" }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="flex items-center justify-center rounded-full bg-popover p-6">
            <LockSimpleIcon weight="thin" className="size-12 opacity-60" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
