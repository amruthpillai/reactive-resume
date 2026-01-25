import { t } from "@lingui/core/macro";
import type { Icon } from "@phosphor-icons/react";
import { FileTextIcon, UsersIcon } from "@phosphor-icons/react";
import { useQueries } from "@tanstack/react-query";
import { motion } from "motion/react";
import { CountUp } from "@/components/animation/count-up";
import { orpc } from "@/integrations/orpc/client";

type Statistic = {
	id: string;
	label: string;
	value: number;
	icon: Icon;
};

const getStatistics = (userCount: number, resumeCount: number): Statistic[] => [
	{
		id: "users",
		label: t`Users`,
		value: userCount,
		icon: UsersIcon,
	},
	{
		id: "resumes",
		label: t`Resumes`,
		value: resumeCount,
		icon: FileTextIcon,
	},
];

type StatisticCardProps = {
	statistic: Statistic;
	index: number;
};

function StatisticCard({ statistic, index }: StatisticCardProps) {
	const Icon = statistic.icon;

	return (
		<motion.div
			className="group relative flex flex-col items-center justify-center gap-y-4 border-r border-b p-8 transition-colors last:border-e-0 hover:bg-secondary/30 sm:border-b-0 xl:py-12"
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-50px" }}
			transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
		>
			{/* Background decoration */}
			<div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
				<motion.div
					className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/2"
					initial={{ scale: 0.8, opacity: 0 }}
					whileInView={{ scale: 1, opacity: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
				>
					<Icon size={180} weight="thin" />
				</motion.div>
			</div>

			{/* Icon */}
			<motion.div
				aria-hidden="true"
				className="relative rounded-full bg-primary/10 p-3 text-primary"
				whileHover={{ scale: 1.05 }}
				transition={{ type: "spring", stiffness: 400, damping: 20 }}
			>
				<Icon size={24} weight="thin" />
			</motion.div>

			{/* Value */}
			<CountUp
				key={statistic.id}
				separator=","
				duration={0.8}
				to={statistic.value}
				className="font-bold text-5xl tracking-tight md:text-6xl"
			/>

			{/* Label */}
			<p className="relative font-medium text-base text-muted-foreground tracking-tight">{statistic.label}</p>
		</motion.div>
	);
}

export function Statistics() {
	const [userCountResult, resumeCountResult] = useQueries({
		queries: [orpc.statistics.user.getCount.queryOptions(), orpc.statistics.resume.getCount.queryOptions()],
	});

	if (!userCountResult.data || !resumeCountResult.data) return null;

	return (
		<section id="statistics" aria-labelledby="stats-heading">
			<h2 id="stats-heading" className="sr-only">
				{t`Application Statistics`}
			</h2>

			<div className="grid grid-cols-1 sm:grid-cols-2">
				{getStatistics(userCountResult.data, resumeCountResult.data).map((statistic, index) => (
					<StatisticCard key={statistic.id} statistic={statistic} index={index} />
				))}
			</div>
		</section>
	);
}
