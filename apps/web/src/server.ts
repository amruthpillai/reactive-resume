import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { FastResponse } from "srvx";
import { migrateDatabase } from "./libs/drizzle/migrate";

globalThis.Response = FastResponse;

await migrateDatabase();

export default createServerEntry({
	fetch(request) {
		return handler.fetch(request);
	},
});
