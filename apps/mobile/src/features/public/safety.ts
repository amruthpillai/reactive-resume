import Storage from "expo-sqlite/kv-store";
import { client } from "@/api/client";
import { getAccountScope, getServer } from "@/auth/session";

// shortcut: device-only username blocks; use server-side author IDs if discovery or cross-device blocking ships.
const authorKey = (username: string) =>
	`public-resume:blocked:${JSON.stringify([getServer(), getAccountScope(), username.toLowerCase()])}`;

/** Account/server-scoped device preference; never silently ignore a failed safety-setting read or write. */
export const isAuthorBlocked = (username: string) => Storage.getItemSync(authorKey(username)) === "1";

export function setAuthorBlocked(username: string, blocked: boolean) {
	if (blocked) Storage.setItemSync(authorKey(username), "1");
	else Storage.removeItemSync(authorKey(username));
}

export async function loadSharedResume(username: string, slug: string) {
	if (isAuthorBlocked(username)) throw new Error("This author is blocked on this device.");
	const scope = getAccountScope();
	if (!scope) throw new Error("Sign in before opening a shared resume.");
	return await client.resume.getBySlug({ username, slug }, { context: { scope } });
}
