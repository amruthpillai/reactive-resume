import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { FastResponse } from "srvx";

globalThis.Response = FastResponse;

export default createServerEntry({
	fetch(request) {
		return handler.fetch(request);
	},
});
