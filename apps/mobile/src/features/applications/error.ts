import { t } from "@lingui/core/macro";
import { ORPCError } from "@orpc/client";

export function applicationError(error: unknown) {
	if (error instanceof ORPCError) {
		if (error.code === "UNAUTHORIZED") return t`Your session expired. Sign in again.`;
		if (error.code === "TOO_MANY_REQUESTS" || error.code === "RATE_LIMIT_EXCEEDED")
			return t`Too many requests. Try again later.`;
		if (error.code === "BAD_GATEWAY")
			return t`The service could not be reached. Try again or fill the details manually.`;
		if (error.code === "BAD_REQUEST")
			return t`Check the fields and try again. For unreadable links, paste the posting text instead.`;
	}
	return t`Could not complete the request. Check your connection and try again.`;
}
