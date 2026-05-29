import type { FeatureFlags } from "@reactive-resume/api/features/flags";
import { getSession } from "@/libs/auth/session";
import { getLocale, loadLocale } from "@/libs/locale";
import { client } from "@/libs/orpc/client";
import { getTheme } from "@/libs/theme";

const defaultFlags: FeatureFlags = {
	disableSignups: false,
	disableEmailAuth: false,
};

const getFlags = async (): Promise<FeatureFlags> => {
	try {
		return await client.flags.get();
	} catch {
		return defaultFlags;
	}
};

const getSafeSession = async () => {
	try {
		return await getSession();
	} catch {
		return null;
	}
};

export const getBootstrapContext = async () => {
	const [theme, locale, session, flags] = await Promise.all([getTheme(), getLocale(), getSafeSession(), getFlags()]);

	await loadLocale(locale);

	return { theme, locale, session, flags };
};
