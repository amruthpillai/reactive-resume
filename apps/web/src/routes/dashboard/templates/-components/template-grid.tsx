import type { RouterOutput } from "@/libs/orpc/client";
import { Trans } from "@lingui/react/macro";
import { AnimatePresence, motion } from "motion/react";
import { EmptyMyTemplates } from "./empty-my-templates";
import { TemplateManagementCard } from "./template-card";

type TemplateRow = RouterOutput["templates"]["list"][number];

type Props = {
	templates: TemplateRow[];
	activeTemplateId: string | undefined;
	resumeId: string | undefined;
	onActivate: (id: string) => void;
	onExport: (id: string) => void;
	onDelete: (id: string) => void;
};

const GRID_CLASS = "grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

export function TemplateGalleryGrid({ templates, activeTemplateId, resumeId, onActivate, onExport, onDelete }: Props) {
	const builtIn = templates.filter((tpl) => tpl.userId === null);
	const userOwned = templates.filter((tpl) => tpl.userId !== null);

	return (
		<div className="space-y-10">
			<section>
				<div className="mb-4 flex items-center gap-x-2">
					<h2 className="font-semibold text-lg tracking-tight">
						<Trans>Built-in</Trans>
					</h2>
					<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">{builtIn.length}</span>
				</div>
				<div className={GRID_CLASS}>
					<AnimatePresence initial={false} mode="popLayout">
						{builtIn.map((tpl, i) => (
							<motion.div
								key={tpl.id}
								layout
								initial={{ opacity: 0, y: -16 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -16 }}
								transition={{ duration: 0.18, delay: Math.min(0.15, i * 0.02), ease: "easeOut" }}
							>
								<TemplateManagementCard
									template={tpl}
									isActive={activeTemplateId === tpl.id}
									resumeId={resumeId}
									onActivate={onActivate}
									onExport={onExport}
									onDelete={onDelete}
								/>
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			</section>

			<section>
				<div className="mb-4 flex items-center gap-x-2">
					<h2 className="font-semibold text-lg tracking-tight">
						<Trans>My Templates</Trans>
					</h2>
					<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">{userOwned.length}</span>
				</div>

				{userOwned.length === 0 ? (
					<EmptyMyTemplates />
				) : (
					<div className={GRID_CLASS}>
						<AnimatePresence initial={false} mode="popLayout">
							{userOwned.map((tpl, i) => (
								<motion.div
									key={tpl.id}
									layout
									initial={{ opacity: 0, y: -16 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -16 }}
									transition={{ duration: 0.18, delay: Math.min(0.15, i * 0.02), ease: "easeOut" }}
								>
									<TemplateManagementCard
										template={tpl}
										isActive={activeTemplateId === tpl.id}
										resumeId={resumeId}
										onActivate={onActivate}
										onExport={onExport}
										onDelete={onDelete}
									/>
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				)}
			</section>
		</div>
	);
}
