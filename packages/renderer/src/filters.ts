import type { Environment } from "nunjucks";
import nunjucks from "nunjucks";
import { normalizeRichTextHtml } from "./rich-text";

const iconSvgPaths: Record<string, { viewBox?: string; paths: string[]; fill?: boolean }> = {
	envelope: {
		viewBox: "0 0 256 256",
		fill: true,
		paths: [
			'<path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z"/>',
		],
	},
	phone: {
		viewBox: "0 0 256 256",
		fill: true,
		paths: [
			'<path d="M231.88,175.08A56.26,56.26,0,0,1,176,224C96.6,224,32,159.4,32,80A56.26,56.26,0,0,1,80.92,24.12a16,16,0,0,1,16.62,9.52l21.12,47.15,0,.12A16,16,0,0,1,117.39,96c-.18.27-.37.52-.57.77L96,121.45c7.49,15.22,23.41,31,38.83,38.51l24.34-20.71a8.12,8.12,0,0,1,.75-.56,16,16,0,0,1,15.17-1.4l.13.06,47.11,21.11A16,16,0,0,1,231.88,175.08Z"/>',
		],
	},
	"map-pin": {
		viewBox: "0 0 256 256",
		fill: true,
		paths: [
			'<path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z"/>',
		],
	},
	globe: {
		viewBox: "0 0 256 256",
		fill: true,
		paths: [
			'<path d="M128,24h0A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm78.36,64H170.71a135.28,135.28,0,0,0-22.3-45.6A88.29,88.29,0,0,1,206.37,88ZM216,128a87.61,87.61,0,0,1-3.33,24H174.16a157.44,157.44,0,0,0,0-48h38.51A87.61,87.61,0,0,1,216,128ZM128,43a115.27,115.27,0,0,1,26,45H102A115.11,115.11,0,0,1,128,43ZM102,168H154a115.11,115.11,0,0,1-26,45A115.27,115.27,0,0,1,102,168Zm-3.9-16a140.84,140.84,0,0,1,0-48h59.88a140.84,140.84,0,0,1,0,48Zm50.35,61.6a135.28,135.28,0,0,0,22.3-45.6h35.66A88.29,88.29,0,0,1,148.41,213.6Z"/>',
		],
	},
	at: {
		paths: [
			'<circle cx="12" cy="12" r="8"/>',
			'<path d="M16.5 12v2.5a1.5 1.5 0 0 0 3 0V12a7.5 7.5 0 1 0-2.2 5.3"/>',
			'<circle cx="12" cy="12" r="3"/>',
		],
	},
	"github-logo": {
		viewBox: "0 0 256 256",
		fill: true,
		paths: [
			'<path d="M216,104v8a56.06,56.06,0,0,1-48.44,55.47A39.8,39.8,0,0,1,176,192v40a8,8,0,0,1-8,8H104a8,8,0,0,1-8-8V216H72a40,40,0,0,1-40-40A24,24,0,0,0,8,152a8,8,0,0,1,0-16,40,40,0,0,1,40,40,24,24,0,0,0,24,24H96v-8a39.8,39.8,0,0,1,8.44-24.53A56.06,56.06,0,0,1,56,112v-8a58.14,58.14,0,0,1,7.69-28.32A59.78,59.78,0,0,1,69.07,28,8,8,0,0,1,76,24a59.75,59.75,0,0,1,48,24h24a59.75,59.75,0,0,1,48-24,8,8,0,0,1,6.93,4,59.74,59.74,0,0,1,5.37,47.68A58,58,0,0,1,216,104Z"/>',
		],
	},
	"linkedin-logo": {
		viewBox: "0 0 256 256",
		fill: true,
		paths: [
			'<path d="M216,24H40A16,16,0,0,0,24,40V216a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V40A16,16,0,0,0,216,24ZM96,176a8,8,0,0,1-16,0V112a8,8,0,0,1,16,0ZM88,96a12,12,0,1,1,12-12A12,12,0,0,1,88,96Zm96,80a8,8,0,0,1-16,0V140a20,20,0,0,0-40,0v36a8,8,0,0,1-16,0V112a8,8,0,0,1,15.79-1.78A36,36,0,0,1,184,140Z"/>',
		],
	},
	"game-controller": {
		viewBox: "0 0 256 256",
		fill: true,
		paths: [
			'<path d="M247.44,173.75a.68.68,0,0,0,0-.14L231.05,89.44c0-.06,0-.12,0-.18A60.08,60.08,0,0,0,172,40H83.89a59.88,59.88,0,0,0-59,49.52L8.58,173.61a.68.68,0,0,0,0,.14,36,36,0,0,0,60.9,31.71l.35-.37L109.52,160h37l39.71,45.09c.11.13.23.25.35.37A36.08,36.08,0,0,0,212,216a36,36,0,0,0,35.43-42.25ZM104,112H96v8a8,8,0,0,1-16,0v-8H72a8,8,0,0,1,0-16h8V88a8,8,0,0,1,16,0v8h8a8,8,0,0,1,0,16Zm40-8a8,8,0,0,1,8-8h24a8,8,0,0,1,0,16H152A8,8,0,0,1,144,104Zm84.37,87.47a19.84,19.84,0,0,1-12.9,8.23A20.09,20.09,0,0,1,198,194.31L167.8,160H172a60,60,0,0,0,51-28.38l8.74,45A19.82,19.82,0,0,1,228.37,191.47Z"/>',
		],
	},
	code: {
		viewBox: "0 0 256 256",
		fill: true,
		paths: [
			'<path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM92.8,145.6a8,8,0,1,1-9.6,12.8l-32-24a8,8,0,0,1,0-12.8l32-24a8,8,0,0,1,9.6,12.8L69.33,128Zm58.89-71.4-32,112a8,8,0,1,1-15.38-4.4l32-112a8,8,0,0,1,15.38,4.4Zm53.11,60.2-32,24a8,8,0,0,1-9.6-12.8L186.67,128,163.2,110.4a8,8,0,1,1,9.6-12.8l32,24a8,8,0,0,1,0,12.8Z"/>',
		],
	},
	"brackets-curly": {
		paths: [
			'<path d="M9 4H7a2 2 0 0 0-2 2v3a3 3 0 0 1-2 2.8A3 3 0 0 1 5 15v3a2 2 0 0 0 2 2h2"/>',
			'<path d="M15 4h2a2 2 0 0 1 2 2v3a3 3 0 0 0 2 2.8A3 3 0 0 0 19 15v3a2 2 0 0 1-2 2h-2"/>',
		],
	},
	cpu: {
		viewBox: "0 0 256 256",
		fill: true,
		paths: [
			'<path d="M104,104h48v48H104Zm136,48a8,8,0,0,1-8,8H216v40a16,16,0,0,1-16,16H160v16a8,8,0,0,1-16,0V216H112v16a8,8,0,0,1-16,0V216H56a16,16,0,0,1-16-16V160H24a8,8,0,0,1,0-16H40V112H24a8,8,0,0,1,0-16H40V56A16,16,0,0,1,56,40H96V24a8,8,0,0,1,16,0V40h32V24a8,8,0,0,1,16,0V40h40a16,16,0,0,1,16,16V96h16a8,8,0,0,1,0,16H216v32h16A8,8,0,0,1,240,152ZM168,96a8,8,0,0,0-8-8H96a8,8,0,0,0-8,8v64a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8Z"/>',
		],
	},
	brain: {
		paths: [
			'<path d="M9.5 5A3.5 3.5 0 0 0 6 8.5V9a3 3 0 0 0-2 2.8A3.2 3.2 0 0 0 7 15v4a3 3 0 0 0 6 0v-2"/>',
			'<path d="M14.5 5A3.5 3.5 0 0 1 18 8.5V9a3 3 0 0 1 2 2.8A3.2 3.2 0 0 1 17 15v4a3 3 0 0 1-6 0v-2"/>',
		],
	},
	"shooting-star": {
		paths: [
			'<path d="m14 4 1.3 3.7L19 9l-3.7 1.3L14 14l-1.3-3.7L9 9l3.7-1.3L14 4Z"/>',
			'<path d="M2 22 10 14"/>',
			'<path d="M6 14 2 10"/>',
		],
	},
	"chart-line-up": { paths: ['<path d="M3 20h18"/>', '<path d="M6 16 10 12l3 3 5-7"/>', '<path d="M18 8h-3V5"/>'] },
	robot: {
		paths: [
			'<rect x="6" y="8" width="12" height="10" rx="2"/>',
			'<path d="M12 4v4"/>',
			'<circle cx="10" cy="12" r="1"/>',
			'<circle cx="14" cy="12" r="1"/>',
			'<path d="M9 16h6"/>',
		],
	},
	"book-open": {
		paths: [
			'<path d="M2 6.5A2.5 2.5 0 0 1 4.5 4H11v16H4.5A2.5 2.5 0 0 0 2 22Z"/>',
			'<path d="M22 6.5A2.5 2.5 0 0 0 19.5 4H13v16h6.5A2.5 2.5 0 0 1 22 22Z"/>',
		],
	},
	"pen-nib": { paths: ['<path d="m12 3 7 7-6.5 11L6 14.5 12 3Z"/>', '<circle cx="12" cy="12" r="2"/>'] },
	star: { paths: ['<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.2 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z"/>'] },
};

const renderIconSvg = (name: unknown, className = ""): nunjucks.runtime.SafeString => {
	if (typeof name !== "string" || name.trim() === "") return new nunjucks.runtime.SafeString("");
	const icon = iconSvgPaths[name] ?? iconSvgPaths.star;
	const classAttr = className ? ` class="${className}"` : "";
	const svg = icon.fill
		? `<svg${classAttr} viewBox="${icon.viewBox ?? "0 0 24 24"}" fill="currentColor" aria-hidden="true" focusable="false">${icon.paths.join("")}</svg>`
		: `<svg${classAttr} viewBox="${icon.viewBox ?? "0 0 24 24"}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icon.paths.join("")}</svg>`;
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
