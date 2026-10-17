import { openBrowserAsync } from "expo-web-browser";
import { getServer } from "@/auth/session";

export function openAccountSettings(
	path:
		| "/dashboard/settings/account"
		| "/dashboard/settings/account?deleteAccount=true"
		| "/dashboard/settings/ai" = "/dashboard/settings/account",
) {
	return openBrowserAsync(`${getServer()}${path}`);
}
