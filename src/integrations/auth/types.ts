import z from "zod";
import type { auth } from "./config";

export type AuthSession = {
	session: typeof auth.$Infer.Session.session;
	user: typeof auth.$Infer.Session.user & {
		name: string;
	};
};

const authProviderSchema = z.enum(["credential", "google", "github", "custom"]);

export type AuthProvider = z.infer<typeof authProviderSchema>;
