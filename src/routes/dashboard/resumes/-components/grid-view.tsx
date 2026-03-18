import { AnimatePresence, motion } from "motion/react";

import type { RouterOutput } from "@/integrations/orpc/client";

import { CreateResumeCard } from "./cards/create-card";
import { ImportResumeCard } from "./cards/import-card";
import { ResumeCard } from "./cards/resume-card";

type Resume = RouterOutput["resume"]["list"][number];

type Props = {
	resumes: Resume[];
};

export function GridView({ resumes }: Props) {
	return (
		<div className="3xl:grid-cols-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
			<motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
				<CreateResumeCard />
			</motion.div>

			<motion.div
				initial={{ opacity: 0, x: -50 }}
				animate={{ opacity: 1, x: 0 }}
				exit={{ opacity: 0, x: -50 }}
				transition={{ delay: 0.05 }}
			>
				<ImportResumeCard />
			</motion.div>

			<AnimatePresence>
				{resumes?.map((resume, index) => (
					<motion.div
						layout
						key={resume.id}
						initial={{ opacity: 0, x: -50 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, y: -50, filter: "blur(12px)" }}
						transition={{ delay: (index + 2) * 0.05 }}
					>
						<ResumeCard resume={resume} />
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	);
}
