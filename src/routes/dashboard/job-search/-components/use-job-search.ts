import { t } from "@lingui/core/macro";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import type { JobResult, RapidApiQuota } from "@/schema/jobs";

import { useJobsStore } from "@/integrations/jobs/store";
import { orpc } from "@/integrations/orpc/client";

import {
  buildPostFilters,
  buildSearchParams,
  type FilterState,
  initialFilterState,
  RESULTS_PER_PAGE,
} from "./search-filters";

type ActiveFilterChip = { key: keyof FilterState; label: string; value?: string };

export function useJobSearch() {
  const rapidApiKey = useJobsStore((state) => state.rapidApiKey);
  const testStatus = useJobsStore((state) => state.testStatus);
  const setJobsStore = useJobsStore((state) => state.set);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [quota, setQuota] = useState<RapidApiQuota | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobResult | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const { mutate: searchJobs, isPending } = useMutation(orpc.jobs.search.mutationOptions());

  const isConfigured = Boolean(rapidApiKey && testStatus === "success");

  const executeSearch = useCallback(
    (page: number) => {
      if (!rapidApiKey) return;

      const requestId = ++requestIdRef.current;
      const effectiveQuery = query.trim() || "jobs";
      const params = buildSearchParams(effectiveQuery, filters, page);
      const postFilters = buildPostFilters(filters);
      setError(null);

      searchJobs(
        { apiKey: rapidApiKey, params, filters: postFilters },
        {
          onSuccess: (data) => {
            if (requestId !== requestIdRef.current) return;

            setHasMore(data.data.length >= RESULTS_PER_PAGE);
            setJobs(data.data.slice(0, RESULTS_PER_PAGE));
            setQuota(data.rapidApiQuota ?? null);

            const rapidApiQuota = data.rapidApiQuota;
            if (rapidApiQuota) {
              setJobsStore((draft) => {
                draft.rapidApiQuota = rapidApiQuota;
              });
            }

            scrollRef.current?.scrollIntoView({ behavior: "smooth" });
          },
          onError: (error) => {
            if (requestId !== requestIdRef.current) return;
            setError(error.message);
            toast.error(error.message);
          },
        },
      );
    },
    [filters, query, rapidApiKey, searchJobs, setJobsStore],
  );

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setHasSearched(true);
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

  const removeFilter = (key: keyof FilterState, value?: string) => {
    if (key === "includeKeywords" || key === "excludeKeywords" || key === "excludeCompanies") {
      const currentValues = filters[key];
      if (!Array.isArray(currentValues)) return;
      const nextValues = value ? currentValues.filter((item) => item !== value) : [];
      setFilters({ ...filters, [key]: nextValues });
      return;
    }

    if (key === "remoteOnly" || key === "directApplyOnly") {
      setFilters({ ...filters, [key]: false });
      return;
    }

    setFilters({ ...filters, [key]: initialFilterState[key] as never });
  };

  const activeFilterChips: ActiveFilterChip[] = [
    ...(filters.remoteOnly ? [{ key: "remoteOnly" as const, label: t`Remote only` }] : []),
    ...(filters.directApplyOnly ? [{ key: "directApplyOnly" as const, label: t`Direct apply only` }] : []),
    ...(filters.employmentType ? [{ key: "employmentType" as const, label: filters.employmentType }] : []),
    ...(filters.jobRequirements ? [{ key: "jobRequirements" as const, label: filters.jobRequirements }] : []),
    ...(filters.datePosted && filters.datePosted !== "all"
      ? [{ key: "datePosted" as const, label: filters.datePosted }]
      : []),
    ...filters.includeKeywords.map((value) => ({ key: "includeKeywords" as const, label: `+${value}`, value })),
    ...filters.excludeKeywords.map((value) => ({ key: "excludeKeywords" as const, label: `-${value}`, value })),
    ...filters.excludeCompanies.map((value) => ({
      key: "excludeCompanies" as const,
      label: t`Exclude ${value}`,
      value,
    })),
  ];

  return {
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
  };
}
