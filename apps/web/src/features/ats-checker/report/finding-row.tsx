import type { PdfFinding, PdfSeverity } from "@reactive-resume/resume/ats-pdf";
import { match } from "ts-pattern";
import { Badge } from "@reactive-resume/ui/components/badge";
import { cn } from "@reactive-resume/utils/style";
import { getPdfFindingMessage, getPdfSeverityLabel } from "../messages";

function severityDotClass(severity: PdfSeverity) {
	return match(severity)
		.with("blocker", () => "bg-rose-600")
		.with("warning", () => "bg-amber-600")
		.with("tip", () => "bg-sky-600")
		.exhaustive();
}

type FindingRowProps = {
	finding: PdfFinding;
};

export function FindingRow({ finding }: FindingRowProps) {
	const message = getPdfFindingMessage(finding.code);
	const evidence = finding.evidence;

	return (
		<li className="space-y-2 rounded-md border bg-card p-3">
			<div className="flex items-start gap-2">
				<span className={cn("mt-1.5 size-2 shrink-0 rounded-full", severityDotClass(finding.severity))} aria-hidden />

				<div className="min-w-0 flex-1 space-y-1">
					<p className="font-medium text-sm leading-snug">{message.title}</p>
					<p className="text-muted-foreground text-xs leading-normal">{message.action}</p>
				</div>

				<Badge variant="secondary" className="shrink-0">
					{getPdfSeverityLabel(finding.severity)}
				</Badge>
			</div>

			{(evidence?.snippet || evidence?.page !== undefined) && (
				<div className="flex flex-wrap items-center gap-2">
					{evidence.snippet && (
						<code className="min-w-0 truncate rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
							{evidence.snippet}
						</code>
					)}
					{evidence.page !== undefined && (
						<Badge variant="outline" className="shrink-0 font-normal text-xs">
							Page {evidence.page}
						</Badge>
					)}
				</div>
			)}
		</li>
	);
}
