import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  BriefcaseIcon,
  CaretLeftIcon,
  CaretRightIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/utils/style";

import { DashboardHeader } from "../-components/header";
import { JobCard } from "./-components/job-card";
import { JobDetailSheet } from "./-components/job-detail";
import { getQuotaStatus } from "./-components/job-utils";
import { hasActiveFilters, initialFilterState, SearchFilters } from "./-components/search-filters";
import { useJobSearch } from "./-components/use-job-search";

export const Route = createFileRoute("/dashboard/job-search/")({
  component: RouteComponent,
});

function RouteComponent() {
  const {
    activeFilterChips,
    currentPage,
    error,
    executeSearch,
    filters,
    handleJobClick,
    handlePageChange,
    handleSearch,
    hasMore,
    hasSearched,
    isConfigured,
    isPending,
    jobs,
    query,
    quota,
    removeFilter,
    scrollRef,
    selectedJob,
    setFilters,
    setQuery,
    setSheetOpen,
    sheetOpen,
  } = useJobSearch();

  const showFilterChips = useMemo(() => hasActiveFilters(filters), [filters]);

  return (
    <div className="space-y-4">
      <DashboardHeader icon={BriefcaseIcon} title={t`Job Search`} />

      <Separator />

      {!isConfigured ? (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto flex max-w-xl flex-col items-center gap-y-4 py-12 text-center"
        >
          <MagnifyingGlassIcon className="size-12 text-muted-foreground" weight="light" />
          <h2 className="text-lg font-medium">
            <Trans>Configure Job Search</Trans>
          </h2>
          <p className="text-muted-foreground">
            <Trans>To search for job listings, you need to configure your RapidAPI key in settings.</Trans>
          </p>
          <Button nativeButton={false} variant="outline" render={<Link to="/dashboard/settings/job-search" />}>
            <Trans>Go to Settings</Trans>
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
                placeholder={t({
                  comment: "Example placeholder text in job search input field",
                  message: "e.g. frontend developer jobs in Berlin",
                })}
                aria-label={t({
                  comment: "Accessible label for free-text job search query field",
                  message: "Job search query",
                })}
                autoCorrect="off"
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner /> : <MagnifyingGlassIcon />}
              <Trans>Search</Trans>
            </Button>
          </form>

          <div ref={scrollRef} />

          <SearchFilters filters={filters} onFiltersChange={setFilters} />

          {showFilterChips && (
            <div className="flex flex-wrap items-center gap-2">
              {activeFilterChips.map((chip) => (
                <button
                  key={`${chip.key}-${chip.value ?? chip.label}`}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => removeFilter(chip.key, chip.value)}
                >
                  {chip.label}
                  <XIcon className="size-3" />
                </button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setFilters(initialFilterState)}>
                <Trans>Clear all</Trans>
              </Button>
            </div>
          )}

          {quota && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  getQuotaStatus(quota) === "healthy" && "text-emerald-600",
                  getQuotaStatus(quota) === "warning" && "text-amber-600",
                  getQuotaStatus(quota) === "critical" && "text-red-600",
                )}
              >
                <Trans>Quota: {quota.remaining} remaining</Trans>
              </Badge>
              <p className="text-xs text-muted-foreground">
                <Trans>
                  {quota.used} / {quota.limit} requests used
                </Trans>
              </p>
            </div>
          )}

          {isPending && jobs.length === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-y-3 rounded-md border bg-card p-4">
                  <div className="flex items-start gap-x-3">
                    <Skeleton className="size-10 shrink-0 rounded-md" />
                    <div className="flex flex-1 flex-col gap-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && !isPending && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
              <div className="flex items-start gap-2">
                <WarningCircleIcon className="mt-0.5 size-4 text-destructive" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    <Trans>Could not fetch jobs</Trans>
                  </p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button size="sm" variant="outline" onClick={() => executeSearch(currentPage)}>
                    <Trans>Retry</Trans>
                  </Button>
                </div>
              </div>
            </div>
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

                <span className="text-sm text-muted-foreground">
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

          {hasSearched && !isPending && jobs.length === 0 && (
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
