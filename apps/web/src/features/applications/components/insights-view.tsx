import type { ApplicationTimelineEntry } from "@reactive-resume/schema/applications/data";
import type { Application } from "../types";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@reactive-resume/ui/components/button";
import { orpc } from "@/libs/orpc/client";
import { computeInsights, computeTimeline } from "../insights";

const byNewest = (a: ApplicationTimelineEntry, b: ApplicationTimelineEntry) =>
	new Date(b.at).getTime() - new Date(a.at).getTime();

const appliedDate = (app: Application) =>
	[...app.activity].sort(byNewest).find((entry) => entry.type === "stage" && entry.stage === "applied")?.at ??
	app.appliedAt;

export function ApplicationInsights({ applications }: { applications: Application[] }) {
	const { data } = useQuery(orpc.applications.stats.queryOptions({}));

	// Weekly application velocity — derived from the already-loaded list, matching the stats
	// population (archived excluded), so no extra endpoint is needed.
	const timeline = useMemo(
		() => computeTimeline(applications.filter((app) => !app.archived).map((app) => new Date(appliedDate(app)))),
		[applications],
	);
	const maxWeek = Math.max(1, ...timeline.map((bucket) => bucket.count));

	if (!data) return <div className="h-40 animate-pulse rounded-xl bg-muted/40" />;

	const insights = computeInsights(data.byStage);
	const maxSource = Math.max(1, ...data.bySource.map((s) => s.count));

	if (insights.total === 0) {
		return (
			<p className="py-16 text-center text-muted-foreground text-sm">
				<Trans>No applications yet — add a few to see your funnel and reply rates.</Trans>
			</p>
		);
	}

	return (
		<div className="flex max-w-4xl flex-col gap-4 overflow-y-auto pb-6">
			<p className="text-muted-foreground text-xs">
				<Trans>Pipeline health across all applications</Trans>
			</p>

			{/* stat tiles */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				{insights.tiles.map((tile) => (
					<div key={tile.label} className="rounded-xl border border-border p-4">
						<div className="text-muted-foreground text-xs">{tile.label}</div>
						<div className="mt-2 font-bold text-2xl tracking-tight">{tile.value}</div>
						<div className="mt-1 text-muted-foreground text-xs">{tile.sub}</div>
					</div>
				))}
			</div>

			<PipelineFlow insights={insights} />

			<div className="grid gap-4 lg:grid-cols-2">
				{/* application velocity over time */}
				<div className="rounded-xl border border-border p-5">
					<h3 className="font-semibold text-sm">
						<Trans>Applications over time</Trans>
					</h3>
					<p className="mt-0.5 text-muted-foreground text-xs">
						<Trans>Applications sent per week (last 8 weeks)</Trans>
					</p>
					<div className="mt-4 flex items-end gap-2">
						{timeline.map((bucket) => (
							<div key={bucket.label} className="flex flex-1 flex-col items-center gap-1">
								<div className="flex h-28 w-full flex-col justify-end">
									<span className="mb-1 text-center text-[10px] text-muted-foreground tabular-nums">
										{bucket.count || ""}
									</span>
									<div
										className="w-full rounded-t bg-primary/60"
										style={{ height: `${bucket.count ? Math.max((bucket.count / maxWeek) * 100, 8) : 0}%` }}
									/>
								</div>
								<span className="text-[10px] text-muted-foreground tabular-nums">{bucket.label}</span>
							</div>
						))}
					</div>
				</div>

				{/* sources */}
				<div className="rounded-xl border border-border p-5">
					<h3 className="font-semibold text-sm">
						<Trans>Where applications come from</Trans>
					</h3>
					<p className="mt-0.5 text-muted-foreground text-xs">
						<Trans>Count by source</Trans>
					</p>
					<div className="mt-4 flex flex-col gap-3">
						{data.bySource.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								<Trans>No source data yet.</Trans>
							</p>
						) : (
							data.bySource.map((row) => (
								<div key={row.source} className="flex items-center gap-3 text-xs">
									<span className="w-28 shrink-0 truncate font-medium">{row.source}</span>
									<div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
										<div
											className="h-full rounded-full bg-foreground/70"
											style={{ width: `${Math.max((row.count / maxSource) * 100, 3)}%` }}
										/>
									</div>
									<span className="w-6 text-right text-muted-foreground">{row.count}</span>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// Vibrant, dark-mode palette for the pipeline snapshot — brighter than the muted board stage
// colors so the chart pops both on screen (preview) and in the exported PNG.
const FLOW_COLORS = ["#a5b4fc", "#818cf8", "#22d3ee", "#fbbf24", "#34d399"];
const FLOW_BG = "#0a0a0f";
const FLOW_REJECTED = "#fb7185";
const FLOW_FONT = '"IBM Plex Sans Variable", "IBM Plex Sans", ui-sans-serif, sans-serif';
// RxR mark ~18px wide in the 256-unit icon viewBox (the mark's glyphs span y ≈ 36–220).
const ICON_SCALE = 18 / 256;

function toBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(binary);
}

// A rasterized SVG (loaded as an <img>) can't reach the page's webfonts, so the exported PNG falls
// back to a system font unless the font is inlined. Find the IBM Plex Sans woff2 the app already
// loaded (basic-latin subset covers the chart's English labels), base64 it, and return an
// @font-face the export SVG can embed. Returns null on any failure so export still proceeds.
async function ibmPlexFontFace(): Promise<string | null> {
	for (const sheet of Array.from(document.styleSheets)) {
		let rules: CSSRuleList | undefined;
		try {
			rules = sheet.cssRules;
		} catch {
			continue; // cross-origin stylesheet — not readable
		}
		for (const rule of Array.from(rules ?? [])) {
			if (!(rule instanceof CSSFontFaceRule)) continue;
			const family = rule.style.getPropertyValue("font-family").replace(/["']/g, "");
			if (!family.includes("IBM Plex Sans")) continue;
			if ((rule.style.getPropertyValue("font-style") || "normal") !== "normal") continue;
			// Keep only the basic-latin subset (covers the chart's English labels). CSSOM normalizes
			// its range to "U+0-FF" — i.e. "U+" then all-zero start — so match that, not "U+0000".
			const range = rule.style.getPropertyValue("unicode-range");
			if (range && !/U\+0{1,4}-/i.test(range)) continue;
			const url = rule.style.getPropertyValue("src").match(/url\(["']?([^"')]+\.woff2)["']?\)/)?.[1];
			if (!url) continue;
			try {
				const buffer = await (await fetch(url)).arrayBuffer();
				return `@font-face{font-family:"IBM Plex Sans Variable";font-style:normal;font-weight:100 700;src:url(data:font/woff2;base64,${toBase64(buffer)}) format("woff2");}`;
			} catch {
				return null;
			}
		}
	}
	return null;
}

// A funnel-flow snapshot (the shareable picture). Hand-drawn SVG with inline fills so it exports to
// PNG without any library. Rendered dark + vibrant so the on-screen preview matches the export;
// the "Tracked using Reactive Resume" mark is injected only when exporting.
function PipelineFlow({ insights }: { insights: ReturnType<typeof computeInsights> }) {
	const svgRef = useRef<SVGSVGElement>(null);
	const W = 800;
	const H = 340;
	const padX = 40;
	const midY = 190;
	const maxBarH = 150;
	const barW = 34;
	const n = insights.funnel.length;
	const slotW = (W - padX * 2) / n;
	const maxReached = Math.max(1, ...insights.funnel.map((f) => f.reached));

	const bars = insights.funnel.map((f, i) => {
		const h = Math.max((f.reached / maxReached) * maxBarH, 4);
		const x = padX + slotW * i + slotW / 2 - barW / 2;
		const yTop = midY - h / 2;
		return { ...f, color: FLOW_COLORS[i] ?? f.color, x, yTop, h, cx: x + barW / 2 };
	});

	const exportPng = async () => {
		const svg = svgRef.current;
		if (!svg) return;
		// Reveal the export-only watermark on a clone so the on-screen chart stays clean.
		const clone = svg.cloneNode(true) as SVGSVGElement;
		for (const el of clone.querySelectorAll<SVGElement>("[data-export-only]")) el.style.display = "";
		// Inline the brand font so the rasterized PNG renders in IBM Plex Sans, not a system fallback.
		const fontFace = await ibmPlexFontFace();
		if (fontFace) {
			const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
			styleEl.textContent = fontFace;
			clone.querySelector("defs")?.prepend(styleEl);
		}
		const xml = new XMLSerializer().serializeToString(clone);
		const svg64 = `data:image/svg+xml;base64,${btoa(String.fromCharCode(...new TextEncoder().encode(xml)))}`;
		const image = new Image();
		image.onload = () => {
			const scale = 3; // high-resolution output
			const canvas = document.createElement("canvas");
			canvas.width = W * scale;
			canvas.height = H * scale;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			ctx.fillStyle = FLOW_BG;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
			const link = document.createElement("a");
			link.download = "pipeline-flow.png";
			link.href = canvas.toDataURL("image/png");
			link.click();
			toast.success(t`Exported pipeline-flow.png`);
		};
		image.src = svg64;
	};

	return (
		<div className="rounded-xl border border-border p-5">
			<div className="flex items-start justify-between gap-4">
				<h3 className="font-semibold text-sm">
					<Trans>Where your applications went</Trans>
				</h3>
				<Button size="sm" variant="outline" onClick={() => void exportPng()}>
					<DownloadSimpleIcon />
					<Trans>Export PNG</Trans>
				</Button>
			</div>

			<svg
				ref={svgRef}
				viewBox={`0 0 ${W} ${H}`}
				className="mt-3 w-full rounded-xl"
				style={{ fontFamily: FLOW_FONT }}
				role="img"
				aria-label={t`Pipeline flow`}
			>
				<defs>
					{bars.slice(0, -1).map((bar, i) => {
						const next = bars[i + 1];
						if (!next) return null;
						return (
							<linearGradient key={`grad-${bar.label}`} id={`flow-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
								<stop offset="0%" stopColor={bar.color} />
								<stop offset="100%" stopColor={next.color} />
							</linearGradient>
						);
					})}
				</defs>

				<rect x={0} y={0} width={W} height={H} rx={16} fill={FLOW_BG} />

				<text x={padX} y={40} fontSize={17} fontWeight={700} fill="#fafafa">
					{t`Job search pipeline`}
				</text>
				<text x={padX} y={60} fontSize={12} fill="#71717a">
					{t`${insights.total} applications tracked`}
				</text>
				{insights.rejected > 0 && (
					<g>
						<circle cx={W - padX - 96} cy={54} r={4} fill={FLOW_REJECTED} />
						<text x={W - padX - 86} y={58} fontSize={12} fill="#a1a1aa">
							{t`${insights.rejected} rejected`}
						</text>
					</g>
				)}

				{/* connecting bands — drawn center-to-center so they pass *behind* the bars (rendered
				    next, on top), leaving a single continuous flow with no seam at each stage. */}
				{bars.slice(0, -1).map((bar, i) => {
					const next = bars[i + 1];
					if (!next) return null;
					const x1 = bar.cx;
					const x2 = next.cx;
					const cxa = (x1 + x2) / 2;
					return (
						<path
							key={`band-${bar.label}`}
							d={`M${x1},${bar.yTop} C${cxa},${bar.yTop} ${cxa},${next.yTop} ${x2},${next.yTop} L${x2},${next.yTop + next.h} C${cxa},${next.yTop + next.h} ${cxa},${bar.yTop + bar.h} ${x1},${bar.yTop + bar.h} Z`}
							fill={`url(#flow-grad-${i})`}
							opacity={0.32}
						/>
					);
				})}

				{/* bars + labels */}
				{bars.map((bar, i) => (
					<g key={`bar-${bar.label}`}>
						<rect x={bar.x} y={bar.yTop} width={barW} height={bar.h} rx={6} fill={bar.color} />
						<text x={bar.cx} y={bar.yTop - 10} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fafafa">
							{bar.reached}
						</text>
						<text x={bar.cx} y={H - 42} textAnchor="middle" fontSize={12} fontWeight={500} fill="#e4e4e7">
							{bar.label}
						</text>
						{i > 0 && (
							<text x={bar.cx} y={H - 26} textAnchor="middle" fontSize={11} fill={bar.color}>
								{bar.conv}
							</text>
						)}
					</g>
				))}

				{/* export-only watermark: the Reactive Resume mark, bottom-right, 8px from each edge.
				    Paths are apps/web/public/icon/dark.svg verbatim (fill #FAFAFA). */}
				<g
					data-export-only
					style={{ display: "none" }}
					transform={`translate(${W - 8 - 256 * ICON_SCALE}, ${H - 8 - 220 * ICON_SCALE}) scale(${ICON_SCALE})`}
					fill="#FAFAFA"
					fillRule="evenodd"
					clipRule="evenodd"
				>
					<path d="M173.611 166.311L132.877 219.804H173.524L193.973 191.813L213.183 219.804H256L215.673 165.707L215.15 165.046L207.461 155.332L195.329 140.004L195.258 139.915L193.813 138.089L193.923 138.001L176.286 112.861H134.061L173.611 166.311ZM199.89 133.554L214.959 112.861H254.619L219.874 158.8L199.89 133.554Z" />
					<path d="M0 36.1959V174.314H39.0678V137.614H60.3938L60.4323 137.671C60.8436 137.653 61.2517 137.634 61.6567 137.614C75.0665 136.968 85.1471 135.549 96.385 131.385C96.7596 131.246 97.1355 131.104 97.5128 130.959L97.4591 130.881C105.816 126.86 112.331 121.344 117.006 114.331C122.005 106.702 124.504 97.6915 124.504 87.2997C124.504 76.7764 122.005 67.7 117.006 60.0706C112.007 52.3097 104.904 46.3903 95.6964 42.3125C86.62 38.2347 75.7679 36.1959 63.1399 36.1959H0ZM102.156 137.725L64.8705 144.175L85.4361 174.314H127.266L102.156 137.725ZM39.0678 107.426H60.7721C68.9277 107.426 74.9786 105.65 78.9248 102.098C83.0026 98.5465 85.0415 93.6137 85.0415 87.2997C85.0415 80.8542 83.0026 75.8556 78.9248 72.304C74.9786 68.7523 68.9277 66.9765 60.7721 66.9765H39.0678V107.426Z" />
				</g>
			</svg>
		</div>
	);
}
