import type { RouterOutput } from "@/libs/orpc/client";
import { AnimatePresence, motion } from "motion/react";
import { CreateResumeCard } from "./cards/create-card";
import { ImportResumeCard } from "./cards/import-card";
import { ResumeCard } from "./cards/resume-card";

type Resume = RouterOutput["resume"]["list"][number];

type Props = {
	resumes: Resume[];
};

export function GridView({ resumes }: Props) {
	return (
		<div className="grid 3xl:grid-cols-6 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -20 }}
				transition={{ duration: 0.2, ease: "easeOut" }}
				className="will-change-[transform,opacity]"
			>
				<CreateResumeCard />
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -20 }}
				transition={{ duration: 0.2, delay: 0.03, ease: "easeOut" }}
				className="will-change-[transform,opacity]"
			>
				<ImportResumeCard />
			</motion.div>

			<AnimatePresence initial={false} mode="popLayout">
				{resumes?.map((resume, index) => (
					<motion.div
						layout
						key={resume.id}
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{
							opacity: 0,
							y: -20,
							filter: "blur(8px)",
						}}
						transition={{ duration: 0.2, delay: Math.min(0.12, (index + 2) * 0.02), ease: "easeOut" }}
						className="will-change-[transform,opacity]"
					>
						<ResumeCard resume={resume} />
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	);
}
