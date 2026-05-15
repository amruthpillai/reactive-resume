import type { IconProps } from "@phosphor-icons/react";
import type { FeatureFlags } from "@reactive-resume/api/features/flags";
import type { AuthSession } from "@reactive-resume/auth/types";
import type { Locale } from "@reactive-resume/utils/locale";
import type { QueryClient } from "@tanstack/react-query";
import type { orpc } from "@/libs/orpc/client";
import type { Theme } from "@/libs/theme";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { IconContext } from "@phosphor-icons/react";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet } from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { useEffect, useMemo } from "react";
import { DirectionProvider } from "@reactive-resume/ui/components/direction";
import { Toaster } from "@reactive-resume/ui/components/sonner";
import { TooltipProvider } from "@reactive-resume/ui/components/tooltip";
import { BreakpointIndicator } from "@/components/layout/breakpoint-indicator";
import { DonationToast } from "@/components/ui/donation-toast";
import { DialogManager } from "@/dialogs/manager";
import { CommandPalette } from "@/features/command-palette";
import { ThemeProvider } from "@/features/theme/provider";
import { ConfirmDialogProvider } from "@/hooks/use-confirm";
import { PromptDialogProvider } from "@/hooks/use-prompt";
import { getSession } from "@/libs/auth/session";
import { getLocale, isRTL, loadLocale } from "@/libs/locale";
import { client } from "@/libs/orpc/client";
import { getTheme } from "@/libs/theme";

type RouterContext = {
	theme: Theme;
	locale: Locale;
	orpc: typeof orpc;
	queryClient: QueryClient;
	session: AuthSession | null;
	flags: FeatureFlags;
};

const appName = "Reactive Resume";
const tagline = "A free and open-source resume builder";
const title = `${appName} — ${tagline}`;
const description =
	"Reactive Resume is a free and open-source resume builder that simplifies the process of creating, updating, and sharing your resume.";

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
	head: () => {
		const appUrl = typeof window !== "undefined" ? window.location.origin : "https://rxresu.me";

		return {
			links: [
				// Icons
				{ rel: "icon", href: "/favicon.ico", type: "image/x-icon", sizes: "128x128" },
				{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml", sizes: "256x256 any" },
				{ rel: "apple-touch-icon", href: "/apple-touch-icon-180x180.png", type: "image/png", sizes: "180x180 any" },
				// Manifest
				{ rel: "manifest", href: "/manifest.webmanifest", crossOrigin: "use-credentials" },
			],
			meta: [
				{ title },
				{ charSet: "UTF-8" },
				{ name: "description", content: description },
				{ name: "viewport", content: "width=device-width, initial-scale=1" },
				// Meta Tags
				{ name: "theme-color", content: "#09090B" },
				{ name: "application-name", content: "Reactive Resume" },
				{ name: "mobile-web-app-capable", content: "yes" },
				{ name: "apple-mobile-web-app-capable", content: "yes" },
				{ name: "apple-mobile-web-app-title", content: "Reactive Resume" },
				{ name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
				// Twitter Tags
				{ property: "twitter:image", content: `${appUrl}/opengraph/banner.jpg` },
				{ property: "twitter:card", content: "summary_large_image" },
				{ property: "twitter:title", content: title },
				{ property: "twitter:description", content: description },
				// OpenGraph Tags
				{ property: "og:image", content: `${appUrl}/opengraph/banner.jpg` },
				{ property: "og:site_name", content: appName },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:url", content: appUrl },
			],
		};
	},
	beforeLoad: async () => {
		const [theme, locale, session, flags] = await Promise.all([
			getTheme(),
			getLocale(),
			getSession(),
			client.flags.get(),
		]);

		await loadLocale(locale);

		return { theme, locale, session, flags };
	},
});

function RootComponent() {
	const { theme, locale, queryClient } = Route.useRouteContext();
	const dir = isRTL(locale) ? "rtl" : "ltr";

	const iconContextValue = useMemo<IconProps>(() => ({ size: 16, weight: "regular" }), []);

	useEffect(() => {
		document.documentElement.lang = locale;
		document.documentElement.dir = dir;
		document.documentElement.classList.toggle("dark", theme === "dark");
	}, [dir, locale, theme]);

	return (
		<>
			<HeadContent />

			<QueryClientProvider client={queryClient}>
				<MotionConfig reducedMotion="user">
					<I18nProvider i18n={i18n}>
						<IconContext.Provider value={iconContextValue}>
							<ThemeProvider theme={theme}>
								<HotkeysProvider>
									<DirectionProvider>
										<TooltipProvider>
											<ConfirmDialogProvider>
												<PromptDialogProvider>
													<Outlet />

													<DonationToast />
													<DialogManager />
													<CommandPalette />
													<Toaster richColors position="bottom-right" />

													{import.meta.env.DEV && <BreakpointIndicator />}
												</PromptDialogProvider>
											</ConfirmDialogProvider>
										</TooltipProvider>
									</DirectionProvider>
								</HotkeysProvider>
							</ThemeProvider>
						</IconContext.Provider>
					</I18nProvider>
				</MotionConfig>
			</QueryClientProvider>
		</>
	);
}
