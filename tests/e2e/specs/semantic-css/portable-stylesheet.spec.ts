import type { Page } from "@playwright/test";
import { readSemanticCssFixture } from "../../fixtures/db";
import {
	createSemanticCssResume,
	openSemanticCssEditor,
	PORTABLE_STYLESHEET,
	replaceStylesheet,
	seedSemanticCssResume,
	switchTemplate,
	waitForStablePreview,
} from "../../fixtures/semantic-css";
import { expect, test } from "../../fixtures/test";

test.setTimeout(180_000);

const PORTABLE_MARKERS = {
	exactItemField: [161, 193, 129, 255],
	exactSection: [254, 215, 102, 255],
	groupSelector: [42, 183, 202, 255],
	header: [254, 74, 73, 255],
	mediaQuery: [110, 231, 183, 255],
	pagination: [212, 165, 165, 255],
	placement: [247, 140, 107, 255],
	richText: [179, 136, 235, 255],
	systemVariable: [0, 132, 209, 255],
	templatePart: [255, 0, 255, 255],
} as const;

const PORTABLE_ACCEPTANCE_STYLESHEET = `${PORTABLE_STYLESHEET}

page {
	background-color: var(--accent);
}

header {
	background-color: rgb(254, 74, 73);
}

section:is([type="experience"], [type="education"]) > section-heading {
	background-color: rgb(42, 183, 202);
}

section[id="projects"] > section-items > item {
	background-color: rgb(254, 215, 102);
}

section[id="experience"] item[id="experience-item-2"] field[name="period"] {
	color: rgb(161, 193, 129);
}

rich-text list-item > list-item-content {
	color: rgb(179, 136, 235);
}

region[placement="sidebar"] section {
	background-color: rgb(247, 140, 107);
}

section[type="projects"] {
	background-color: rgb(212, 165, 165);
	padding: 12pt;
}

@media (max-width: 600pt) {
	region[placement="sidebar"] section-heading {
		background-color: rgb(110, 231, 183);
	}
}

resume[template="azurill"] template-part[name="timeline-dot"] {
	background-color: rgb(255, 0, 255);
}
`;

type PortableMarker = keyof typeof PORTABLE_MARKERS;

const BREAK_INSIDE_DIRECTIVE = "\tbreak-inside: avoid;\n";
const MIN_PRESENCE_AHEAD_DIRECTIVE = "\t-rr-min-presence-ahead: 24pt;\n";
const WITHOUT_PAGINATION_DIRECTIVES = PORTABLE_ACCEPTANCE_STYLESHEET.replace(BREAK_INSIDE_DIRECTIVE, "").replace(
	MIN_PRESENCE_AHEAD_DIRECTIVE,
	"",
);
const BREAK_INSIDE_ONLY_STYLESHEET = PORTABLE_ACCEPTANCE_STYLESHEET.replace(MIN_PRESENCE_AHEAD_DIRECTIVE, "");
const MIN_PRESENCE_AHEAD_ONLY_STYLESHEET = PORTABLE_ACCEPTANCE_STYLESHEET.replace(BREAK_INSIDE_DIRECTIVE, "");

const GENERIC_PORTABLE_MARKERS = [
	"exactItemField",
	"exactSection",
	"groupSelector",
	"header",
	"mediaQuery",
	"pagination",
	"placement",
	"richText",
] as const satisfies readonly PortableMarker[];

async function countPortableMarkersByPage(page: Parameters<typeof waitForStablePreview>[0]) {
	await waitForStablePreview(page);
	return page.locator('canvas[aria-label^="Resume page "]').evaluateAll((elements, markers) => {
		const markerEntries = Object.entries(markers) as Array<[PortableMarker, readonly number[]]>;
		const markerByColor = new Map(
			markerEntries.map(([name, color]) => [
				(((color[0] << 24) | (color[1] << 16) | (color[2] << 8) | color[3]) >>> 0).toString(),
				name,
			]),
		);

		return elements
			.filter((element) => !element.closest('[aria-hidden="true"]'))
			.map((element) => {
				const canvas = element as HTMLCanvasElement;
				const context = canvas.getContext("2d");
				if (!context) throw new Error("Expected a 2D preview canvas.");
				const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
				const counts = Object.fromEntries(markerEntries.map(([name]) => [name, 0])) as Record<PortableMarker, number>;

				for (let index = 0; index < pixels.length; index += 4) {
					const key =
						((pixels[index] << 24) | (pixels[index + 1] << 16) | (pixels[index + 2] << 8) | pixels[index + 3]) >>> 0;
					const marker = markerByColor.get(key.toString());
					if (marker) counts[marker] += 1;
				}

				return counts;
			});
	}, PORTABLE_MARKERS);
}

async function waitForPortableApplied(page: Parameters<typeof waitForStablePreview>[0]) {
	await expect(
		page
			.getByText(/^Applied(?: with warnings)?$/)
			.filter({ visible: true })
			.last(),
	).toBeVisible({
		timeout: 30_000,
	});
}

async function applyPortableStylesheet(
	page: Parameters<typeof waitForStablePreview>[0],
	resumeId: string,
	source: string,
) {
	await openSemanticCssEditor(page);
	await replaceStylesheet(page, source);
	await expect
		.poll(async () => (await readSemanticCssFixture(resumeId)).stylesheet?.applied.text, { timeout: 30_000 })
		.toBe(source);
	await waitForPortableApplied(page);
}

async function readProjectMinPresenceAhead(page: Page, resumeId: string) {
	const fixture = await readSemanticCssFixture(resumeId);
	const response = await page.request.get(
		`/api/openapi/resumes/${encodeURIComponent(fixture.username)}/${encodeURIComponent(fixture.slug)}/style-projection`,
	);
	expect(response.ok(), `the public PDF projection request should succeed (${response.status()})`).toBe(true);
	const projection = (await response.json()) as {
		nodes: Record<string, { minPresenceAhead?: number }>;
	};
	const projectNodes = Object.entries(projection.nodes).filter(([key]) => key.endsWith("/section-projects"));
	expect(projectNodes, "the public PDF projection should contain one projects section").toHaveLength(1);
	return projectNodes[0]?.[1].minPresenceAhead;
}

test("@semantic-css applies every portable selector behavior across Onyx, Azurill, and Ditto", async ({
	authPage: page,
}, testInfo) => {
	const resumeId = await createSemanticCssResume(page, testInfo);
	await seedSemanticCssResume(page, resumeId, {
		portableLayout: "balanced",
		experienceItemId: "experience-item-2",
		hidePicture: true,
	});
	await applyPortableStylesheet(page, resumeId, PORTABLE_ACCEPTANCE_STYLESHEET);
	await page.reload();
	await openSemanticCssEditor(page);
	await waitForPortableApplied(page);

	for (const template of ["Onyx", "Azurill", "Ditto"]) {
		await switchTemplate(page, template);
		const pages = await countPortableMarkersByPage(page);
		console.info(`PORTABLE_MARKER_EVIDENCE ${template} ${JSON.stringify(pages)}`);
		for (const marker of GENERIC_PORTABLE_MARKERS) {
			expect(
				pages.reduce((total, page) => total + page[marker], 0),
				`${template} should render the ${marker} sentinel`,
			).toBeGreaterThan(20);
		}
		expect(
			pages.reduce((total, page) => total + page.systemVariable, 0),
			`${template} should resolve the system variable sentinel`,
		).toBeGreaterThan(10_000);
		if (template === "Azurill") {
			expect(
				pages.reduce((total, page) => total + page.templatePart, 0),
				"Azurill should render the template-part sentinel",
			).toBeGreaterThan(5);
		}
	}
});

test("@semantic-css pagination directives keep a portable project section together", async ({
	authPage: page,
}, testInfo) => {
	const resumeId = await createSemanticCssResume(page, testInfo);
	await seedSemanticCssResume(page, resumeId, {
		portableLayout: "pagination-stress",
		experienceItemId: "experience-item-2",
		hidePicture: true,
	});
	await switchTemplate(page, "Onyx");

	await applyPortableStylesheet(page, resumeId, WITHOUT_PAGINATION_DIRECTIVES);
	const withoutBreakInside = await countPortableMarkersByPage(page);
	expect(withoutBreakInside.reduce((total, page) => total + page.pagination, 0)).toBeGreaterThan(20);
	const withoutBreakInsideDistribution = withoutBreakInside.map((page) => page.pagination);

	await applyPortableStylesheet(page, resumeId, BREAK_INSIDE_ONLY_STYLESHEET);
	const breakInsideOnlyDistribution = (await countPortableMarkersByPage(page)).map((page) => page.pagination);

	await applyPortableStylesheet(page, resumeId, WITHOUT_PAGINATION_DIRECTIVES);
	const withoutMinPresenceAhead = await readProjectMinPresenceAhead(page, resumeId);

	await applyPortableStylesheet(page, resumeId, MIN_PRESENCE_AHEAD_ONLY_STYLESHEET);
	const minPresenceAheadOnly = await readProjectMinPresenceAhead(page, resumeId);

	console.info(
		`PORTABLE_PAGINATION_EVIDENCE ${JSON.stringify({
			breakInside: {
				withoutDirective: withoutBreakInsideDistribution,
				withDirective: breakInsideOnlyDistribution,
			},
			minPresenceAhead: {
				withoutDirective: withoutMinPresenceAhead ?? null,
				withDirective: minPresenceAheadOnly,
			},
		})}`,
	);
	expect(breakInsideOnlyDistribution, "break-inside: avoid must independently change project pagination").not.toEqual(
		withoutBreakInsideDistribution,
	);
	expect(withoutMinPresenceAhead, "the no-directive control must omit minPresenceAhead").toBeUndefined();
	expect(
		minPresenceAheadOnly,
		"-rr-min-presence-ahead: 24pt must independently reach the project pagination props",
	).toBe(24);
});
