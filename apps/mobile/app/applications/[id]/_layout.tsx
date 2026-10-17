import { Stack, useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { WorkspaceChrome } from "@/shell/workspace-chrome";

/** One application's workspace: Fit, Apply, Prepare, Practise, Debrief, Messages and Saved under one top bar. */
export default function ApplicationLayout() {
	const navigation = useNavigation();

	// The root stack would draw its own header above the workspace top bar.
	useLayoutEffect(() => navigation.setOptions({ headerShown: false }), [navigation]);

	return (
		<WorkspaceChrome>
			<Stack screenOptions={{ headerShown: false, animation: "none" }} />
		</WorkspaceChrome>
	);
}
