import type { Environment } from "nunjucks";
import nunjucks from "nunjucks";
import { phosphorIconMap } from "./generated/phosphor-icons";
import { normalizeRichTextHtml } from "./rich-text";

const renderIconSvg = (name: unknown, className = ""): nunjucks.runtime.SafeString => {
	if (typeof name !== "string" || name.trim() === "") return new nunjucks.runtime.SafeString("");
	const icon = phosphorIconMap[name as keyof typeof phosphorIconMap] ?? phosphorIconMap.star;
	const classAttr = className ? ` class="${className}"` : "";
	const svg = `<svg${classAttr} viewBox="${icon.viewBox}" fill="currentColor" aria-hidden="true" focusable="false">${icon.paths.join("")}</svg>`;
	return new nunjucks.runtime.SafeString(svg);
};

export const registerFilters = (env: Environment): void => {
	env.addFilter("selectVisible", (items: unknown) => {
		if (!Array.isArray(items)) return [];
		return items.filter((item) => item && typeof item === "object" && !("hidden" in item && item.hidden));
	});

	env.addFilter("richText", (html: unknown) => {
		if (typeof html !== "string") return new nunjucks.runtime.SafeString("");

		const normalized = normalizeRichTextHtml(html);
		return new nunjucks.runtime.SafeString(normalized);
	});

	env.addFilter("iconSvg", (name: unknown, className?: string) => renderIconSvg(name, className));

	env.addFilter("levelDots", (level: unknown, designLevel?: { type?: string; icon?: string }) => {
		const n = typeof level === "number" ? Math.min(5, Math.max(0, Math.round(level))) : 0;
		const type = designLevel?.type ?? "circle";
		const iconName = designLevel?.icon ?? "star";
		const html = Array.from({ length: 5 }, (_, i) => {
			const filled = i < n;
			if (type === "icon") {
				const icon = renderIconSvg(iconName, `level-icon${filled ? " filled" : ""}`);
				return `<span class="level-icon-wrapper${filled ? " filled" : ""}">${icon}</span>`;
			}
			return `<span style="display:inline-block;width:0.55em;height:0.55em;border-radius:50%;margin-right:0.15em;background-color:${filled ? "var(--resume-primary)" : "transparent"};border:1px solid var(--resume-primary);"></span>`;
		}).join("");
		return new nunjucks.runtime.SafeString(html);
	});

	env.addFilter("formatDate", (date: unknown) => {
		if (typeof date !== "string" || !date) return "";
		return date;
	});
};
