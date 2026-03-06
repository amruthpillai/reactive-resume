import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
	ArrowSquareOutIcon,
	BriefcaseIcon,
	BuildingsIcon,
	ClockIcon,
	GlobeIcon,
	MapPinIcon,
	MoneyIcon,
	StarIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { JobResult } from "@/schema/jobs";
import { TailorDialog } from "./tailor-dialog";

type Props = {
	job: JobResult | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

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

export function JobDetailSheet({ job, open, onOpenChange }: Props) {
	const [tailorOpen, setTailorOpen] = useState(false);

	if (!job) return null;

	const salary = formatSalary(job.job_min_salary, job.job_max_salary, job.job_salary_currency, job.job_salary_period);
	const location = [job.job_city, job.job_state, job.job_country].filter(Boolean).join(", ");

	return (
		<>
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent side="right" className="data-[side=right]:sm:w-[30vw] data-[side=right]:sm:min-w-[400px] data-[side=right]:sm:max-w-none">
					<SheetHeader>
						<div className="flex items-start gap-x-3">
							{job.employer_logo ? (
								<img
									src={job.employer_logo}
									alt={job.employer_name}
									className="size-12 shrink-0 rounded-sm object-contain"
								/>
							) : (
								<div className="flex size-12 shrink-0 items-center justify-center rounded-sm bg-muted">
									<BuildingsIcon className="size-6 text-muted-foreground" />
								</div>
							)}
							<div className="min-w-0 flex-1">
								<SheetTitle className="text-lg">{job.job_title}</SheetTitle>
								<SheetDescription>{job.employer_name}</SheetDescription>
							</div>
						</div>
					</SheetHeader>

					<ScrollArea className="min-h-0 flex-1 px-4">
						<div className="flex flex-col gap-y-4 pb-4">
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

								{job.job_posted_at_datetime_utc && (
									<Badge variant="outline" className="gap-x-1">
										<ClockIcon className="size-3" />
										{new Date(job.job_posted_at_datetime_utc).toLocaleDateString()}
									</Badge>
								)}
							</div>

							<div className="flex gap-x-2">
								<Button asChild className="flex-1">
									<a href={job.job_apply_link} target="_blank" rel="noopener noreferrer">
										<ArrowSquareOutIcon />
										<Trans>Apply</Trans>
									</a>
								</Button>

								<Button variant="outline" className="flex-1" onClick={() => setTailorOpen(true)}>
									<StarIcon />
									<Trans>Tailor Resume</Trans>
								</Button>
							</div>

							<Separator />

							{job.job_description && (
								<div className="flex flex-col gap-y-2">
									<h4 className="font-medium">
										<Trans>Description</Trans>
									</h4>
									<p className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
										{job.job_description}
									</p>
								</div>
							)}

							{job.job_highlights && Object.keys(job.job_highlights).length > 0 && (
								<>
									<Separator />
									{Object.entries(job.job_highlights).map(([category, items]) => (
										<div key={category} className="flex flex-col gap-y-2">
											<h4 className="font-medium capitalize">{category.replaceAll("_", " ")}</h4>
											<ul className="list-inside list-disc space-y-1">
												{(items as string[]).map((item: string, i: number) => (
													<li key={i} className="text-muted-foreground text-sm">
														{item}
													</li>
												))}
											</ul>
										</div>
									))}
								</>
							)}

							{job.job_required_skills && job.job_required_skills.length > 0 && (
								<>
									<Separator />
									<div className="flex flex-col gap-y-2">
										<h4 className="font-medium">
											<Trans>Required Skills</Trans>
										</h4>
										<div className="flex flex-wrap gap-1.5">
											{job.job_required_skills.map((skill) => (
												<Badge key={skill} variant="outline">
													{skill}
												</Badge>
											))}
										</div>
									</div>
								</>
							)}

							{job.job_benefits && job.job_benefits.length > 0 && (
								<>
									<Separator />
									<div className="flex flex-col gap-y-2">
										<h4 className="font-medium">
											<Trans>Benefits</Trans>
										</h4>
										<ul className="list-inside list-disc space-y-1">
											{job.job_benefits.map((benefit) => (
												<li key={benefit} className="text-muted-foreground text-sm">
													{benefit}
												</li>
											))}
										</ul>
									</div>
								</>
							)}

							{job.apply_options.length > 0 && (
								<>
									<Separator />
									<div className="flex flex-col gap-y-2">
										<h4 className="font-medium">
											<Trans>Apply Via</Trans>
										</h4>
										<div className="flex flex-col gap-y-1.5">
											{job.apply_options.map((option, i) => (
												<a
													key={i}
													href={option.apply_link}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center gap-x-2 text-primary text-sm hover:underline"
												>
													<ArrowSquareOutIcon className="size-3.5 shrink-0" />
													{option.publisher || t`Apply Link`}
													{option.is_direct && (
														<Badge variant="outline" className="text-[10px]">
															<Trans>Direct</Trans>
														</Badge>
													)}
												</a>
											))}
										</div>
									</div>
								</>
							)}
						</div>
					</ScrollArea>
				</SheetContent>
			</Sheet>

			<TailorDialog job={job} open={tailorOpen} onOpenChange={setTailorOpen} />
		</>
	);
}
