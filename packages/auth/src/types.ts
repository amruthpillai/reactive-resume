import type { auth } from "./config";

export type AuthSession = {
	session: typeof auth.$Infer.Session.session;
	user: typeof auth.$Infer.Session.user;
};

// ponytail: plain union replaces z.enum solely used for type inference
export type AuthProvider = "credential" | "passkey" | "apple" | "google" | "github" | "linkedin" | "custom";
