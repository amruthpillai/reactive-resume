import type { RouterOutput } from "@/libs/orpc/client";
import { Trans } from "@lingui/react/macro";
import { AnimatePresence, m } from "motion/react";
import { cn } from "@reactive-resume/utils/style";
import { CreateResumeCard } from "./cards/create-card";
import { ImportResumeCard } from "./cards/import-card";
import { ResumeCard } from "./cards/resume-card";

type Resume = RouterOutput["resume"]["list"][number];

type Props = {
	resumes: Resume[];
	hasResumes: boolean;
	compact?: boolean;
};

export function GridView({ resumes, hasResumes, compact = false }: Props) {
	const gridClassName = cn(
		"grid gap-4",
		compact
			? "3xl:grid-cols-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
			: "3xl:grid-cols-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
	);

	if (resumes.length === 0 && hasResumes) {
		return (
			<p className="py-8 text-center text-muted-foreground text-sm">
				<Trans>No resumes match your search.</Trans>
			</p>
		);
	}

	if (resumes.length === 0) {
		return (
			<div className={gridClassName}>
				<m.div
					initial={{ y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ y: -20 }}
					transition={{ duration: 0.2, ease: "easeOut" }}
					className="will-change-[transform,opacity]"
				>
					<CreateResumeCard />
				</m.div>

				<m.div
					initial={{ y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ y: -20 }}
					transition={{ duration: 0.2, delay: 0.03, ease: "easeOut" }}
					className="will-change-[transform,opacity]"
				>
					<ImportResumeCard />
				</m.div>
			</div>
		);
	}

	return (
		<div className={gridClassName}>
			<AnimatePresence initial={false} mode="popLayout">
				{resumes.map((resume, index) => (
					<m.div
						layout
						key={resume.id}
						initial={{ y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{
							opacity: 0,
							y: -20,
							filter: "blur(8px)",
						}}
						transition={{ duration: 0.2, delay: Math.min(0.12, index * 0.02), ease: "easeOut" }}
						className="will-change-[transform,opacity]"
					>
						<ResumeCard resume={resume} />
					</m.div>
				))}
			</AnimatePresence>
		</div>
	);
}
