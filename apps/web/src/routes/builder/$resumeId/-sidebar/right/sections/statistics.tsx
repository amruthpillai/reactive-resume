import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { InfoIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem } from "@reactive-resume/ui/components/accordion";
import { Alert, AlertDescription, AlertTitle } from "@reactive-resume/ui/components/alert";
import { cn } from "@reactive-resume/utils/style";
import { orpc } from "@/libs/orpc/client";
import { SectionBase } from "../shared/section-base";

// Fetch 60 days so we can render a 30-day sparkline and compare it against the prior 30 days.
const TREND_DAYS = 60;
const WINDOW = 30;

// Percent change of the most recent `window` days vs the `window` days before it.
// Returns null when the prior period had no activity (division by zero / no baseline).
export function computeDelta(series: number[], window: number): number | null {
	const recent = series.slice(-window);
	const previous = series.slice(-window * 2, -window);
	const recentSum = recent.reduce((sum, n) => sum + n, 0);
	const previousSum = previous.reduce((sum, n) => sum + n, 0);
	if (previousSum === 0) return null;
	return Math.round(((recentSum - previousSum) / previousSum) * 100);
}

// Polyline points for the sparkline, or null for degenerate inputs (fewer than two
// points, or an all-zero series) where there is nothing meaningful to draw.
export function getSparklinePoints(values: number[], width: number, height: number): string | null {
	if (values.length < 2 || values.every((n) => n === 0)) return null;
	const max = Math.max(...values, 1);
	const step = width / (values.length - 1);
	return values
		.map((value, index) => `${(index * step).toFixed(1)},${(height - (value / max) * height).toFixed(1)}`)
		.join(" ");
}

export function StatisticsSectionBuilder() {
	const params = useParams({ from: "/builder/$resumeId" });
	const { data: statistics } = useQuery(
		orpc.resume.statistics.getById.queryOptions({ input: { id: params.resumeId } }),
	);
	const { data: daily } = useQuery(
		orpc.resume.statistics.getDailyById.queryOptions({
			input: { id: params.resumeId, days: TREND_DAYS },
			enabled: Boolean(statistics?.isPublic),
		}),
	);

	if (!statistics) return null;

	const viewsSeries = daily?.map((day) => day.views) ?? [];
	const downloadsSeries = daily?.map((day) => day.downloads) ?? [];

	return (
		<SectionBase type="statistics">
			<Accordion value={statistics.isPublic ? ["isPublic"] : ["isPrivate"]}>
				<AccordionItem value="isPrivate">
					<AccordionContent className="pb-0">
						<Alert>
							<InfoIcon />
							<AlertTitle>
								<Trans>Track your resume's views and downloads</Trans>
							</AlertTitle>
							<AlertDescription>
								<Trans>
									Turn on public sharing to track how many times your resume has been viewed or downloaded. Only you can
									see your resume's statistics.
								</Trans>
							</AlertDescription>
						</Alert>
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="isPublic">
					<AccordionContent className="grid @md:grid-cols-2 grid-cols-1 gap-4 pb-0">
						<StatisticsItem
							label={t`Views`}
							value={statistics.views}
							series={viewsSeries}
							timestamp={statistics.lastViewedAt ? t`Last viewed on ${statistics.lastViewedAt.toDateString()}` : null}
						/>

						<StatisticsItem
							label={t`Downloads`}
							value={statistics.downloads}
							series={downloadsSeries}
							timestamp={
								statistics.lastDownloadedAt ? t`Last downloaded on ${statistics.lastDownloadedAt.toDateString()}` : null
							}
						/>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</SectionBase>
	);
}

type StatisticsItemProps = {
	label: string;
	value: number;
	series: number[];
	timestamp: string | null;
};

function StatisticsItem({ label, value, series, timestamp }: StatisticsItemProps) {
	const recent = series.slice(-WINDOW);
	const delta = computeDelta(series, WINDOW);

	return (
		<div>
			<div className="mb-1 flex items-center justify-between gap-2">
				<h4 className="font-mono font-semibold text-4xl">{value}</h4>
				<Sparkline title={t`${label} over the last 30 days`} values={recent} />
			</div>
			<p className="font-medium text-muted-foreground leading-none">{label}</p>
			{delta === null ? (
				<span className="text-muted-foreground text-xs">
					<Trans>No prior data</Trans>
				</span>
			) : (
				<span className={cn("text-xs", delta >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600")}>
					{`${delta >= 0 ? "+" : ""}${delta}% `}
					<Trans>vs previous 30 days</Trans>
				</span>
			)}
			{timestamp && <span className="block text-muted-foreground text-xs">{timestamp}</span>}
		</div>
	);
}

type SparklineProps = {
	title: string;
	values: number[];
};

function Sparkline({ title, values }: SparklineProps) {
	const width = 80;
	const height = 24;
	const points = getSparklinePoints(values, width, height);

	if (!points) return null;

	return (
		<svg className="text-primary" height={height} role="img" viewBox={`0 0 ${width} ${height}`} width={width}>
			<title>{title}</title>
			<polyline
				fill="none"
				points={points}
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={1.5}
			/>
		</svg>
	);
}
