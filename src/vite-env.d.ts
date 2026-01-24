/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;

declare module "*.css";
declare module "@fontsource/*" {}
declare module "@fontsource-variable/*" {}

declare namespace NodeJS {
	interface ProcessEnv {
		// Basics
		PORT: string;
		APP_URL: string;
		PRINTER_APP_URL?: string;

		// Authentication
		AUTH_SECRET: string;

		// Printer
		PRINTER_ENDPOINT?: string;

		// Database
		DATABASE_URL: string;

		// Social Auth (Google)
		GOOGLE_CLIENT_ID?: string;
		GOOGLE_CLIENT_SECRET?: string;

		// Social Auth (GitHub)
		GITHUB_CLIENT_ID?: string;
		GITHUB_CLIENT_SECRET?: string;

		// Storage (Optional)
		S3_ACCESS_KEY_ID?: string;
		S3_SECRET_ACCESS_KEY?: string;
		S3_REGION?: string;
		S3_ENDPOINT?: string;
		S3_BUCKET?: string;
		S3_FORCE_PATH_STYLE?: string | boolean;

		// Custom OAuth Provider
		OAUTH_PROVIDER_NAME?: string;
		OAUTH_CLIENT_ID?: string;
		OAUTH_CLIENT_SECRET?: string;
		OAUTH_DISCOVERY_URL?: string;
		OAUTH_AUTHORIZATION_URL?: string;
		OAUTH_TOKEN_URL?: string;
		OAUTH_USER_INFO_URL?: string;
		OAUTH_SCOPES?: string;

		// Feature Flags
		FLAG_DEBUG_PRINTER: string | boolean;
		FLAG_DISABLE_SIGNUPS: string | boolean;
		FLAG_DISABLE_EMAIL_AUTH: string | boolean;
	}
}
