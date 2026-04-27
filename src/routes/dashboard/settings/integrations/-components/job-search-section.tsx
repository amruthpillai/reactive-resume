import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CheckCircleIcon, InfoIcon, LinkSimpleIcon, XCircleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { useJobsStore } from "@/integrations/jobs/store";
import { orpc } from "@/integrations/orpc/client";
import { getOrpcErrorMessage } from "@/utils/error-message";

function RapidAPIKeyForm() {
  const { set, rapidApiKey, testStatus } = useJobsStore();

  const { mutate: testConnection, isPending: isTesting } = useMutation(orpc.jobs.testConnection.mutationOptions());

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

          toast.error(
            getOrpcErrorMessage(error, {
              byCode: {
                BAD_GATEWAY: t({
                  comment: "Error shown when JSearch API connection test fails in job search settings",
                  message: "Could not reach JSearch API. Check your API key and try again.",
                }),
              },
              fallback: t({
                comment: "Fallback toast when testing RapidAPI job search connection fails",
                message: "Failed to test RapidAPI connection. Please try again.",
              }),
            }),
          );
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
          onChange={(e) =>
            set((draft) => {
              draft.rapidApiKey = e.target.value;
            })
          }
          placeholder={t`Enter your RapidAPI key`}
          autoCorrect="off"
          autoComplete="off"
          spellCheck="false"
          autoCapitalize="off"
          data-lpignore="true"
          data-bwignore="true"
          data-1p-ignore="true"
        />

        <p className="text-xs text-muted-foreground">
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

function RapidAPIQuotaDisplay() {
  const { testStatus, rapidApiQuota } = useJobsStore();

  if (!rapidApiQuota || testStatus !== "success") return null;

  const { used, limit, remaining } = rapidApiQuota;
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="flex w-full flex-col gap-2">
      <Progress value={percent} id="jobs-quota-progress" className="w-full max-w-md">
        <ProgressLabel>
          <Trans>API Usage</Trans>
        </ProgressLabel>
        <ProgressValue />
      </Progress>

      <p className="text-xs text-muted-foreground">
        <Trans>
          {used} of {limit} requests used ({remaining} remaining)
        </Trans>
      </p>
    </div>
  );
}

export function JobSearchSettingsSection() {
  return (
    <section className="grid gap-6">
      <h2 className="text-xl font-semibold">
        <Trans>Job Search</Trans>
      </h2>

      <div className="flex items-start gap-4 rounded-md border bg-popover p-6">
        <div className="rounded-md bg-primary/10 p-2.5">
          <InfoIcon className="text-primary" size={24} />
        </div>

        <div className="flex-1 space-y-2">
          <h3 className="font-semibold">
            <Trans>What is JSearch API?</Trans>
          </h3>

          <p className="leading-relaxed text-muted-foreground">
            <Trans>
              JSearch aggregates job listings from multiple job boards. You can filter by country, date posted, job
              type, remote options, and experience level.
            </Trans>
          </p>

          <Button
            variant="link"
            nativeButton={false}
            render={
              <a
                href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch"
                target="_blank"
                rel="noopener noreferrer"
              >
                <LinkSimpleIcon />
                <Trans>API Reference</Trans>
              </a>
            }
          />

          <p className="leading-relaxed text-muted-foreground">
            <Trans>
              Your RapidAPI key is stored locally on your browser. It is only sent to the server when making a request
              to search for jobs, and is never stored or logged on our servers.
            </Trans>
          </p>
        </div>
      </div>

      <RapidAPIKeyForm />
      <RapidAPIQuotaDisplay />
    </section>
  );
}
