import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { match } from "ts-pattern";
import { Badge } from "@reactive-resume/ui/components/badge";
import { cn } from "@reactive-resume/utils/style";

export type AtsAiReview = RouterOutput["ai"]["atsReview"];

type Impact = AtsAiReview["suggestions"][number]["impact"];

function impactDotClass(impact: Impact) {
	return match(impact)
		.with("high", () => "bg-rose-600")
		.with("medium", () => "bg-amber-600")
		.with("low", () => "bg-emerald-600")
		.exhaustive();
}

function impactLabel(impact: Impact) {
	return match(impact)
		.with("high", () => t`High impact`)
		.with("medium", () => t`Medium impact`)
		.with("low", () => t`Low impact`)
		.exhaustive();
}

type AiReviewResultsProps = {
	review: AtsAiReview;
};

export function AiReviewResults({ review }: AiReviewResultsProps) {
	return (
		<div className="space-y-3">
			{review.summary && <p className="text-muted-foreground text-sm leading-normal">{review.summary}</p>}

			{review.suggestions.length > 0 && (
				<div className="space-y-2">
					<h5 className="font-semibold text-sm">
						<Trans>Suggestions</Trans>
					</h5>

					<ul className="space-y-2">
						{review.suggestions.map((suggestion) => (
							<li
								key={`${suggestion.section ?? ""}:${suggestion.issue}`}
								className="space-y-2 rounded-md border bg-card p-3"
							>
								<div className="flex items-start gap-2">
									<span
										className={cn("mt-1.5 size-2 shrink-0 rounded-full", impactDotClass(suggestion.impact))}
										aria-hidden
									/>
									<p className="min-w-0 flex-1 text-sm leading-snug">{suggestion.issue}</p>
									<Badge variant="secondary" className="shrink-0">
										{impactLabel(suggestion.impact)}
									</Badge>
								</div>

								{suggestion.section && (
									<p className="text-muted-foreground text-xs">
										<Trans>In {suggestion.section}</Trans>
									</p>
								)}

								{suggestion.rewrite && (
									<p className="rounded bg-muted p-2 text-muted-foreground text-xs leading-normal">
										{suggestion.rewrite}
									</p>
								)}
							</li>
						))}
					</ul>
				</div>
			)}

			{review.strengths.length > 0 && (
				<div className="space-y-2">
					<h5 className="font-semibold text-sm">
						<Trans>Strengths</Trans>
					</h5>
					<ul className="list-outside list-disc space-y-1 ps-5 text-muted-foreground text-sm">
						{review.strengths.map((strength) => (
							<li key={strength}>{strength}</li>
						))}
					</ul>
				</div>
			)}

			{review.jdAlignment && (
				<div className="space-y-2 rounded-md border bg-card p-3">
					<h5 className="font-semibold text-sm">
						<Trans>Against the job description</Trans>
					</h5>

					{review.jdAlignment.verdict && (
						<p className="text-muted-foreground text-sm leading-normal">{review.jdAlignment.verdict}</p>
					)}

					{review.jdAlignment.missingConcepts.length > 0 && (
						<div className="space-y-1.5">
							<p className="font-medium text-muted-foreground text-xs">
								<Trans>Not evidenced in your resume</Trans>
							</p>
							<div className="flex flex-wrap gap-1.5">
								{review.jdAlignment.missingConcepts.map((concept) => (
									<Badge key={concept} variant="outline" className="font-normal">
										{concept}
									</Badge>
								))}
							</div>
						</div>
					)}

					{review.jdAlignment.strengths.length > 0 && (
						<ul className="list-outside list-disc space-y-1 ps-5 text-muted-foreground text-sm">
							{review.jdAlignment.strengths.map((strength) => (
								<li key={strength}>{strength}</li>
							))}
						</ul>
					)}
				</div>
			)}

			<p className="text-muted-foreground text-xs leading-normal">
				<Trans>
					This review is a language model's opinion of your writing. It does not change the score above, and it can be
					wrong. Treat it as a second opinion.
				</Trans>
			</p>
		</div>
	);
}
