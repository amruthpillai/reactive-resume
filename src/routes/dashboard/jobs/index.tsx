import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
	BriefcaseIcon,
	BuildingsIcon,
	CaretLeftIcon,
	CaretRightIcon,
	ClockIcon,
	GlobeIcon,
	MagnifyingGlassIcon,
	MapPinIcon,
	MoneyIcon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useJobsStore } from "@/integrations/jobs/store";
import { orpc } from "@/integrations/orpc/client";
import type { JobResult, RapidApiQuota } from "@/schema/jobs";
import { DashboardHeader } from "../-components/header";
import { JobDetailSheet } from "./-components/job-detail";
import {
	buildPostFilters,
	buildSearchParams,
	type FilterState,
	initialFilterState,
	RESULTS_PER_PAGE,
	SearchFilters,
} from "./-components/search-filters";

export const Route = createFileRoute("/dashboard/jobs/")({
	component: RouteComponent,
});

function formatSalary(min: number | null, max: number | null, currency: string | null, period: string | null): string {
	if (!min && !max) return "";

	const fmt = (n: number) => {
		const c = currency ?? "USD";
		try {
			return new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);
		} catch {
			return `${c} ${n.toLocaleString()}`;
		}
	};

	const parts: string[] = [];

	if (min && max) {
		parts.push(`${fmt(min)} - ${fmt(max)}`);
	} else if (min) {
		parts.push(`${fmt(min)}+`);
	} else if (max) {
		parts.push(`Up to ${fmt(max)}`);
	}

	if (period) parts.push(`/ ${period}`);

	return parts.join(" ");
}

function formatPostedDate(timestamp: number | null): string {
	if (!timestamp) return "";
	const date = new Date(timestamp * 1000);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return t`Today`;
	if (diffDays === 1) return t`Yesterday`;
	if (diffDays < 7) return t`${diffDays} days ago`;
	if (diffDays < 30) return t`${Math.floor(diffDays / 7)} weeks ago`;
	return t`${Math.floor(diffDays / 30)} months ago`;
}

function JobCard({ job, onClick }: { job: JobResult; onClick: () => void }) {
	const salary = formatSalary(job.job_min_salary, job.job_max_salary, job.job_salary_currency, job.job_salary_period);
	const posted = formatPostedDate(job.job_posted_at_timestamp);
	const location = [job.job_city, job.job_state, job.job_country].filter(Boolean).join(", ");

	return (
		<motion.button
			type="button"
			className="flex w-full cursor-pointer flex-col gap-y-3 rounded-sm border bg-card p-4 text-start transition-colors hover:bg-accent/50"
			onClick={onClick}
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
		>
			<div className="flex items-start gap-x-3">
				{job.employer_logo ? (
					<img src={job.employer_logo} alt={job.employer_name} className="size-10 shrink-0 rounded-sm object-contain" />
				) : (
					<div className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted">
						<BuildingsIcon className="size-5 text-muted-foreground" />
					</div>
				)}

				<div className="min-w-0 flex-1">
					<h3 className="truncate font-medium">{job.job_title}</h3>
					<p className="truncate text-muted-foreground text-sm">{job.employer_name}</p>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{location && (
					<Badge variant="secondary" className="gap-x-1">
						<MapPinIcon className="size-3" />
						{location}
					</Badge>
				)}

				{job.job_is_remote && (
					<Badge variant="secondary" className="gap-x-1">
						<GlobeIcon className="size-3" />
						<Trans>Remote</Trans>
					</Badge>
				)}

				{job.job_employment_type && (
					<Badge variant="secondary" className="gap-x-1">
						<BriefcaseIcon className="size-3" />
						{job.job_employment_type.replaceAll("_", " ")}
					</Badge>
				)}

				{salary && (
					<Badge variant="secondary" className="gap-x-1">
						<MoneyIcon className="size-3" />
						{salary}
					</Badge>
				)}

				{posted && (
					<Badge variant="outline" className="gap-x-1">
						<ClockIcon className="size-3" />
						{posted}
					</Badge>
				)}
			</div>
		</motion.button>
	);
}

function RouteComponent() {
	const rapidApiKey = useJobsStore((s) => s.rapidApiKey);
	const testStatus = useJobsStore((s) => s.testStatus);
	const [query, setQuery] = useState("");
	const [filters, setFilters] = useState<FilterState>(initialFilterState);
	const [jobs, setJobs] = useState<JobResult[]>([]);
	const [quota, setQuota] = useState<RapidApiQuota | null>(null);
	const [selectedJob, setSelectedJob] = useState<JobResult | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	const { mutate: searchJobs, isPending } = useMutation(orpc.jobs.search.mutationOptions());

	const isConfigured = rapidApiKey && testStatus === "success";

	const executeSearch = useCallback(
		(page: number) => {
			// Allow search if either query or any location field is provided
			const hasQuery = query.trim().length > 0;
			const hasLocation =
				filters.city.trim().length > 0 || filters.state.trim().length > 0 || filters.country.trim().length > 0;

			if ((!hasQuery && !hasLocation) || !rapidApiKey) return;

			// Use a default query if only location is provided
			const effectiveQuery = hasQuery ? query : "jobs";
			const params = buildSearchParams(effectiveQuery, filters, page);
			const postFilters = buildPostFilters(filters);

			searchJobs(
				{ apiKey: rapidApiKey, params, filters: postFilters },
				{
					onSuccess: (data) => {
						setHasMore(data.data.length >= RESULTS_PER_PAGE);
						setJobs(data.data.slice(0, RESULTS_PER_PAGE));
						setQuota(data.rapidApiQuota ?? null);
						scrollRef.current?.scrollIntoView({ behavior: "smooth" });
					},
					onError: (error) => {
						toast.error(error.message);
					},
				},
			);
		},
		[query, filters, rapidApiKey, searchJobs],
	);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setCurrentPage(1);
		executeSearch(1);
	};

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		executeSearch(page);
	};

	const handleJobClick = (job: JobResult) => {
		setSelectedJob(job);
		setSheetOpen(true);
	};

	return (
		<div className="space-y-4">
			<DashboardHeader icon={BriefcaseIcon} title={t`Job Listings`} />

			<Separator />

			{!isConfigured ? (
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className="flex max-w-xl flex-col items-center gap-y-4 py-12 text-center"
				>
					<MagnifyingGlassIcon className="size-12 text-muted-foreground" weight="light" />
					<h2 className="font-medium text-lg">
						<Trans>Configure Job Search</Trans>
					</h2>
					<p className="text-muted-foreground">
						<Trans>To search for job listings, you need to configure your RapidAPI key in settings.</Trans>
					</p>
					<Button asChild variant="outline">
						<Link to="/dashboard/settings/jobs">
							<Trans>Go to Settings</Trans>
						</Link>
					</Button>
				</motion.div>
			) : (
				<div className="space-y-4">
					<form onSubmit={handleSearch} className="flex items-end gap-x-3">
						<div className="flex flex-1 flex-col gap-y-2">
							<Label htmlFor="job-query">
								<Trans>Search</Trans>
							</Label>
							<Input
								id="job-query"
								name="job-query"
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder={t`e.g. Software Engineer`}
								autoCorrect="off"
								autoComplete="off"
								spellCheck="false"
							/>
						</div>

						<Button
							type="submit"
							disabled={
								isPending || (!query.trim() && !filters.city.trim() && !filters.state.trim() && !filters.country.trim())
							}
						>
							{isPending ? <Spinner /> : <MagnifyingGlassIcon />}
							<Trans>Search</Trans>
						</Button>
					</form>

					<div ref={scrollRef} />
					<SearchFilters
						filters={filters}
						onFiltersChange={setFilters}
						onSearch={() => {
							setCurrentPage(1);
							executeSearch(1);
						}}
					/>

					{quota && (
						<p className="text-muted-foreground text-xs">
							<Trans>
								{quota.used} / {quota.limit} requests used this month
							</Trans>
						</p>
					)}

					{jobs.length > 0 && (
						<>
							<div className="grid gap-3 sm:grid-cols-2">
								{jobs.map((job) => (
									<JobCard key={job.job_id} job={job} onClick={() => handleJobClick(job)} />
								))}
							</div>

							<div className="flex items-center justify-center gap-x-4">
								<Button
									variant="outline"
									size="sm"
									disabled={currentPage <= 1 || isPending}
									onClick={() => handlePageChange(currentPage - 1)}
								>
									<CaretLeftIcon className="size-4" />
									<Trans>Previous</Trans>
								</Button>

								<span className="text-muted-foreground text-sm">
									<Trans>Page {currentPage}</Trans>
								</span>

								<Button
									variant="outline"
									size="sm"
									disabled={!hasMore || isPending}
									onClick={() => handlePageChange(currentPage + 1)}
								>
									<Trans>Next</Trans>
									<CaretRightIcon className="size-4" />
								</Button>
							</div>
						</>
					)}

					{!isPending && jobs.length === 0 && query && (
						<div className="py-12 text-center">
							<p className="text-muted-foreground">
								<Trans>No jobs found. Try a different search query.</Trans>
							</p>
						</div>
					)}
				</div>
			)}

			<JobDetailSheet job={selectedJob} open={sheetOpen} onOpenChange={setSheetOpen} />
		</div>
	);
}
