import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, m, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { cn } from "@reactive-resume/utils/style";
import { orpc } from "@/libs/orpc/client";
import { wrap } from "./classes";

// The statistics service caches these totals for six hours.
const refreshInterval = 6 * 60 * 60 * 1000;

export function CommunityStats() {
	const { i18n } = useLingui();
	const ref = useRef<HTMLElement>(null);
	const entered = useInView(ref, { once: true, amount: 0.2 });
	const { data, isError } = useQuery(
		orpc.statistics.getTotals.queryOptions({
			enabled: entered,
			staleTime: refreshInterval,
			refetchInterval: refreshInterval,
		}),
	);
	const labels = [t`Users`, t`Resumes`];
	const ids = ["users", "resumes"] as const;
	const totals = data;
	const cachedAt = totals?.cachedAt;
	const cachedDate = cachedAt == null ? null : new Date(cachedAt);
	const formattedDate = cachedDate ? i18n.date(cachedDate, { dateStyle: "medium", timeStyle: "short" }) : "";

	return (
		<section
			ref={ref}
			className={cn(wrap, "pt-12 pb-[54px] max-[600px]:pt-[34px] max-[600px]:pb-10")}
			id="community"
			aria-labelledby="community-title"
		>
			<div className="mb-8 max-[600px]:mb-6">
				<h2
					id="community-title"
					className="font-[Manrope_Variable,sans-serif] font-semibold text-[26px] leading-[1.3] tracking-[-0.04em] max-[600px]:text-[24px]"
				>
					<Trans>You’re in good company.</Trans>
				</h2>
			</div>
			<dl className="grid grid-cols-2 border-(--home-line) border-y pt-[30px] pb-[26px] max-[600px]:grid-cols-1 max-[600px]:gap-6 max-[600px]:py-6">
				{ids.map((id, index) => (
					<div
						className="@container min-w-0 not-first:border-(--home-line) not-first:border-l not-first:pl-[12%] max-[600px]:not-first:border-t max-[600px]:not-first:border-l-0 max-[600px]:not-first:pt-6 max-[600px]:not-first:pl-0"
						key={id}
					>
						<dt className="flex items-center gap-3 text-(--home-muted) text-[13px]">
							<Mark id={id} />
							{labels[index]}
						</dt>
						<dd className="mt-[18px] font-[Manrope_Variable,sans-serif] font-extrabold text-[clamp(44px,6.4vw,92px)] leading-[1.1] tracking-[-0.09em] max-[600px]:mt-[11px] max-[600px]:text-[clamp(40px,14cqw,64px)]">
							{totals ? (
								<RollingTotal value={totals[id]} entered={entered} />
							) : (
								<span className="text-[#636367]">
									<span aria-hidden="true">···</span>
									<span className="sr-only">{isError ? t`Total unavailable` : t`Loading total`}</span>
								</span>
							)}
						</dd>
					</div>
				))}
			</dl>
			<p className="mt-[14px] text-[#85858c] text-[11px]">
				{cachedDate ? (
					<Trans>
						As of <time dateTime={cachedDate.toISOString()}>{formattedDate}</time>.
					</Trans>
				) : isError && !totals ? (
					t`Some totals are unavailable right now.`
				) : (
					t`Totals are refreshed periodically.`
				)}
			</p>
		</section>
	);
}

type MarkProps = { id: "users" | "resumes" };

function Mark({ id }: MarkProps) {
	const users = id === "users";
	const sheet = cn(
		"absolute left-[7px] border bg-(--home-bg)",
		users ? "top-[7px] h-3 w-3 rounded-full" : "top-[3px] h-[19px] w-[14px] rounded-sm",
	);

	return (
		<span className="relative block h-[25px] w-7" aria-hidden="true">
			<i className={`${sheet} -translate-x-[5px] translate-y-[2px] -rotate-[13deg] border-[#68606f]`} />
			<i className={cn(sheet, users ? "border-[#c7b5a5]" : "border-[#baafc4]")} />
			<i className={`${sheet} translate-x-[5px] -translate-y-px rotate-12 border-[#9c8caa]`} />
		</span>
	);
}

type RollingTotalProps = { value: number; entered: boolean };

function RollingTotal({ value, entered }: RollingTotalProps) {
	const { i18n } = useLingui();
	const reducedMotion = useReducedMotion();
	const formatted = i18n.number(value, { maximumFractionDigits: 0 });
	const characters = Array.from(formatted);

	return (
		<>
			<span className="sr-only">{formatted}</span>
			<span className="inline-flex [direction:ltr] [unicode-bidi:isolate]" aria-hidden="true">
				{characters.map((character, index) => (
					<span
						// The roll needs a vertical mask, but overflow-clip also cuts horizontally, and the negative
						// tracking shrinks each glyph's box below its ink width. Padding widens the clip box; the
						// matching negative margin keeps the tightened spacing.
						className="relative -mx-[0.12em] inline-block h-[1.16em] shrink-0 overflow-clip px-[0.12em]"
						key={characters.length - index}
					>
						<AnimatePresence mode="popLayout">
							<m.span
								className="block"
								key={character}
								initial={reducedMotion ? false : { y: "105%", opacity: 0 }}
								animate={entered || reducedMotion ? { y: "0%", opacity: 1 } : { y: "105%", opacity: 0 }}
								exit={{ y: "-105%", opacity: 0 }}
								transition={
									reducedMotion
										? { duration: 0 }
										: { type: "spring", stiffness: 190, damping: 27, delay: index * 0.025 }
								}
							>
								{character}
							</m.span>
						</AnimatePresence>
					</span>
				))}
			</span>
		</>
	);
}
