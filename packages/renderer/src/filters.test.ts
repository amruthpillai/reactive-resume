import { describe, expect, it } from "vitest";
import nunjucks from "nunjucks";
import { registerFilters } from "./filters";

const makeEnv = () => {
	const env = new nunjucks.Environment(null, { autoescape: true });
	registerFilters(env);
	return env;
};

describe("selectVisible filter", () => {
	it("keeps items where hidden is false", () => {
		const env = makeEnv();
		const result = env.renderString("{% for item in items | selectVisible %}{{ item.name }},{% endfor %}", {
			items: [
				{ name: "A", hidden: false },
				{ name: "B", hidden: true },
				{ name: "C", hidden: false },
			],
		});
		expect(result).toBe("A,C,");
	});

	it("returns empty when all items are hidden", () => {
		const env = makeEnv();
		const result = env.renderString("{% for item in items | selectVisible %}{{ item.name }}{% endfor %}", {
			items: [{ name: "A", hidden: true }],
		});
		expect(result).toBe("");
	});

	it("handles non-array input gracefully", () => {
		const env = makeEnv();
		const result = env.renderString("{% for item in val | selectVisible %}x{% endfor %}", { val: null });
		expect(result).toBe("");
	});
});

describe("levelDots filter", () => {
	it("renders 5 dot spans", () => {
		const env = makeEnv();
		const result = env.renderString("{{ level | levelDots }}", { level: 3 });
		expect(result.match(/<span/g)?.length).toBe(5);
	});

	it("clamps values above 5", () => {
		const env = makeEnv();
		const result = env.renderString("{{ level | levelDots }}", { level: 10 });
		expect(result.match(/<span/g)?.length).toBe(5);
	});

	it("handles non-number input", () => {
		const env = makeEnv();
		expect(() => env.renderString("{{ level | levelDots }}", { level: "high" })).not.toThrow();
	});

	it("renders icon-based levels when the design requests icons", () => {
		const env = makeEnv();
		const result = env.renderString("{{ level | levelDots(levelDesign) }}", {
			level: 4,
			levelDesign: { type: "icon", icon: "star" },
		});
		expect(result.match(/<svg/g)?.length).toBe(5);
		expect(result).toContain("level-icon-wrapper filled");
	});
});

describe("iconSvg filter", () => {
	it("renders inline SVG markup", () => {
		const env = makeEnv();
		const result = env.renderString("{{ 'github-logo' | iconSvg('item-icon') }}");
		expect(result).toContain("<svg");
		expect(result).toContain('class="item-icon"');
		expect(result).toContain('fill="currentColor"');
		expect(result).not.toContain('stroke="currentColor"');
	});
});

describe("formatDate filter", () => {
	it("passes through string dates unchanged", () => {
		const env = makeEnv();
		const result = env.renderString("{{ date | formatDate }}", { date: "July 2024" });
		expect(result).toBe("July 2024");
	});

	it("returns empty string for empty input", () => {
		const env = makeEnv();
		const result = env.renderString("{{ date | formatDate }}", { date: "" });
		expect(result).toBe("");
	});
});
