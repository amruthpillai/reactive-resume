import type { ExpoConfig } from "expo/config";

// The official host. Universal Links, App Links and the OAuth callback (`/auth/native-callback`) verify against it.
const host = "rxresu.me";

const config: ExpoConfig = {
	name: "Reactive Resume",
	slug: "reactive-resume",
	scheme: "me.rxresu.app",
	owner: "amruthpillai",
	version: "1.0.0",
	orientation: "default",
	userInterfaceStyle: "automatic",
	ios: {
		bundleIdentifier: "me.rxresu.app",
		appleTeamId: "654ASRW868",
		deploymentTarget: "17.4",
		supportsTablet: true,
		// `webcredentials` lets ASWebAuthenticationSession complete the https callback (iOS 17.4+).
		associatedDomains: [`applinks:${host}`, `webcredentials:${host}`],
	},
	android: {
		package: "me.rxresu.app",
		predictiveBackGestureEnabled: false,
		intentFilters: [
			{
				action: "VIEW",
				autoVerify: true,
				category: ["BROWSABLE", "DEFAULT"],
				data: [
					{ scheme: "https", host, path: "/auth/native-callback" },
					// `/$username/$slug` is left to M7-T3: a two-segment pattern would also capture web-only routes.
					{ scheme: "https", host, pathPrefix: "/builder/" },
				],
			},
		],
	},
	plugins: [
		"expo-router",
		"expo-dev-client",
		"expo-font",
		"expo-image",
		"expo-sqlite",
		"expo-secure-store",
		"expo-web-browser",
		"expo-localization",
		"expo-document-picker",
		"expo-file-system",
		"expo-sharing",
		"expo-system-ui",
		"expo-status-bar",
		["expo-splash-screen", { backgroundColor: "#F8F7F3", dark: { backgroundColor: "#100F0C" } }],
		[
			"expo-image-picker",
			{
				photosPermission: "Reactive Resume uses your photos to set the picture on your resume.",
				cameraPermission: false,
				microphonePermission: false,
			},
		],
		[
			"expo-audio",
			{ microphonePermission: "Reactive Resume records your answers when you practise for an interview." },
		],
		"expo-notifications",
	],
	extra: {
		eas: { projectId: "5830280e-e1ba-45b7-b9c9-ba048fa3bd4d" },
	},
};

export default config;
