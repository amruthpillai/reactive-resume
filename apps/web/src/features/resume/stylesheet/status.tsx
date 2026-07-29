import type { RrssDiagnostic } from "@reactive-resume/resume/stylesheet";
import { Trans } from "@lingui/react/macro";
import { WarningCircleIcon, WarningIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@reactive-resume/ui/components/alert";
import { Badge } from "@reactive-resume/ui/components/badge";
import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";

export type StylesheetStatusProps = {
	mode: "legacy" | "semantic";
	status: "idle" | "compiling" | "preflighting" | "saving" | "applied" | "error";
	diagnostics: readonly RrssDiagnostic[];
};

export function StylesheetStatus({ mode, status, diagnostics }: StylesheetStatusProps) {
	const errors = diagnostics.filter(({ severity }) => severity === "error");
	const warnings = diagnostics.filter(({ severity }) => severity === "warning");
	const hasErrors = status === "error" || errors.length > 0;
	const isPending = status === "compiling" || status === "preflighting" || status === "saving";

	return (
		<div className="space-y-2" aria-live="polite">
			{hasErrors ? (
				<Badge variant="destructive">
					<WarningCircleIcon data-icon="inline-start" />
					<Trans>Error</Trans>
				</Badge>
			) : isPending ? (
				<Badge variant="outline">{mode === "legacy" ? <Trans>Checking draft</Trans> : <Trans>Checking</Trans>}</Badge>
			) : warnings.length > 0 ? (
				<Badge variant="secondary">
					<WarningIcon data-icon="inline-start" />
					{mode === "legacy" ? <Trans>Ready to activate with warnings</Trans> : <Trans>Applied with warnings</Trans>}
				</Badge>
			) : (
				<Badge variant="secondary">
					{mode === "legacy" ? <Trans>Ready to activate</Trans> : <Trans>Applied</Trans>}
				</Badge>
			)}

			{hasErrors && (
				<Alert variant="destructive">
					<WarningCircleIcon />
					<AlertTitle>
						<Trans>Stylesheet has errors</Trans>
					</AlertTitle>
					<AlertDescription>
						<Trans>Preview and export use the last valid version.</Trans>
					</AlertDescription>
				</Alert>
			)}

			{diagnostics.length > 0 && (
				<ScrollArea className="max-h-32 rounded-md border">
					<ul className="space-y-2 p-3 text-xs">
						{diagnostics.map((diagnostic) => (
							<li key={`${diagnostic.code}-${diagnostic.range.start.offset}`} className="space-y-0.5">
								<p className="font-medium">{diagnostic.message}</p>
								<p className="text-muted-foreground">
									<Trans>
										Line {diagnostic.range.start.line}, column {diagnostic.range.start.column}
									</Trans>
								</p>
							</li>
						))}
					</ul>
				</ScrollArea>
			)}
		</div>
	);
}
