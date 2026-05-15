import type { IconName } from "@reactive-resume/schema/icons";

const NETWORK_ICON_MAP: Array<{ match: string[]; icon: IconName }> = [
	{ match: ["github"], icon: "github-logo" },
	{ match: ["linkedin"], icon: "linkedin-logo" },
	{ match: ["twitter", "x", "x.com"], icon: "twitter-logo" },
	{ match: ["facebook"], icon: "facebook-logo" },
	{ match: ["instagram"], icon: "instagram-logo" },
	{ match: ["youtube"], icon: "youtube-logo" },
	{ match: ["stackoverflow", "stack-overflow"], icon: "stack-overflow-logo" },
	{ match: ["medium"], icon: "medium-logo" },
	{ match: ["dev.to", "devto"], icon: "code" },
	{ match: ["dribbble"], icon: "dribbble-logo" },
	{ match: ["behance"], icon: "behance-logo" },
	{ match: ["gitlab"], icon: "git-branch" },
	{ match: ["bitbucket", "codepen"], icon: "code" },
];

/**
 * Maps a social network name to a Phosphor icon name.
 * Returns "star" as default if no match is found.
 */
export function getNetworkIcon(network?: string): IconName {
	if (!network) return "star";

	const networkLower = network.toLowerCase();

	for (const entry of NETWORK_ICON_MAP) {
		if (entry.match.some((keyword) => networkLower.includes(keyword))) {
			return entry.icon;
		}
	}

	return "star";
}
