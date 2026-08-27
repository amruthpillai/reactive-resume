import { Trans } from "@lingui/react/macro";
import { ArrowRightIcon, SparkleIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@reactive-resume/ui/components/button";

/**
 * What a signed-out visitor sees below the report. The deterministic check above is complete on
 * its own; this is an offer, not a paywall on the result they came for.
 */
export function LockedAiCard() {
	return (
		<div className="space-y-3 rounded-md border border-dashed p-4">
			<div className="flex items-center gap-2">
				<SparkleIcon className="size-4 shrink-0 text-muted-foreground" />
				<h4 className="font-semibold text-sm">
					<Trans>Want a second opinion on the writing?</Trans>
				</h4>
			</div>

			<p className="text-muted-foreground text-sm leading-normal">
				<Trans>
					Sign in and connect your own AI provider to get rewrite suggestions for weak bullets. The checks above are
					free and need no account.
				</Trans>
			</p>

			<Button size="sm" variant="outline" nativeButton={false} render={<Link to="/auth/login" />}>
				<Trans>Sign in</Trans>
				<ArrowRightIcon />
			</Button>
		</div>
	);
}
