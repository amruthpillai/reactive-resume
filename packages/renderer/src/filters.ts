import type { Environment } from "nunjucks";
import nunjucks from "nunjucks";

export const registerFilters = (env: Environment): void => {
	env.addFilter("selectVisible", (items: unknown) => {
		if (!Array.isArray(items)) return [];
		return items.filter((item) => item && typeof item === "object" && !("hidden" in item && item.hidden));
	});

	env.addFilter("levelDots", (level: unknown) => {
		const n = typeof level === "number" ? Math.min(5, Math.max(0, Math.round(level))) : 0;
		const html = Array.from({ length: 5 }, (_, i) => {
			const filled = i < n;
			return `<span style="display:inline-block;width:0.55em;height:0.55em;border-radius:50%;margin-right:0.15em;background-color:${filled ? "var(--resume-primary)" : "transparent"};border:1px solid var(--resume-primary);"></span>`;
		}).join("");
		return new nunjucks.runtime.SafeString(html);
	});

	env.addFilter("formatDate", (date: unknown) => {
		if (typeof date !== "string" || !date) return "";
		return date;
	});
};
