import Cookie from "js-cookie";
import { useCallback, useEffect, useMemo, useState } from "react";

type CookieAttributes = NonNullable<Parameters<typeof Cookie.set>[2]>;

type SharedCookieOptions = {
	domain?: CookieAttributes["domain"];
	partitioned?: boolean;
	path?: CookieAttributes["path"];
	sameSite?: CookieAttributes["sameSite"];
	secure?: CookieAttributes["secure"];
};

export type UseCookieOptions = SharedCookieOptions & {
	expires?: CookieAttributes["expires"];
};
export type UseCookieRemoveOptions = SharedCookieOptions;

export const DEFAULT_COOKIE_ATTRIBUTES = {
	path: "/",
	secure: true,
	sameSite: "lax",
} as const satisfies UseCookieRemoveOptions;

const canUseCookies = () => typeof document !== "undefined";

const getCookie = (name: string) => {
	if (!canUseCookies()) return null;
	return Cookie.get(name) ?? null;
};

const compactCookieOptions = ({
	domain,
	expires,
	partitioned,
	path,
	sameSite,
	secure,
}: UseCookieOptions): CookieAttributes => ({
	...(domain !== undefined && { domain }),
	...(expires !== undefined && { expires }),
	...(partitioned !== undefined && { partitioned }),
	...(path !== undefined && { path }),
	...(sameSite !== undefined && { sameSite }),
	...(secure !== undefined && { secure }),
});

const resolveCookieOptions = (options?: UseCookieOptions): CookieAttributes => {
	return {
		...DEFAULT_COOKIE_ATTRIBUTES,
		...(options && compactCookieOptions(options)),
	};
};

const resolveRemoveOptions = (options?: UseCookieRemoveOptions): CookieAttributes => {
	return {
		...DEFAULT_COOKIE_ATTRIBUTES,
		...(options && compactCookieOptions(options)),
	};
};

export function useCookie(
	name: string,
	defaultValue?: string,
	defaultOptions?: UseCookieOptions,
): readonly [
	string | null,
	(value: string, options?: UseCookieOptions) => void,
	(options?: UseCookieRemoveOptions) => void,
] {
	const initialValue = useMemo(() => getCookie(name) ?? defaultValue ?? null, [name, defaultValue]);
	const [value, setValue] = useState<string | null>(initialValue);

	useEffect(() => {
		const cookie = getCookie(name);

		if (cookie !== null) {
			setValue(cookie);
			return;
		}

		if (defaultValue === undefined) {
			setValue(null);
			return;
		}

		if (canUseCookies()) Cookie.set(name, defaultValue, resolveCookieOptions(defaultOptions));
		setValue(defaultValue);
	}, [name, defaultValue, defaultOptions]);

	const updateCookie = useCallback(
		(nextValue: string, options?: UseCookieOptions) => {
			if (canUseCookies()) Cookie.set(name, nextValue, resolveCookieOptions(options));
			setValue(nextValue);
		},
		[name],
	);

	const deleteCookie = useCallback(
		(options?: UseCookieRemoveOptions) => {
			if (canUseCookies()) Cookie.remove(name, resolveRemoveOptions(options));
			setValue(null);
		},
		[name],
	);

	return [value, updateCookie, deleteCookie] as const;
}
