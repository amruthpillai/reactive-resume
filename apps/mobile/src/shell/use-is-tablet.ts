import { useWindowDimensions } from "react-native";

/**
 * Below this window width the app uses the phone layout. It goes by the window, not the device, so an iPad in
 * Split View or a narrow Stage Manager window gets the phone layout (builder.html: "below 700 pt wide").
 */
const tabletMinWidth = 700;

/** True when the window is wide enough for the sidebar and the builder's panel + page split. */
export function useIsTablet() {
	return useWindowDimensions().width >= tabletMinWidth;
}
