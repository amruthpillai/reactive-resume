import type { AtsRuleCode } from "@reactive-resume/resume/ats";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { LeftSidebarSection, SidebarSection } from "./section";
import { t } from "@lingui/core/macro";
import { match } from "ts-pattern";
import { getSectionTitle, leftSidebarSections } from "./section";

export type AtsFindingMessage = {
	title: string;
	action: string;
};

export type AtsFindingTarget = {
	side: "left" | "right";
	section: SidebarSection;
	itemId?: string;
};

export const atsFindingItemElementId = (itemId: string) => `resume-item-${itemId}`;

export function getAtsFindingMessage(code: AtsRuleCode): AtsFindingMessage {
	return match(code)
		.with("MISSING_NAME", () => ({
			title: t`Your resume has no name.`,
			action: t`Add your full name under Basics.`,
		}))
		.with("MISSING_EMAIL", () => ({
			title: t`Your resume has no email address.`,
			action: t`Most systems file candidates by email. Add one under Basics.`,
		}))
		.with("MALFORMED_EMAIL", () => ({
			title: t`This email address will not be recognized.`,
			action: t`Use a plain address such as name@example.com, with no surrounding text.`,
		}))
		.with("MISSING_PHONE", () => ({
			title: t`Your resume has no phone number.`,
			action: t`Some application systems require one before you can submit.`,
		}))
		.with("MISSING_LOCATION", () => ({
			title: t`Your resume has no location.`,
			action: t`Add at least a city and country so roles can be matched to your region.`,
		}))
		.with("MALFORMED_URL", () => ({
			title: t`This link is missing its protocol.`,
			action: t`Write the full address, including https://.`,
		}))
		.with("PICTURE_PRESENT", () => ({
			title: t`Your resume includes a photo.`,
			action: t`Some parsers mishandle images, and photos are discouraged in some regions.`,
		}))
		.with("EMPTY_PERIOD", () => ({
			title: t`This entry has no dates.`,
			action: t`Add a period such as "Jan 2020 - Present" so it lands on your timeline.`,
		}))
		.with("UNPARSEABLE_PERIOD", () => ({
			title: t`These dates will not be read correctly.`,
			action: t`Use a recognized form such as "Jan 2020 - Mar 2022" or "2020 - 2022".`,
		}))
		.with("UNPARSEABLE_DATE", () => ({
			title: t`This date will not be read correctly.`,
			action: t`Use a recognized form such as "March 2022" or "2022".`,
		}))
		.with("REVERSED_PERIOD", () => ({
			title: t`This period ends before it starts.`,
			action: t`Swap the start and end dates.`,
		}))
		.with("FUTURE_DATED_PERIOD", () => ({
			title: t`This period starts in the future.`,
			action: t`Correct the year, or use "Present" for ongoing work.`,
		}))
		.with("SECTION_MISSING_FROM_LAYOUT", () => ({
			title: t`This section has content but never appears.`,
			action: t`Place it on a page from the Layout panel, or hide it if you meant to park it.`,
		}))
		.with("EMPTY_RENDERED_SECTION", () => ({
			title: t`This section renders as an empty heading.`,
			action: t`Add an item to it, or hide it.`,
		}))
		.with("NO_VISIBLE_EXPERIENCE", () => ({
			title: t`Your resume shows no work experience.`,
			action: t`Add an entry, or use projects and volunteer work to show equivalent history.`,
		}))
		.with("MISSING_EXPERIENCE_DESCRIPTION", () => ({
			title: t`This role has no description.`,
			action: t`Describe what you did so the entry contributes keywords for matching.`,
		}))
		.with("NON_STANDARD_SECTION_TITLE", () => ({
			title: t`This heading is not one parsers look for.`,
			action: t`Prefer a conventional heading such as "Work Experience" or "Education".`,
		}))
		.with("MULTI_COLUMN_PROSE_SECTION", () => ({
			title: t`This section is split across columns.`,
			action: t`Columns commonly scramble the order text is read in. Set it to a single column.`,
		}))
		.with("PROSE_SECTION_IN_SIDEBAR", () => ({
			title: t`This section sits in the sidebar.`,
			action: t`Move it into the main column and keep the sidebar for short lists.`,
		}))
		.with("SMALL_BODY_FONT", () => ({
			title: t`Your body text is very small.`,
			action: t`Use a size of at least 9pt so re-rendered copies stay accurate.`,
		}))
		.with("TIGHT_LINE_HEIGHT", () => ({
			title: t`Your lines are packed very tightly.`,
			action: t`Use a line height of at least 1.15 so lines are not merged together.`,
		}))
		.with("TIGHT_PAGE_MARGINS", () => ({
			title: t`Your page margins are very narrow.`,
			action: t`Increase them so content stays inside the reliably read area.`,
		}))
		.exhaustive();
}

function decodePointerToken(token: string): string {
	return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

function pointerTokens(pointer: string): string[] {
	return pointer.split("/").slice(1).map(decodePointerToken);
}

const isLeftSidebarSection = (value: string): value is LeftSidebarSection =>
	(leftSidebarSections as string[]).includes(value);

function resolveItemId(tokens: readonly string[], data?: ResumeData): string | undefined {
	if (!data) return undefined;

	const itemsIndex = tokens.indexOf("items");
	if (itemsIndex === -1) return undefined;

	const position = Number(tokens[itemsIndex + 1]);
	if (!Number.isInteger(position)) return undefined;

	const [head, next] = tokens;
	let items: readonly unknown[] | undefined;

	if (head === "sections" && next) {
		items = (data.sections as Record<string, { items?: readonly unknown[] }>)[next]?.items;
	} else if (head === "customSections") {
		items = data.customSections[Number(next)]?.items;
	}

	const item = items?.[position] as { id?: unknown } | undefined;
	return typeof item?.id === "string" ? item.id : undefined;
}

export function getAtsFindingTarget(pointer: string, data?: ResumeData): AtsFindingTarget | null {
	const tokens = pointerTokens(pointer);
	const [head, next] = tokens;
	const itemId = resolveItemId(tokens, data);
	const withItem = (target: AtsFindingTarget): AtsFindingTarget => (itemId ? { ...target, itemId } : target);

	if (head === "basics") return { side: "left", section: "basics" };
	if (head === "picture") return { side: "left", section: "picture" };
	if (head === "summary") return { side: "left", section: "summary" };
	if (head === "customSections") return withItem({ side: "left", section: "custom" });

	if (head === "sections" && next && isLeftSidebarSection(next)) {
		return withItem({ side: "left", section: next });
	}

	if (head === "metadata") {
		if (next === "typography") return { side: "right", section: "typography" };
		if (next === "page") return { side: "right", section: "page" };
		if (next === "layout") return { side: "right", section: "layout" };
	}

	return null;
}

export function getAtsFindingLocation(pointer: string): string | null {
	const target = getAtsFindingTarget(pointer);
	if (!target) return null;

	const tokens = pointerTokens(pointer);
	const itemsIndex = tokens.indexOf("items");
	const sectionTitle = getSectionTitle(target.section);

	if (itemsIndex === -1) return sectionTitle;

	const position = Number(tokens[itemsIndex + 1]);
	if (!Number.isInteger(position)) return sectionTitle;

	const itemNumber = position + 1;
	return t`${sectionTitle} · Item ${itemNumber}`;
}
