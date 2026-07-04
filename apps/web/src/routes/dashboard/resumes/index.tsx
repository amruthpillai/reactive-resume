import { msg, t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
	DownloadSimpleIcon,
	GridFourIcon,
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

type SortOption = "lastUpdatedAt" | "createdAt" | "name";

const searchSchema = z.object({
	search: z.string().default(""),
	tags: z.array(z.string()).default([]),
	sort: z.enum(["lastUpdatedAt", "createdAt", "name"]).default("lastUpdatedAt"),
	view: z.enum(["grid", "list"]).default("grid"),
});

type Search = z.output<typeof searchSchema>;

const defaultSearch: Search = { search: "", tags: [], sort: "lastUpdatedAt", view: "grid" };

export const Route = createFileRoute("/dashboard/resumes/")({
	component: RouteComponent,
	validateSearch: searchSchema,
	search: {
		middlewares: [stripSearchParams(defaultSearch)],
	},
});

function RouteComponent() {
	const { i18n } = useLingui();
	const { search, tags, sort, view } = Route.useSearch();
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

			<div className="flex items-center gap-x-4">
				<div className="flex gap-2">
					<Label>
						<Trans>Sort by</Trans>
					</Label>
					<Combobox
						value={sort}
						options={sortOptions}
						placeholder={t`Sort by`}
						onValueChange={(value) => {
							if (!value) return;
							void navigate({ search: (prev: Search) => ({ ...prev, sort: value as SortOption }) });
						}}
					/>
				</div>

				<div className={cn("flex gap-2", { hidden: tagOptions.length === 0 })}>
					<Label>
						<Trans>Filter by</Trans>
					</Label>
					<Combobox
						multiple
						value={tags}
						options={tagOptions}
						placeholder={t`Filter by`}
						onValueChange={(value) => {
							void navigate({ search: (prev: Search) => ({ ...prev, tags: value ?? [] }) });
						}}
					/>
				</div>

				{(resumes?.length ?? 0) > 5 && (
					<InputGroup className="w-56">
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

				<Tabs className="ltr:ms-auto rtl:me-auto" value={view}>
					<TabsList>
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
				<GridView resumes={filteredResumes} hasResumes={(resumes?.length ?? 0) > 0} />
			)}
		</div>
	);
}
