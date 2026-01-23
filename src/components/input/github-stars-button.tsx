import { t } from "@lingui/core/macro";
import { GithubLogoIcon, StarIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { orpc } from "@/integrations/orpc/client";
import { CountUp } from "../animation/count-up";

export function GithubStarsButton() {
	const { data: starCount } = useQuery(orpc.statistics.github.getStarCount.queryOptions());

	const ariaLabel =
		starCount != null
			? t`Star us on GitHub, currently ${starCount.toLocaleString()} stars (opens in new tab)`
			: t`Star us on GitHub (opens in new tab)`;

	return (
		<Button asChild variant="outline">
			<a target="_blank" href="https://github.com/amruthpillai/reactive-resume" aria-label={ariaLabel} rel="noopener">
				<GithubLogoIcon aria-hidden="true" />
				{starCount != null ? (
					<CountUp to={starCount} duration={0.5} separator="," className="font-bold" aria-hidden="true" />
				) : null}
				<StarIcon aria-hidden="true" />
			</a>
		</Button>
	);
}
