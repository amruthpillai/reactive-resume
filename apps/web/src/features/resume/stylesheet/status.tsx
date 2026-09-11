import type { SemanticCssDiagnostic } from "@reactive-resume/resume/stylesheet";
import { Trans } from "@lingui/react/macro";
import { WarningCircleIcon, WarningIcon } from "@phosphor-icons/react";
import { isFatalStylesheetDiagnostic } from "@reactive-resume/resume/stylesheet";
import { Alert, AlertDescription, AlertTitle } from "@reactive-resume/ui/components/alert";
import { Badge } from "@reactive-resume/ui/components/badge";
import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";

export type StylesheetStatusProps = {
	mode: "legacy" | "semantic";
	status: "idle" | "compiling" | "error";
	diagnostics: readonly SemanticCssDiagnostic[];
};

export function StylesheetStatus({ mode, status, diagnostics }: StylesheetStatusProps) {
	const errors = diagnostics.filter(({ severity }) => severity === "error");
	const warnings = diagnostics.filter(({ severity }) => severity === "warning");
	const hasFatalErrors = status === "error" || diagnostics.some(isFatalStylesheetDiagnostic);
	const hasRecoverableErrors = !hasFatalErrors && errors.length > 0;
	const isPending = status === "compiling";

	return (
		<div className="space-y-2" aria-live="polite">
			{hasFatalErrors ? (
				<Badge variant="destructive">
					<WarningCircleIcon data-icon="inline-start" />
					<Trans>Fatal error</Trans>
				</Badge>
			) : isPending ? (
				<Badge variant="outline">{mode === "legacy" ? <Trans>Checking draft</Trans> : <Trans>Checking</Trans>}</Badge>
			) : hasRecoverableErrors ? (
				<Badge variant="secondary">
					<WarningCircleIcon data-icon="inline-start" />
					{mode === "legacy" ? <Trans>Ready to activate with errors</Trans> : <Trans>Valid with errors</Trans>}
				</Badge>
			) : warnings.length > 0 ? (
				<Badge variant="secondary">
					<WarningIcon data-icon="inline-start" />
					{mode === "legacy" ? <Trans>Ready to activate with warnings</Trans> : <Trans>Valid with warnings</Trans>}
				</Badge>
			) : (
				<Badge variant="secondary">{mode === "legacy" ? <Trans>Ready to activate</Trans> : <Trans>Valid</Trans>}</Badge>
			)}

			{hasFatalErrors && (
				<Alert variant="destructive">
					<WarningCircleIcon />
					<AlertTitle>
						<Trans>Stylesheet has fatal errors</Trans>
					</AlertTitle>
					<AlertDescription>
						<Trans>Preview and export fall back to base styles.</Trans>
					</AlertDescription>
				</Alert>
			)}

			{hasRecoverableErrors && (
				<Alert>
					<WarningCircleIcon />
					<AlertTitle>
						<Trans>Some styles were ignored</Trans>
					</AlertTitle>
					<AlertDescription>
						<Trans>Preview and export keep valid styles and ignore invalid styles.</Trans>
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
