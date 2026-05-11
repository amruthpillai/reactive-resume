import { Trans } from "@lingui/react/macro";
import { HandHeartIcon } from "@phosphor-icons/react";
import { useCallback } from "react";
import { toast } from "sonner";
import { useTimeout } from "usehooks-ts";
import { Button } from "@reactive-resume/ui/components/button";
import { useCookie } from "@reactive-resume/ui/hooks/use-cookie";

const TOAST_ID = "donation-toast";
const SHOW_TOAST_DELAY_MS = 5 * 60 * 1000; // 5 minutes
const DISMISSED_COOKIE_NAME = "donation-toast-dismissed";
const DISMISSED_COOKIE_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const getDismissedCookieExpiresAt = () => new Date(Date.now() + DISMISSED_COOKIE_EXPIRES_MS);

export function DonationToast() {
	const [dismissed, setDismissed] = useCookie(DISMISSED_COOKIE_NAME);

	const showToast = useCallback(() => {
		if (dismissed === "true") return;

		const onDonate = (t: string | number) => {
			toast.dismiss(t);
			setDismissed("true", { expires: getDismissedCookieExpiresAt() });
			window.open("https://opencollective.com/reactive-resume/donate", "_blank", "noopener,noreferrer");
		};

		const onDismiss = (t: string | number) => {
			toast.dismiss(t);
			setDismissed("true", { expires: getDismissedCookieExpiresAt() });
		};

		toast.custom((t) => <DonationToastCard onDismiss={() => onDismiss(t)} onDonate={() => onDonate(t)} />, {
			id: TOAST_ID,
			unstyled: true,
			dismissible: false,
			duration: Number.POSITIVE_INFINITY,
		});
	}, [dismissed, setDismissed]);

	useTimeout(showToast, SHOW_TOAST_DELAY_MS);

	return null;
}

type DonationToastCardProps = {
	onDismiss: () => void;
	onDonate: () => void;
};

function DonationToastCard({ onDismiss, onDonate }: DonationToastCardProps) {
	return (
		<div className="w-sm rounded-md bg-popover p-4 shadow-xl">
			<div className="flex items-start gap-3">
				<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-300 text-zinc-950">
					<HandHeartIcon aria-hidden="true" />
				</div>

				<div className="min-w-0 flex-1 space-y-1">
					<p className="font-semibold text-sm tracking-tight">
						<Trans>Please support the project</Trans>
					</p>
					<p className="text-pretty text-muted-foreground text-xs">
						<Trans>Reactive Resume is free and open source. If it has helped you, please consider donating.</Trans>
					</p>
				</div>
			</div>

			<div className="mt-4 grid grid-cols-2 gap-2">
				<Button size="sm" variant="outline" onClick={onDismiss}>
					<Trans>Dismiss</Trans>
				</Button>
				<Button size="sm" onClick={onDonate} className="bg-amber-300 text-zinc-950 hover:bg-amber-200">
					<Trans>Donate</Trans>
				</Button>
			</div>
		</div>
	);
}
