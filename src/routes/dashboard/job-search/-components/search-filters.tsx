import { msg, t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { CaretRightIcon, FunnelIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

import { ChipInput } from "@/components/input/chip-input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ISO_COUNTRIES } from "@/constants/iso-countries";

import { type FilterState, hasActiveFilters, initialFilterState } from "./filter-helpers";

export {
  buildPostFilters,
  buildSearchParams,
  type FilterState,
  hasActiveFilters,
  initialFilterState,
  RESULTS_PER_PAGE,
} from "./filter-helpers";

// --- Combobox option constants ---

const datePostedOptions = [
  { value: "all", label: msg`Any time` },
  { value: "today", label: msg`Today` },
  { value: "3days", label: msg`Last 3 days` },
  { value: "week", label: msg`This week` },
  { value: "month", label: msg`This month` },
] as const;

const employmentTypeOptions = [
  { value: "FULLTIME", label: msg`Full-time` },
  { value: "PARTTIME", label: msg`Part-time` },
  { value: "CONTRACTOR", label: msg`Contractor` },
  { value: "INTERN", label: msg`Intern` },
] as const;

const experienceOptions = [
  { value: "no_experience", label: msg`No experience` },
  { value: "under_3_years_experience", label: msg`Under 3 years` },
  { value: "more_than_3_years_experience", label: msg`More than 3 years` },
  { value: "no_degree", label: msg`No degree required` },
] as const;

// --- Component ---

type SearchFiltersProps = {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
};

export function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
  const { i18n } = useLingui();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const _employmentTypeOptions = useMemo(() => {
    return employmentTypeOptions.map((option) => ({
      value: option.value,
      label: i18n.t(option.label),
    }));
  }, [i18n.locale]);

  const _datePostedOptions = useMemo(() => {
    return datePostedOptions.map((option) => ({
      value: option.value,
      label: i18n.t(option.label),
    }));
  }, [i18n.locale]);

  const _experienceOptions = useMemo(() => {
    return experienceOptions.map((option) => ({
      value: option.value,
      label: i18n.t(option.label),
    }));
  }, [i18n.locale]);

  const _countryOptions = useMemo(() => {
    return ISO_COUNTRIES.map((country) => ({
      value: country.code,
      label: country.name,
      keywords: [country.code],
    }));
  }, []);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-3">
      {/* Quick Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="filter-remote" className="text-xs text-muted-foreground">
            <Trans>Remote</Trans>
          </Label>
          <div className="flex h-9 items-center">
            <Switch
              id="filter-remote"
              checked={filters.remoteOnly}
              onCheckedChange={(v) => updateFilter("remoteOnly", v)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="filter-direct-apply" className="text-xs text-muted-foreground">
            <Trans>Direct Apply</Trans>
          </Label>
          <div className="flex h-9 items-center">
            <Switch
              id="filter-direct-apply"
              checked={filters.directApplyOnly}
              onCheckedChange={(v) => updateFilter("directApplyOnly", v)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            <Trans>Type</Trans>
          </Label>
          <Combobox
            options={_employmentTypeOptions}
            value={filters.employmentType}
            onValueChange={(v) => updateFilter("employmentType", v)}
            placeholder={t`Any type`}
            className="h-9 w-[140px] text-sm"
          />
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            <Trans>Date Posted</Trans>
          </Label>
          <Combobox
            options={_datePostedOptions}
            value={filters.datePosted}
            onValueChange={(v) => updateFilter("datePosted", v)}
            placeholder={t`Any time`}
            className="h-9 w-[140px] text-sm"
          />
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            <Trans>Experience</Trans>
          </Label>
          <Combobox
            options={_experienceOptions}
            value={filters.jobRequirements}
            onValueChange={(v) => updateFilter("jobRequirements", v)}
            placeholder={t`Any level`}
            className="h-9 w-[160px] text-sm"
          />
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            <Trans>Country</Trans>
          </Label>
          <Combobox
            options={_countryOptions}
            value={filters.countryCode}
            onValueChange={(value) => {
              if (!value) return;
              updateFilter("countryCode", value);
            }}
            placeholder={t`Select country`}
            searchPlaceholder={t`Search countries`}
            className="h-9 w-[260px] text-sm"
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
        size="sm"
        variant="ghost"
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-sm">
                  <Trans>Minimum Salary</Trans>
                </Label>
                <Input
                  type="number"
                  value={filters.minSalary}
                  onChange={(e) => updateFilter("minSalary", e.target.value)}
                  placeholder={t`e.g. 50000`}
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-sm">
                  <Trans>Maximum Salary</Trans>
                </Label>
                <Input
                  type="number"
                  value={filters.maxSalary}
                  onChange={(e) => updateFilter("maxSalary", e.target.value)}
                  placeholder={t`e.g. 150000`}
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-sm">
                  <Trans>Include Keywords</Trans>
                </Label>
                <ChipInput
                  hideDescription
                  value={filters.includeKeywords}
                  onChange={(v) => updateFilter("includeKeywords", v)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-sm">
                  <Trans>Exclude Keywords</Trans>
                </Label>
                <ChipInput
                  hideDescription
                  value={filters.excludeKeywords}
                  onChange={(v) => updateFilter("excludeKeywords", v)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-sm">
                  <Trans>Exclude Companies</Trans>
                </Label>
                <ChipInput
                  hideDescription
                  value={filters.excludeCompanies}
                  onChange={(v) => updateFilter("excludeCompanies", v)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
