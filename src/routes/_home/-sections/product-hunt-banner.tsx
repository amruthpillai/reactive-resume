import { Trans } from "@lingui/react/macro";
import { HeartIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

const PH_LAUNCH_START = Date.UTC(2026, 0, 26, 8, 1, 0);
const PH_LAUNCH_END = Date.UTC(2026, 0, 27, 8, 0, 0);

function isWithinProductHuntLaunchWindow() {
	const nowUtc = Date.now();
	return nowUtc >= PH_LAUNCH_START && nowUtc < PH_LAUNCH_END;
}

export function ProductHuntBanner() {
	const [showBanner, setShowBanner] = useState(false);

	useEffect(() => {
		// Only run on client
		if (!isWithinProductHuntLaunchWindow()) {
			setShowBanner(false);
			return;
		}

		setShowBanner(true);
	}, []);

	if (!showBanner) return null;

	return (
		<a
			target="_blank"
			rel="noopener"
			className="flex h-8 items-center justify-center bg-secondary text-center font-medium text-[0.85rem] text-secondary-foreground tracking-tight underline-offset-2 hover:underline"
			href="https://www.producthunt.com/products/reactive-resume/launches/reactive-resume-v5-2?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-reactive-resume-v5-2"
		>
			<Trans>Reactive Resume is launching on Product Hunt today, head over to show some love!</Trans>
			<HeartIcon weight="fill" color="#DA552F" className="ms-2 size-3.5" />
		</a>
	);
}
