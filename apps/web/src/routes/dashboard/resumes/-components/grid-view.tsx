import type { RouterOutput } from "@/libs/orpc/client";
import { AnimatePresence, m } from "motion/react";
import { CareerCoachCard } from "./cards/career-coach-card";
import { CreateResumeCard } from "./cards/create-card";
import { ImportResumeCard } from "./cards/import-card";
import { ResumeCard } from "./cards/resume-card";
import { WizardResumeCard } from "./cards/wizard-card";

type Resume = RouterOutput["resume"]["list"][number];

type Props = {
	resumes: Resume[];
};

export function GridView({ resumes }: Props) {
	return (
		<div className="grid 3xl:grid-cols-6 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
			<m.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -20 }}
				transition={{ duration: 0.2, ease: "easeOut" }}
				className="will-change-[transform,opacity]"
			>
				<CreateResumeCard />
			</m.div>

			<m.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -20 }}
				transition={{ duration: 0.2, delay: 0.03, ease: "easeOut" }}
				className="will-change-[transform,opacity]"
			>
				<ImportResumeCard />
			</m.div>

			<m.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -20 }}
				transition={{ duration: 0.2, delay: 0.06, ease: "easeOut" }}
				className="will-change-[transform,opacity]"
			>
				<WizardResumeCard />
			</m.div>

			<m.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -20 }}
				transition={{ duration: 0.2, delay: 0.09, ease: "easeOut" }}
				className="will-change-[transform,opacity]"
			>
				<CareerCoachCard />
			</m.div>

			<AnimatePresence initial={false} mode="popLayout">
				{resumes?.map((resume, index) => (
					<m.div
						layout
						key={resume.id}
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{
							opacity: 0,
							y: -20,
							filter: "blur(8px)",
						}}
						transition={{ duration: 0.2, delay: Math.min(0.12, (index + 4) * 0.02), ease: "easeOut" }}
						className="will-change-[transform,opacity]"
					>
						<ResumeCard resume={resume} />
					</m.div>
				))}
			</AnimatePresence>
		</div>
	);
}
