import { t } from "@lingui/core/macro";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { useTheme } from "./provider";

export function ThemeToggleButton(props: React.ComponentProps<typeof Button>) {
	const { theme, toggleTheme } = useTheme();
	const buttonRef = useRef<HTMLButtonElement>(null);

	const onToggleTheme = useCallback(async () => {
		if (
			!buttonRef.current ||
			!document.startViewTransition ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			toggleTheme();
			return;
		}

		let timeout: NodeJS.Timeout;
		const style = document.createElement("style");

		style.textContent = `
			::view-transition-old(root), ::view-transition-new(root) {
				mix-blend-mode: normal !important;
				animation: none !important;
			}
		`;

		function transitionCallback() {
			flushSync(() => {
				toggleTheme();
				timeout = setTimeout(() => {
					clearTimeout(timeout);
					document.head.removeChild(style);
				}, 1000);
			});
		}

		document.head.appendChild(style);
		await document.startViewTransition(transitionCallback).ready;

		const { top, left, width, height } = buttonRef.current.getBoundingClientRect();
		const x = left + width / 2;
		const y = top + height / 2;
		const right = window.innerWidth - left;
		const bottom = window.innerHeight - top;
		const maxRadius = Math.hypot(Math.max(left, right), Math.max(top, bottom));

		document.documentElement.animate(
			{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`] },
			{ duration: 500, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" },
		);
	}, [toggleTheme]);

	const ariaLabel = theme === "dark" ? t`Switch to light theme` : t`Switch to dark theme`;

	return (
		<Button size="icon" variant="ghost" ref={buttonRef} onClick={onToggleTheme} aria-label={ariaLabel} {...props}>
			{theme === "dark" ? <MoonIcon aria-hidden="true" /> : <SunIcon aria-hidden="true" />}
		</Button>
	);
}
