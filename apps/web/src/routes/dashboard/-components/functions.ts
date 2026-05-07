import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import z from "zod";

const SIDEBAR_COOKIE_NAME = "sidebar_state";

export const getDashboardSidebarServerFn = createServerFn({ method: "GET" }).handler(async () => {
	const sidebarState = getCookie(SIDEBAR_COOKIE_NAME) !== "false";
	return sidebarState;
});

export const setDashboardSidebarServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.boolean())
	.handler(async ({ data }) => {
		setCookie(SIDEBAR_COOKIE_NAME, data.toString());
	});
