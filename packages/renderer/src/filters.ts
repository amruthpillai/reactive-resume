import type { Environment } from "nunjucks";
import nunjucks from "nunjucks";

const iconSvgPaths: Record<string, { viewBox?: string; paths: string[] }> = {
	envelope: { paths: ['<rect x="3" y="5" width="18" height="14" rx="2"/>', '<path d="M3 7l9 7 9-7"/>'] },
	phone: {
		paths: [
			'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8l-1.3 1.3a16 16 0 0 0 6.4 6.4l1.3-1.3a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 2Z"/>',
		],
	},
	"map-pin": {
		paths: ['<path d="M12 21s-6-5.7-6-11a6 6 0 1 1 12 0c0 5.3-6 11-6 11Z"/>', '<circle cx="12" cy="10" r="2.5"/>'],
	},
	globe: {
		paths: [
			'<circle cx="12" cy="12" r="9"/>',
			'<path d="M3 12h18"/>',
			'<path d="M12 3a14 14 0 0 1 0 18"/>',
			'<path d="M12 3a14 14 0 0 0 0 18"/>',
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
		paths: [
			'<path d="M9 19c-4 1.3-4-2-6-2"/>',
			'<path d="M15 22v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.7A5.2 5.2 0 0 0 19 5.2 4.8 4.8 0 0 0 18.9 2S17.7 1.7 15 3.5a13.3 13.3 0 0 0-6 0C6.3 1.7 5.1 2 5.1 2A4.8 4.8 0 0 0 5 5.2a5.2 5.2 0 0 0-1.3 3.6c0 5.2 3.2 6.4 6.2 6.7a3.4 3.4 0 0 0-.9 2.6V22"/>',
		],
	},
	"linkedin-logo": {
		paths: [
			'<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-12h4v2"/>',
			'<rect x="2" y="9" width="4" height="12"/>',
			'<circle cx="4" cy="4" r="2"/>',
		],
	},
	"game-controller": {
		paths: [
			'<path d="M6 12h12a4 4 0 0 1 4 4v1a3 3 0 0 1-5.1 2.1L14.5 17h-5L7.1 19.1A3 3 0 0 1 2 17v-1a4 4 0 0 1 4-4Z"/>',
			'<path d="M8 15h4"/>',
			'<path d="M10 13v4"/>',
			'<circle cx="16.5" cy="14.5" r="1"/>',
			'<circle cx="18.5" cy="16.5" r="1"/>',
		],
	},
	code: { paths: ['<path d="M9 18 3 12l6-6"/>', '<path d="m15 6 6 6-6 6"/>'] },
	"brackets-curly": {
		paths: [
			'<path d="M9 4H7a2 2 0 0 0-2 2v3a3 3 0 0 1-2 2.8A3 3 0 0 1 5 15v3a2 2 0 0 0 2 2h2"/>',
			'<path d="M15 4h2a2 2 0 0 1 2 2v3a3 3 0 0 0 2 2.8A3 3 0 0 0 19 15v3a2 2 0 0 1-2 2h-2"/>',
		],
	},
	cpu: {
		paths: [
			'<rect x="7" y="7" width="10" height="10" rx="1"/>',
			'<path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3M4 4l2 2M18 4l-2 2M4 20l2-2M18 20l-2-2"/>',
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
	const svg = `<svg${classAttr} viewBox="${icon.viewBox ?? "0 0 24 24"}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icon.paths.join("")}</svg>`;
	return new nunjucks.runtime.SafeString(svg);
};

export const registerFilters = (env: Environment): void => {
	env.addFilter("selectVisible", (items: unknown) => {
		if (!Array.isArray(items)) return [];
		return items.filter((item) => item && typeof item === "object" && !("hidden" in item && item.hidden));
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
