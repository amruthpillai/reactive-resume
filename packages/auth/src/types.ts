import type { auth } from "./config";
import z from "zod";

export type AuthSession = {
	session: typeof auth.$Infer.Session.session;
	user: typeof auth.$Infer.Session.user;
};

const authProviderSchema = z.enum(["credential", "passkey", "google", "github", "linkedin", "custom"]);

export type AuthProvider = z.infer<typeof authProviderSchema>;
