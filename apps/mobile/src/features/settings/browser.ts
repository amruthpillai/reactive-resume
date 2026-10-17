import { openBrowserAsync } from "expo-web-browser";
import { getServer } from "@/auth/session";

export function openAccountSettings(section = "") {
	return openBrowserAsync(`${getServer()}/dashboard/settings/account${section ? `#${section}` : ""}`);
}
