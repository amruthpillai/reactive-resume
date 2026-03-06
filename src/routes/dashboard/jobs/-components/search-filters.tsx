import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CaretRightIcon, FunnelIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ChipInput } from "@/components/input/chip-input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type FilterState, hasActiveFilters, initialFilterState } from "./filter-helpers";

export {
	buildPostFilters,
	buildSearchParams,
	FETCH_NUM_PAGES,
	type FilterState,
	hasActiveFilters,
	initialFilterState,
	RESULTS_PER_PAGE,
} from "./filter-helpers";

// --- Combobox option constants ---

const datePostedOptions = [
	{ value: "all", label: t`Any time` },
	{ value: "today", label: t`Today` },
	{ value: "3days", label: t`Last 3 days` },
	{ value: "week", label: t`This week` },
	{ value: "month", label: t`This month` },
] as const;

const employmentTypeOptions = [
	{ value: "FULLTIME", label: t`Full-time` },
	{ value: "PARTTIME", label: t`Part-time` },
	{ value: "CONTRACTOR", label: t`Contractor` },
	{ value: "INTERN", label: t`Intern` },
] as const;

const experienceOptions = [
	{ value: "no_experience", label: t`No experience` },
	{ value: "under_3_years_experience", label: t`Under 3 years` },
	{ value: "more_than_3_years_experience", label: t`3+ years` },
	{ value: "no_degree", label: t`No degree required` },
] as const;

// --- Component ---

type SearchFiltersProps = {
	filters: FilterState;
	onFiltersChange: (filters: FilterState) => void;
};

export function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
	const [showAdvanced, setShowAdvanced] = useState(false);

	const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
		onFiltersChange({ ...filters, [key]: value });
	};

	return (
		<div className="space-y-3">
			{/* Quick Filters */}
			<div className="flex flex-wrap items-end gap-3">
				<div className="flex items-center gap-x-2">
					<Switch checked={filters.remoteOnly} onCheckedChange={(v) => update("remoteOnly", v)} />
					<Label className="text-sm">
						<Trans>Remote</Trans>
					</Label>
				</div>

				<div className="flex items-center gap-x-2">
					<Switch checked={filters.directApplyOnly} onCheckedChange={(v) => update("directApplyOnly", v)} />
					<Label className="text-sm">
						<Trans>Direct Apply</Trans>
					</Label>
				</div>

				<div className="flex flex-col gap-y-1">
					<Label className="text-muted-foreground text-xs">
						<Trans>Type</Trans>
					</Label>
					<Combobox
						options={[...employmentTypeOptions]}
						value={filters.employmentType}
						onValueChange={(v) => update("employmentType", v)}
						placeholder={t`Any type`}
						buttonProps={{ className: "h-9 w-[140px] text-sm" }}
					/>
				</div>

				<div className="flex flex-col gap-y-1">
					<Label className="text-muted-foreground text-xs">
						<Trans>Date Posted</Trans>
					</Label>
					<Combobox
						options={[...datePostedOptions]}
						value={filters.datePosted}
						onValueChange={(v) => update("datePosted", v)}
						placeholder={t`Any time`}
						buttonProps={{ className: "h-9 w-[140px] text-sm" }}
					/>
				</div>

				<div className="flex flex-col gap-y-1">
					<Label className="text-muted-foreground text-xs">
						<Trans>Experience</Trans>
					</Label>
					<Combobox
						options={[...experienceOptions]}
						value={filters.jobRequirements}
						onValueChange={(v) => update("jobRequirements", v)}
						placeholder={t`Any level`}
						buttonProps={{ className: "h-9 w-[160px] text-sm" }}
					/>
				</div>

				{hasActiveFilters(filters) && (
					<Button variant="ghost" size="sm" className="h-9 gap-x-1" onClick={() => onFiltersChange(initialFilterState)}>
						<XIcon className="size-3.5" />
						<Trans>Reset</Trans>
					</Button>
				)}
			</div>

			{/* Advanced Filters Toggle */}
			<Button
				variant="ghost"
				size="sm"
				className="gap-x-1.5 text-muted-foreground"
				onClick={() => setShowAdvanced((prev) => !prev)}
			>
				<FunnelIcon className="size-3.5" />
				<Trans>Advanced Filters</Trans>
				<CaretRightIcon
					className="size-3 transition-transform"
					style={{ transform: showAdvanced ? "rotate(90deg)" : "rotate(0deg)" }}
				/>
			</Button>

			{/* Advanced Filters Panel */}
			<AnimatePresence initial={false}>
				{showAdvanced && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="overflow-hidden"
					>
						<div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
							<div className="flex flex-col gap-y-1">
								<Label className="text-sm">
									<Trans>Min Salary</Trans>
								</Label>
								<Input
									type="number"
									value={filters.minSalary}
									onChange={(e) => update("minSalary", e.target.value)}
									placeholder={t`e.g. 50000`}
								/>
							</div>

							<div className="flex flex-col gap-y-1">
								<Label className="text-sm">
									<Trans>Max Salary</Trans>
								</Label>
								<Input
									type="number"
									value={filters.maxSalary}
									onChange={(e) => update("maxSalary", e.target.value)}
									placeholder={t`e.g. 150000`}
								/>
							</div>

							<div className="flex flex-col gap-y-1 sm:col-span-2">
								<Label className="text-sm">
									<Trans>Include Keywords</Trans>
								</Label>
								<ChipInput value={filters.includeKeywords} onChange={(v) => update("includeKeywords", v)} />
							</div>

							<div className="flex flex-col gap-y-1 sm:col-span-2">
								<Label className="text-sm">
									<Trans>Exclude Keywords</Trans>
								</Label>
								<ChipInput value={filters.excludeKeywords} onChange={(v) => update("excludeKeywords", v)} />
							</div>

							<div className="flex flex-col gap-y-1 sm:col-span-2">
								<Label className="text-sm">
									<Trans>Exclude Companies</Trans>
								</Label>
								<ChipInput value={filters.excludeCompanies} onChange={(v) => update("excludeCompanies", v)} />
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
