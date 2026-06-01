import { useRef, useState, useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

export function useIsMobile() {
	const [mediaQueryList] = useState(() => (typeof window === "undefined" ? null : window.matchMedia(MOBILE_QUERY)));
	const latestMatchesRef = useRef(mediaQueryList?.matches ?? false);

	return useSyncExternalStore(
		(onStoreChange) => {
			if (!mediaQueryList) return () => {};

			const handleChange = (event: MediaQueryListEvent | { matches: boolean }) => {
				latestMatchesRef.current = event.matches;
				onStoreChange();
			};

			mediaQueryList.addEventListener("change", handleChange);
			return () => mediaQueryList.removeEventListener("change", handleChange);
		},
		() => latestMatchesRef.current,
		() => false,
	);
}
