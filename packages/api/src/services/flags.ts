import { env } from "@reactive-resume/env/server";

export type FeatureFlags = {
	disableSignups: boolean;
	disableEmailAuth: boolean;
};

export const flagsService = {
	getFlags: (): FeatureFlags => ({
		disableSignups: env.FLAG_DISABLE_SIGNUPS,
		disableEmailAuth: env.FLAG_DISABLE_EMAIL_AUTH,
	}),
};
