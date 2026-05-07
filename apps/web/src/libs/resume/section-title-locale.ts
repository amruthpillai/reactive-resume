import type { SectionTitleResolver } from "@reactive-resume/pdf/section-title";
import { setupI18n } from "@lingui/core";
import { useEffect, useState } from "react";
import { getLocaleMessages, resolveLocale } from "@/libs/locale";
import { createSectionTitleResolver } from "./section-title";

const resolverCache = new Map<string, Promise<SectionTitleResolver>>();

export const createSectionTitleResolverForLocale = async (localeParam: string) => {
	const requestedLocale = resolveLocale(localeParam);
	const cachedResolver = resolverCache.get(requestedLocale);

	if (cachedResolver) return cachedResolver;

	const resolver = getLocaleMessages(requestedLocale).then(({ locale, messages }) => {
		const i18n = setupI18n({ locale });
		i18n.loadAndActivate({ locale, messages });

		return createSectionTitleResolver(i18n);
	});

	resolverCache.set(requestedLocale, resolver);

	return resolver;
};

export const useSectionTitleResolver = (locale?: string) => {
	const [resolver, setResolver] = useState<SectionTitleResolver | null>(null);

	useEffect(() => {
		if (!locale) {
			setResolver(null);
			return;
		}

		let cancelled = false;

		setResolver(null);
		void createSectionTitleResolverForLocale(locale).then((nextResolver) => {
			if (!cancelled) setResolver(() => nextResolver);
		});

		return () => {
			cancelled = true;
		};
	}, [locale]);

	return resolver;
};
