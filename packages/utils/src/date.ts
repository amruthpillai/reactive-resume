const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

/**
 * Formats a partial ISO 8601 date string (YYYY, YYYY-MM, or YYYY-MM-DD)
 * into a human-readable format like "January 2024" or "January 15, 2024".
 */
export function formatDate(date: string, includeDay = false): string {
	const parts = date.split("-");

	if (parts.length >= 2) {
		const [year, month] = parts;
		const monthName = MONTH_NAMES[Number.parseInt(month ?? "1", 10) - 1];

		if (parts.length === 3 && includeDay) {
			return `${monthName} ${parts[2]}, ${year}`;
		}

		return `${monthName} ${year}`;
	}

	// YYYY only
	return date;
}

/**
 * Formats a date range from start and end dates.
 * Returns "Start - End", "Start - Present" if no end, or just the end date if no start.
 */
export function formatPeriod(startDate?: string, endDate?: string): string {
	if (!startDate && !endDate) return "";
	if (!startDate) return endDate || "";
	if (!endDate) return `${formatDate(startDate)} - Present`;

	return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

/**
 * Formats a single date with day included (e.g., "January 15, 2024").
 * Falls back to month-year or year-only for partial dates.
 */
export function formatSingleDate(date?: string): string {
	if (!date) return "";
	return formatDate(date, true);
}
