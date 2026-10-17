import type { ReactNode } from "react";
import type { EdgeInsets } from "react-native-safe-area-context";
import { createContext, use } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const WindowInsetsContext = createContext<EdgeInsets | null>(null);
type WindowSafeAreaProviderProps = { children: ReactNode };

/** Keep window insets for portals when a pane has already consumed its local safe areas. */
export function WindowSafeAreaProvider({ children }: WindowSafeAreaProviderProps) {
	const insets = useSafeAreaInsets();
	return <WindowInsetsContext value={insets}>{children}</WindowInsetsContext>;
}

export function useWindowSafeAreaInsets() {
	const windowInsets = use(WindowInsetsContext);
	const localInsets = useSafeAreaInsets();
	return windowInsets ?? localInsets;
}
