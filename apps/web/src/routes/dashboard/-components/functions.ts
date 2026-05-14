import Cookies from "js-cookie";
import z from "zod";

const SIDEBAR_COOKIE_NAME = "sidebar_state";

export function getDashboardSidebarState() {
	return Cookies.get(SIDEBAR_COOKIE_NAME) !== "false";
}

export function setDashboardSidebarState(value: boolean) {
	const parsed = z.boolean().parse(value);
	Cookies.set(SIDEBAR_COOKIE_NAME, parsed.toString());
}
