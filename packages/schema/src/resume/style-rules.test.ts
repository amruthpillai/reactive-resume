import { describe, expect, it } from "vitest";
import { defaultResumeData } from "./default";
import { resolveStyleRuleFontSize } from "./style-rules";

describe("resolveStyleRuleFontSize", () => {
	it("returns global icon font sizes without section context", () => {
		const data = {
			...defaultResumeData,
			metadata: {
				...defaultResumeData.metadata,
				styleRules: [
					{
						id: "icon-global",
						label: "",
						enabled: true,
						target: { scope: "global" as const },
						slots: { icon: { fontSize: 22 } },
					},
				],
			},
		};

		expect(resolveStyleRuleFontSize(data, { slot: "icon" })).toBe(22);
	});

	it("does not apply level font sizes to the icon slot", () => {
		const data = {
			...defaultResumeData,
			metadata: {
				...defaultResumeData.metadata,
				styleRules: [
					{
						id: "level-global",
						label: "",
						enabled: true,
						target: { scope: "global" as const },
						slots: { level: { fontSize: 18 } },
					},
				],
			},
		};

		expect(resolveStyleRuleFontSize(data, { slot: "icon" })).toBeUndefined();
	});
});
