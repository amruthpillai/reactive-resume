import type { ExpoConfig } from "expo/config";

// Build-time legal text uses installed packages and Node built-ins; no dependency or runtime filesystem access.
require("./src/features/licences/generate.cjs");

// The official host. Universal Links, App Links and the OAuth callback (`/auth/native-callback`) verify against it.
const host = "rxresu.me";

const config: ExpoConfig = {
	name: "Reactive Resume",
	slug: "reactive-resume",
	scheme: "me.rxresu",
	owner: "amruthpillai",
	version: "1.0.0",
	icon: "./assets/icon.png",
	orientation: "default",
	userInterfaceStyle: "automatic",
	ios: {
		bundleIdentifier: "me.rxresu",
		appleTeamId: "654ASRW868",
		deploymentTarget: "17.4",
		supportsTablet: true,
		config: { usesNonExemptEncryption: false },
		privacyManifests: {
			NSPrivacyTracking: false,
			NSPrivacyTrackingDomains: [],
			NSPrivacyAccessedAPITypes: [
				{
					NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
					NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
				},
				{
					NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
					NSPrivacyAccessedAPITypeReasons: ["C617.1", "3B52.1", "0A2A.1"],
				},
				{
					NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
					NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
				},
				{
					NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
					NSPrivacyAccessedAPITypeReasons: ["E174.1", "85F4.1"],
				},
			],
		},
		// `webcredentials` lets ASWebAuthenticationSession complete the https callback (iOS 17.4+).
		associatedDomains: [`applinks:${host}`, `webcredentials:${host}`],
	},
	android: {
		package: "me.rxresu",
		predictiveBackGestureEnabled: false,
		adaptiveIcon: {
			foregroundImage: "./assets/adaptive-foreground.png",
			backgroundImage: "./assets/adaptive-background.png",
			backgroundColor: "#F8F7F3",
		},
		// Profile camera is used. Pickers/share sheets need no broad storage access; Practise has no audio code yet.
		blockedPermissions: [
			"android.permission.SYSTEM_ALERT_WINDOW",
			"android.permission.READ_EXTERNAL_STORAGE",
			"android.permission.WRITE_EXTERNAL_STORAGE",
			"android.permission.READ_MEDIA_IMAGES",
			"android.permission.READ_MEDIA_VIDEO",
			"android.permission.READ_MEDIA_AUDIO",
			"android.permission.RECORD_AUDIO",
			"android.permission.MODIFY_AUDIO_SETTINGS",
			"android.permission.FOREGROUND_SERVICE",
			"android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
			"android.permission.FOREGROUND_SERVICE_MICROPHONE",
			// expo-notifications bundles Firebase and vendor badge helpers; app uses neither push nor badge counts.
			"android.permission.WAKE_LOCK",
			"com.google.android.c2dm.permission.RECEIVE",
			"com.sec.android.provider.badge.permission.READ",
			"com.sec.android.provider.badge.permission.WRITE",
			"com.htc.launcher.permission.READ_SETTINGS",
			"com.htc.launcher.permission.UPDATE_SHORTCUT",
			"com.sonyericsson.home.permission.BROADCAST_BADGE",
			"com.sonymobile.home.permission.PROVIDER_INSERT_BADGE",
			"com.anddoes.launcher.permission.UPDATE_COUNT",
			"com.majeur.launcher.permission.UPDATE_BADGE",
			"com.huawei.android.launcher.permission.CHANGE_BADGE",
			"com.huawei.android.launcher.permission.READ_SETTINGS",
			"com.huawei.android.launcher.permission.WRITE_SETTINGS",
			"android.permission.READ_APP_BADGE",
			"com.oppo.launcher.permission.READ_SETTINGS",
			"com.oppo.launcher.permission.WRITE_SETTINGS",
			"me.everything.badger.permission.BADGE_COUNT_READ",
			"me.everything.badger.permission.BADGE_COUNT_WRITE",
		],
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
		["expo-secure-store", { faceIDPermission: false }],
		"expo-web-browser",
		"expo-localization",
		"expo-document-picker",
		"expo-file-system",
		"expo-sharing",
		"expo-system-ui",
		"expo-status-bar",
		[
			"expo-splash-screen",
			{
				image: "./assets/splash-icon.png",
				imageWidth: 160,
				backgroundColor: "#F8F7F3",
				dark: { image: "./assets/splash-icon-dark.png", backgroundColor: "#100F0C" },
			},
		],
		[
			"expo-image-picker",
			{
				photosPermission: "Reactive Resume uses your photos to set the picture on your resume.",
				cameraPermission: "Reactive Resume uses your camera to take a profile photo.",
				microphonePermission: false,
			},
		],
		[
			"expo-audio",
			{
				microphonePermission: false,
				recordAudioAndroid: false,
				enableBackgroundPlayback: false,
				enableBackgroundRecording: false,
			},
		],
		["expo-notifications", { enableRemoteNotifications: false, enableBackgroundRemoteNotifications: false }],
		"@react-native-community/datetimepicker",
	],
	extra: {
		eas: { projectId: "5830280e-e1ba-45b7-b9c9-ba048fa3bd4d" },
	},
};

export default config;
