import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { LockSimpleIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { ResumeContextMenu } from "../menus/context-menu";
import { BaseCard } from "./base-card";
import { ResumeThumbnail } from "./resume-thumbnail";

type ResumeCardProps = {
	resume: RouterOutput["resume"]["list"][number];
};

export function ResumeCard({ resume }: ResumeCardProps) {
	const { i18n } = useLingui();

	const updatedAt = useMemo(() => {
		return Intl.DateTimeFormat(i18n.locale, { dateStyle: "long", timeStyle: "short" }).format(resume.updatedAt);
	}, [i18n.locale, resume.updatedAt]);

	return (
		<ResumeContextMenu resume={resume}>
			<Link to="/builder/$resumeId" params={{ resumeId: resume.id }} className="cursor-default">
				<motion.div
					className="will-change-transform"
					whileHover={{ y: -2, scale: 1.005 }}
					whileTap={{ scale: 0.998 }}
					transition={{ type: "spring", stiffness: 320, damping: 28 }}
				>
					<BaseCard title={resume.name} description={t`Last updated on ${updatedAt}`} tags={resume.tags}>
						<ResumeThumbnail resume={resume} isLocked={resume.isLocked} />

						<ResumeLockOverlay isLocked={resume.isLocked} />
					</BaseCard>
				</motion.div>
			</Link>
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
					className="absolute inset-0 flex items-center justify-center will-change-[opacity]"
				>
					<div className="flex items-center justify-center rounded-full bg-popover p-6">
						<LockSimpleIcon weight="thin" className="size-12 opacity-60" />
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
