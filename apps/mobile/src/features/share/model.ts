/** Same address grammar as the public-link API. */
export const validSlug = (slug: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
export const normalizeSlug = (slug: string) => slug.toLowerCase().replace(/\s+/g, "-");

type DailyStat = { date: string; views: number; downloads: number };

export function summarizeViews(daily: readonly DailyStat[]) {
	const days = daily.slice(-30);
	const peak = Math.max(0, ...days.map((day) => day.views));
	return {
		views: days.reduce((sum, day) => sum + day.views, 0),
		downloads: days.reduce((sum, day) => sum + day.downloads, 0),
		peak,
		bars: days.map((day) => ({ date: day.date, height: peak > 0 ? day.views / peak : 0 })),
	};
}

export const safeFileName = (name: string) =>
	Array.from(name)
		.filter((character) => character.charCodeAt(0) >= 32)
		.join("")
		.replace(/[<>:"/\\|?*]/g, "")
		.replace(/^\.+|[. ]+$/g, "")
		.trim()
		.slice(0, 100);
