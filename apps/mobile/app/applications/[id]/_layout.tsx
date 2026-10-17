import { useLingui } from "@lingui/react/macro";
import { useRouter, Stack, useNavigation } from "expo-router";
import { Platform } from "react-native";
import { routes } from "@/routes";
import { isWorkspaceTab, WorkspaceChrome } from "@/shell/workspace-chrome";
import { IconButton } from "@/ui";

/**
 * One application: the workspace tabs (Fit … Saved) under the workspace top bar, and the application detail
 * (`details`) with a plain header of its own.
 */
export default function ApplicationLayout() {
	const router = useRouter();
	const { t } = useLingui();
	const navigation = useNavigation();
	const leave = () => (navigation.canGoBack() ? navigation.goBack() : router.replace(routes.applications()));

	return (
		<WorkspaceChrome>
			<Stack
				screenOptions={({ route }) =>
					isWorkspaceTab((route.params as { tab?: string } | undefined)?.tab)
						? { headerShown: false, animation: "none" }
						: {
								animation: "none",
								// The first screen of this stack has no back button of its own.
								headerLeft: () => (
									<IconButton
										icon={Platform.OS === "android" ? "arrow-left" : "caret-left"}
										label={t`Back to applications`}
										onPress={leave}
									/>
								),
							}
				}
			/>
		</WorkspaceChrome>
	);
}
