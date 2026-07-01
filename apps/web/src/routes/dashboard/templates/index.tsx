import { t } from "@lingui/core/macro";
import { PaintBrushHouseholdIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, m } from "motion/react";
import { Separator } from "@reactive-resume/ui/components/separator";
import { orpc } from "@/libs/orpc/client";
import { DashboardHeader } from "../-components/header";
import { CreateTemplateCard } from "./-components/create-card";
import { TemplateCard } from "./-components/template-card";

export const Route = createFileRoute("/dashboard/templates/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { data: templates } = useQuery(orpc.customTemplate.list.queryOptions());

	return (
		<div className="space-y-4">
			<DashboardHeader icon={PaintBrushHouseholdIcon} title={t`Templates`} />

			<Separator />

			<div className="grid 3xl:grid-cols-6 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
				<m.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					transition={{ duration: 0.2, ease: "easeOut" }}
					className="will-change-[transform,opacity]"
				>
					<CreateTemplateCard />
				</m.div>

				<AnimatePresence initial={false} mode="popLayout">
					{templates?.map((template, index) => (
						<m.div
							layout
							key={template.id}
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
							transition={{ duration: 0.2, delay: Math.min(0.12, (index + 1) * 0.02), ease: "easeOut" }}
							className="will-change-[transform,opacity]"
						>
							<TemplateCard template={template} />
						</m.div>
					))}
				</AnimatePresence>
			</div>
		</div>
	);
}
