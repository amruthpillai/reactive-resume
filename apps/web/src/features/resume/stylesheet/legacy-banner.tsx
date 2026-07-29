import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, InfoIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@reactive-resume/ui/components/alert";
import { Button } from "@reactive-resume/ui/components/button";

export type LegacyStylesheetBannerProps = {
	disabled: boolean;
	onActivate(): void;
};

export function LegacyStylesheetBanner({ disabled, onActivate }: LegacyStylesheetBannerProps) {
	return (
		<Alert>
			<InfoIcon />
			<AlertTitle>
				<Trans>Converted stylesheet draft</Trans>
			</AlertTitle>
			<AlertDescription className="space-y-3">
				<p>
					<Trans>Your legacy styles remain active until you explicitly activate this Semantic CSS draft.</Trans>
				</p>
				<Button type="button" size="sm" disabled={disabled} onClick={onActivate}>
					<Trans>Activate Semantic CSS</Trans>
					<ArrowRightIcon data-icon="inline-end" />
				</Button>
			</AlertDescription>
		</Alert>
	);
}

export function SemanticStylesheetReadOnlyNotice() {
	return (
		<Alert>
			<InfoIcon />
			<AlertTitle>
				<Trans>Semantic styles remain active</Trans>
			</AlertTitle>
			<AlertDescription>
				<Trans>This instance does not currently allow Semantic CSS editing.</Trans>
			</AlertDescription>
		</Alert>
	);
}
