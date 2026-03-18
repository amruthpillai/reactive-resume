import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CheckCircleIcon, InfoIcon, MagnifyingGlassIcon, XCircleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useIsClient } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useJobsStore } from "@/integrations/jobs/store";
import { orpc } from "@/integrations/orpc/client";
import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/settings/jobs")({
	component: RouteComponent,
});

function JobsForm() {
	const { set, rapidApiKey, testStatus } = useJobsStore();

	const { mutate: testConnection, isPending: isTesting } = useMutation(orpc.jobs.testConnection.mutationOptions());

	const handleApiKeyChange = (value: string) => {
		set((draft) => {
			draft.rapidApiKey = value;
		});
	};

	const handleTestConnection = () => {
		testConnection(
			{ apiKey: rapidApiKey },
			{
				onSuccess: (data) => {
					set((draft) => {
						draft.testStatus = data.success ? "success" : "failure";
						draft.rapidApiQuota = data.rapidApiQuota ?? null;
					});
				},
				onError: (error) => {
					set((draft) => {
						draft.testStatus = "failure";
						draft.rapidApiQuota = null;
					});

					toast.error(error.message);
				},
			},
		);
	};

	return (
		<div className="grid gap-6">
			<div className="flex flex-col gap-y-2">
				<Label htmlFor="rapidapi-key">
					<Trans>RapidAPI Key</Trans>
				</Label>
				<Input
					id="rapidapi-key"
					name="rapidapi-key"
					type="password"
					value={rapidApiKey}
					onChange={(e) => handleApiKeyChange(e.target.value)}
					placeholder={t`Enter your RapidAPI key`}
					autoCorrect="off"
					autoComplete="off"
					spellCheck="false"
					autoCapitalize="off"
					data-lpignore="true"
					data-bwignore="true"
					data-1p-ignore="true"
				/>
				<p className="text-muted-foreground text-xs">
					<Trans>Get your API key from RapidAPI by subscribing to the JSearch API.</Trans>
				</p>
			</div>

			<div>
				<Button variant="outline" disabled={isTesting || !rapidApiKey} onClick={handleTestConnection}>
					{isTesting ? (
						<Spinner />
					) : testStatus === "success" ? (
						<CheckCircleIcon className="text-success" />
					) : testStatus === "failure" ? (
						<XCircleIcon className="text-destructive" />
					) : null}
					<Trans>Test Connection</Trans>
				</Button>
			</div>
		</div>
	);
}

function QuotaDisplay() {
	const { rapidApiQuota } = useJobsStore();

	if (!rapidApiQuota) return null;

	return (
		<div className="flex flex-col gap-y-2">
			<Label>
				<Trans>Monthly Usage</Trans>
			</Label>
			<p className="text-muted-foreground text-sm">
				<Trans>
					{rapidApiQuota.used} of {rapidApiQuota.limit} requests used this month ({rapidApiQuota.remaining} remaining)
				</Trans>
			</p>
		</div>
	);
}

function RouteComponent() {
	const isClient = useIsClient();

	if (!isClient) return null;

	return (
		<div className="space-y-4">
			<DashboardHeader icon={MagnifyingGlassIcon} title={t`Job Search`} />

			<Separator />

			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className="grid max-w-xl gap-6"
			>
				<div className="flex items-start gap-4 rounded-sm border bg-popover p-6">
					<div className="rounded-sm bg-primary/10 p-2.5">
						<InfoIcon className="text-primary" size={24} />
					</div>

					<div className="flex-1 space-y-2">
						<h3 className="font-semibold">
							<Trans>Your data is stored locally</Trans>
						</h3>

						<p className="text-muted-foreground leading-relaxed">
							<Trans>
								Your RapidAPI key is stored locally on your browser. It is only sent to the server when making a request
								to search for jobs, and is never stored or logged on our servers.
							</Trans>
						</p>
					</div>
				</div>

				<Separator />

				<div className="flex items-start gap-4 rounded-sm border bg-info/10 p-6">
					<div className="rounded-sm bg-info/20 p-2.5">
						<InfoIcon className="text-info" size={24} />
					</div>

					<div className="flex-1 space-y-3">
						<h3 className="font-semibold">
							<Trans>About JSearch API</Trans>
						</h3>

						<div className="space-y-2 text-muted-foreground text-sm leading-relaxed">
							<p>
								<Trans>
									JSearch is a Google for Jobs aggregator that searches across multiple job boards. Job listings are
									sourced from various platforms and aggregated by Google's job search service.
								</Trans>
							</p>

							<p>
								<Trans>
									Location filtering uses Google's natural language processing (NLP). For best results, use full country
									names instead of ISO codes . The system constructs location queries as natural language text.
								</Trans>
							</p>

							<p>
								<Trans>
									Supported filters include: date posted, employment types, remote filtering, and experience level
									requirements.
								</Trans>
							</p>

							<p className="text-xs">
								<Trans>
									Learn more:{" "}
									<a
										href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch"
										target="_blank"
										rel="noopener noreferrer"
										className="text-primary underline hover:no-underline"
									>
										JSearch API Documentation
									</a>
								</Trans>
							</p>
						</div>
					</div>
				</div>

				<Separator />

				<JobsForm />

				<Separator />

				<QuotaDisplay />
			</motion.div>
		</div>
	);
}
