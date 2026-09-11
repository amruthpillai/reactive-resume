import { describe, expect, it } from "vitest";
import { sortSectionItemsByPeriod } from "./section-sort";

type Item = {
	id: string;
	period: string;
	title: string;
	metadata?: { note: string };
};

const item = (id: string, period: string, title = id): Item => ({ id, period, title });
const ids = (items: readonly Item[]) => items.map(({ id }) => id);

describe("sortSectionItemsByPeriod", () => {
	it("orders ongoing, ended, equal, and unresolved periods by the documented total order", () => {
		const equalFirst = item("equal-first", "2020 - 2023");
		const equalSecond = item("equal-second", "2020 - 2023");
		const input = [
			item("blank", ""),
			equalFirst,
			item("ended-2024", "2020 - 2024"),
			item("ongoing-2020", "2020 - Present"),
			item("prose", "A long time ago"),
			item("ended-2025", "2022 - 2025"),
			equalSecond,
			item("ongoing-2024", "January 2024 - Present"),
			item("reversed", "2025 - 2024"),
		];

		const result = sortSectionItemsByPeriod(input, "en-US");

		expect(ids(result.items)).toEqual([
			"ongoing-2024",
			"ongoing-2020",
			"ended-2025",
			"ended-2024",
			"equal-first",
			"equal-second",
			"blank",
			"prose",
			"reversed",
		]);
		expect(result.unresolvedIds).toEqual(["blank", "prose", "reversed"]);
	});

	it("uses locale-aware months and ranks year precision below a known month in the same year", () => {
		const input = [
			item("year-only-end", "2020 - 2024"),
			item("localized-march", "janvier 2020 - mars 2024"),
			item("localized-february", "janvier 2020 - février 2024"),
		];

		const result = sortSectionItemsByPeriod(input, "fr-FR");

		expect(ids(result.items)).toEqual(["localized-march", "localized-february", "year-only-end"]);
		expect(result.unresolvedIds).toEqual([]);
	});

	it("ranks missing end points after known end points, then compares known starts", () => {
		const input = [item("single-2025", "2025"), item("ended-2020", "2019 - 2020"), item("single-2024", "2024")];

		const result = sortSectionItemsByPeriod(input, "en-US");

		expect(ids(result.items)).toEqual(["ended-2020", "single-2025", "single-2024"]);
	});

	it("keeps mixed-precision comparisons transitive", () => {
		const input = [
			item("december-2023", "2020 - December 2023"),
			item("may-2024", "2020 - May 2024"),
			item("year-2024", "2020 - 2024"),
		];

		expect(ids(sortSectionItemsByPeriod(input, "en-US").items)).toEqual(["may-2024", "year-2024", "december-2023"]);
	});

	it("leaves bare ongoing tokens, blanks, prose, and reversed periods stable at the end", () => {
		const input = [
			item("present", "Present"),
			item("known", "2020 - 2021"),
			item("blank", "   "),
			item("prose", "During university"),
			item("reversed", "March 2024 - February 2024"),
		];

		const result = sortSectionItemsByPeriod(input, "en-US");

		expect(ids(result.items)).toEqual(["known", "present", "blank", "prose", "reversed"]);
		expect(result.unresolvedIds).toEqual(["present", "blank", "prose", "reversed"]);
	});

	it("returns new arrays while preserving every original object and all content", () => {
		const first = item("first", "2020 - 2021", "Original title");
		first.metadata = { note: "Keep me" };
		const second = item("second", "2022 - Present", "Another title");
		const input = [first, second];
		const snapshot = structuredClone(input);

		const result = sortSectionItemsByPeriod(input, "en-US");

		expect(result.items).not.toBe(input);
		expect(result.items).toEqual([second, first]);
		expect(result.items[0]).toBe(second);
		expect(result.items[1]).toBe(first);
		expect([...ids(result.items)].sort()).toEqual([...ids(input)].sort());
		expect(input).toEqual(snapshot);
	});

	it("is deterministic across repeated invocation without changing stable ties", () => {
		const input = [item("equal-a", "2020 - 2024"), item("newest", "2021 - 2025"), item("equal-b", "2020 - 2024")];

		const first = sortSectionItemsByPeriod(input, "en-US");
		const second = sortSectionItemsByPeriod(first.items, "en-US");

		expect(ids(first.items)).toEqual(["newest", "equal-a", "equal-b"]);
		expect(ids(second.items)).toEqual(ids(first.items));
		expect(second.unresolvedIds).toEqual(first.unresolvedIds);
	});

	it("returns fresh arrays for empty and single-item inputs", () => {
		const empty: Item[] = [];
		const single = [item("only", "2024")];

		const emptyResult = sortSectionItemsByPeriod(empty, "en-US");
		const singleResult = sortSectionItemsByPeriod(single, "en-US");

		expect(emptyResult).toEqual({ items: [], unresolvedIds: [] });
		expect(emptyResult.items).not.toBe(empty);
		expect(singleResult).toEqual({ items: single, unresolvedIds: [] });
		expect(singleResult.items).not.toBe(single);
		expect(singleResult.items[0]).toBe(single[0]);
	});
});
