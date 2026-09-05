import { msg, t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
	DownloadSimpleIcon,
	GridFourIcon,
	GridNineIcon,
	ListIcon,
	MagnifyingGlassIcon,
	PlusIcon,
	ReadCvLogoIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import z from "zod";
import { Button } from "@reactive-resume/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@reactive-resume/ui/components/input-group";
import { Label } from "@reactive-resume/ui/components/label";
import { Separator } from "@reactive-resume/ui/components/separator";
import { Tabs, TabsList, TabsTrigger } from "@reactive-resume/ui/components/tabs";
import { cn } from "@reactive-resume/utils/style";
import { Combobox } from "@/components/ui/combobox";
import { useDialogStore } from "@/dialogs/store";
import { orpc } from "@/libs/orpc/client";
import { DashboardHeader } from "../-components/header";
import { GridView } from "./-components/grid-view";
import { ListView } from "./-components/list-view";
import { resumeViewSchema, useResumeView } from "./-components/view-mode";

type SortOption = "lastUpdatedAt" | "createdAt" | "name";

const searchSchema = z.object({
	search: z.string().default(""),
	tags: z.array(z.string()).default([]),
	sort: z.enum(["lastUpdatedAt", "createdAt", "name"]).default("lastUpdatedAt"),
	view: resumeViewSchema.optional().catch(undefined),
});

type Search = z.output<typeof searchSchema>;

const defaultSearch: Search = { search: "", tags: [], sort: "lastUpdatedAt" };

export const Route = createFileRoute("/dashboard/resumes/")({
	component: RouteComponent,
	validateSearch: searchSchema,
	search: {
		middlewares: [stripSearchParams(defaultSearch)],
	},
});

function RouteComponent() {
	const { i18n } = useLingui();
	const { search, tags, sort, view: searchView } = Route.useSearch();
	const { session } = Route.useRouteContext();
	const view = useResumeView(searchView, session.user.id);
	const navigate = useNavigate({ from: Route.fullPath });
	const { openDialog } = useDialogStore();

	const { data: allTags } = useQuery(orpc.resume.tags.list.queryOptions());
	const { data: resumes } = useQuery(orpc.resume.list.queryOptions({ input: { tags, sort } }));

	const filteredResumes = useMemo(() => {
		const list = resumes ?? [];
		const query = search.trim().toLowerCase();
		if (!query) return list;
		return list.filter(
			(resume) => resume.name.toLowerCase().includes(query) || resume.slug.toLowerCase().includes(query),
		);
	}, [resumes, search]);

	const tagOptions = useMemo(() => {
		if (!allTags) return [];
		return allTags.map((tag) => ({ value: tag, label: tag }));
	}, [allTags]);

	const sortOptions = useMemo(() => {
		return [
			{ value: "lastUpdatedAt", label: i18n.t(msg`Last Updated`) },
			{ value: "createdAt", label: i18n.t(msg`Created`) },
			{ value: "name", label: i18n.t(msg`Name`) },
		];
	}, [i18n]);

	return (
		<div className="space-y-4">
			<DashboardHeader
				icon={ReadCvLogoIcon}
				title={t`Resumes`}
				actions={
					(resumes?.length ?? 0) > 0 ? (
						<>
							<Button size="sm" variant="outline" onClick={() => openDialog("resume.create", undefined)}>
								<PlusIcon />
								<Trans>Create</Trans>
							</Button>
							<Button size="sm" variant="outline" onClick={() => openDialog("resume.import", undefined)}>
								<DownloadSimpleIcon />
								<Trans>Import</Trans>
							</Button>
						</>
					) : undefined
				}
			/>

			<Separator />

			<div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
				<div className="grid min-w-0 gap-1.5 sm:flex sm:items-center sm:gap-2">
					<Label className="text-muted-foreground text-xs sm:text-sm">
						<Trans>Sort by</Trans>
					</Label>
					<Combobox
						className="w-full sm:w-44"
						value={sort}
						options={sortOptions}
						placeholder={t`Sort by`}
						onValueChange={(value) => {
							if (!value) return;
							void navigate({ search: (prev: Search) => ({ ...prev, sort: value as SortOption }) });
						}}
					/>
				</div>

				<div
					className={cn("grid min-w-0 gap-1.5 sm:flex sm:items-center sm:gap-2", { hidden: tagOptions.length === 0 })}
				>
					<Label className="text-muted-foreground text-xs sm:text-sm">
						<Trans>Filter by</Trans>
					</Label>
					<Combobox
						multiple
						className="w-full sm:w-44"
						value={tags}
						options={tagOptions}
						placeholder={t`Filter by`}
						onValueChange={(value) => {
							void navigate({ search: (prev: Search) => ({ ...prev, tags: value ?? [] }) });
						}}
					/>
				</div>

				{(resumes?.length ?? 0) > 5 && (
					<InputGroup className="w-full sm:w-56 lg:w-64">
						<InputGroupAddon align="inline-start">
							<MagnifyingGlassIcon />
						</InputGroupAddon>
						<InputGroupInput
							value={search}
							placeholder={t`Search resumes...`}
							onChange={(event) => {
								const value = event.target.value;
								void navigate({ search: (prev: Search) => ({ ...prev, search: value }) });
							}}
						/>
					</InputGroup>
				)}

				<Tabs className="w-full sm:w-auto ltr:sm:ms-auto rtl:sm:me-auto" value={view}>
					<TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-fit">
						<TabsTrigger
							value="grid"
							nativeButton={false}
							className="rounded-r-none"
							render={<Link to="." search={(prev: Search) => ({ ...prev, view: "grid" })} />}
						>
							<GridFourIcon />
							<Trans>Grid</Trans>
						</TabsTrigger>

						<TabsTrigger
							value="compact"
							nativeButton={false}
							className="rounded-none"
							render={<Link to="." search={(prev: Search) => ({ ...prev, view: "compact" })} />}
						>
							<GridNineIcon />
							<Trans>Compact</Trans>
						</TabsTrigger>

						<TabsTrigger
							value="list"
							nativeButton={false}
							className="rounded-l-none"
							render={<Link to="." search={(prev: Search) => ({ ...prev, view: "list" })} />}
						>
							<ListIcon />
							<Trans>List</Trans>
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{view === "list" ? (
				<ListView resumes={filteredResumes} hasResumes={(resumes?.length ?? 0) > 0} />
			) : (
				<GridView resumes={filteredResumes} hasResumes={(resumes?.length ?? 0) > 0} compact={view === "compact"} />
			)}
		</div>
	);
}
