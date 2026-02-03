import { t } from "@lingui/core/macro";
import { ArrowRightIcon, TranslateIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef } from "react";
import { GithubStarsButton } from "@/components/input/github-stars-button";
import { LocaleCombobox } from "@/components/locale/combobox";
import { ThemeToggleButton } from "@/components/theme/toggle-button";
import { BrandIcon } from "@/components/ui/brand-icon";
import { Button } from "@/components/ui/button";
import { ProductHuntBanner } from "./product-hunt-banner";

export function Header() {
	const y = useMotionValue(0);
	const lastScroll = useRef(0);
	const ticking = useRef(false);
	const springY = useSpring(y, { stiffness: 300, damping: 40 });

	useEffect(() => {
		if (typeof window === "undefined") return;

		function onScroll() {
			const current = window.scrollY ?? 0;
			if (!ticking.current) {
				window.requestAnimationFrame(() => {
					if (current > 32 && current > lastScroll.current) {
						// Scrolling down, hide
						y.set(-100);
					} else {
						// Scrolling up, show
						y.set(0);
					}
					lastScroll.current = current;
					ticking.current = false;
				});
				ticking.current = true;
			}
		}

		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<motion.header
			style={{ y: springY }}
			className="fixed inset-x-0 top-0 z-50 border-transparent border-b bg-background/80 backdrop-blur-lg transition-colors"
			initial={{ y: -100, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ duration: 0.5, ease: "easeOut" }}
		>
			<ProductHuntBanner />

			<nav aria-label={t`Main navigation`} className="container mx-auto flex items-center gap-x-4 p-3 lg:px-12">
				<Link to="/" className="transition-opacity hover:opacity-80" aria-label={t`Reactive Resume - Go to homepage`}>
					<BrandIcon className="size-10" />
				</Link>

				<div className="ml-auto flex items-center gap-x-2">
					<LocaleCombobox
						buttonProps={{
							size: "icon",
							variant: "ghost",
							className: "justify-center",
							"aria-label": t`Change language`,
							children: () => <TranslateIcon aria-hidden="true" />,
						}}
					/>

					<ThemeToggleButton />

					<div className="hidden items-center gap-x-4 sm:flex">
						<GithubStarsButton />

						<Button asChild size="icon" aria-label={t`Go to dashboard`}>
							<Link to="/dashboard">
								<ArrowRightIcon aria-hidden="true" />
							</Link>
						</Button>
					</div>
				</div>
			</nav>
		</motion.header>
	);
}
