import { useRouter } from "@tanstack/react-router";
import { createContext, type PropsWithChildren, use } from "react";

import { setThemeServerFn, type Theme } from "@/utils/theme";

type ThemeContextValue = {
	theme: Theme;
	setTheme: (value: Theme, options?: { playSound?: boolean }) => void;
	toggleTheme: (options?: { playSound?: boolean }) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type Props = PropsWithChildren<{ theme: Theme }>;

export function ThemeProvider({ children, theme }: Props) {
	const router = useRouter();

	async function setTheme(value: Theme, options: { playSound?: boolean } = {}) {
		const { playSound = true } = options;

		document.documentElement.classList.toggle("dark", value === "dark");
		await setThemeServerFn({ data: value });
		void router.invalidate();

		if (!playSound) return;

		try {
			const soundClip = value === "dark" ? "/sounds/switch-off.mp3" : "/sounds/switch-on.mp3";
			const audio = new Audio(soundClip);
			await audio.play();
		} catch {
			// ignore errors
		}
	}

	function toggleTheme(options: { playSound?: boolean } = {}) {
		void setTheme(theme === "dark" ? "light" : "dark", options);
	}

	return <ThemeContext value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext>;
}

export function useTheme() {
	const value = use(ThemeContext);

	if (!value) throw new Error("useTheme must be used within a ThemeProvider");

	return value;
}
