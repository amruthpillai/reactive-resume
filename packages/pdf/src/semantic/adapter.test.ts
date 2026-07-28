import type { ResolvedNodeStyle } from "@reactive-resume/resume/stylesheet";
import { describe, expect, it } from "vitest";
import { adaptResolvedPdfNode } from "./adapter";

describe("adaptResolvedPdfNode", () => {
	it("maps resolved CSS names and structural values to the owning React PDF primitive props", () => {
		const resolved = {
			style: {
				"background-color": "#1e293b",
				"font-size": 9,
				"font-weight": "400",
				"text-decoration": "none",
			},
			structural: {
				breakBefore: "page",
				breakInside: "avoid",
				fixed: true,
				minPresenceAhead: 24,
				orphans: 2,
				widows: 3,
				pageSize: "A4",
			},
			hidden: false,
			order: 0,
		} satisfies ResolvedNodeStyle;

		expect(adaptResolvedPdfNode(resolved)).toEqual({
			style: {
				backgroundColor: "#1e293b",
				fontSize: 9,
				fontWeight: "400",
				textDecoration: "none",
			},
			break: true,
			wrap: false,
			fixed: true,
			minPresenceAhead: 24,
			orphans: 2,
			widows: 3,
			size: "A4",
		});
	});

	it("preserves explicit values equal to the resolver base and distinguishes initial from host-base resets", () => {
		const base = {
			style: { color: "#111111", "font-weight": "700" },
			structural: {},
			hidden: false,
			order: 0,
		} satisfies ResolvedNodeStyle;
		const resolved = {
			...base,
			style: { color: "#111111" },
			specifiedStyleProperties: ["color", "font-weight"],
			hostBaseStyleProperties: ["color"],
		} satisfies ResolvedNodeStyle;

		expect(adaptResolvedPdfNode(resolved, base)).toEqual({
			style: {
				fontWeight: undefined,
			},
		});
	});

	it("does not materialize inherited resolver base values onto a host that already inherits from the renderer tree", () => {
		const base = {
			style: {},
			structural: {},
			hidden: false,
			order: 0,
		} satisfies ResolvedNodeStyle;
		const resolved = {
			...base,
			style: { color: "#111111", "font-size": 10 },
			specifiedStyleProperties: [],
			hostBaseStyleProperties: [],
		} satisfies ResolvedNodeStyle;

		expect(adaptResolvedPdfNode(resolved, base)).toEqual({});
	});

	it("emits explicit flow cancellations when semantic structure clears builder pagination", () => {
		const base = {
			style: {},
			structural: { breakBefore: "page", breakInside: "avoid" },
			hidden: false,
			order: 0,
		} satisfies ResolvedNodeStyle;
		const resolved = {
			...base,
			structural: {},
		} satisfies ResolvedNodeStyle;

		expect(adaptResolvedPdfNode(resolved, base)).toEqual({
			break: false,
			wrap: true,
		});
		expect(adaptResolvedPdfNode(base, base)).toEqual({
			break: true,
			wrap: false,
		});
	});
});
