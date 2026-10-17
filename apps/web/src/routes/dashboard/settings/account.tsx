import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AccountSettings } from "@/features/settings/account/page";

export const Route = createFileRoute("/dashboard/settings/account")({
	validateSearch: z.object({ deleteAccount: z.boolean().optional().catch(false) }),
	component: AccountSettings,
});
