import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { authClient } from "@/libs/auth/client";
import { isOAuthRedirect } from "../redirect";

type OAuthConsentPageProps = {
	oauthQuery: string;
	email: string;
};

export function OAuthConsentPage({ oauthQuery, email }: OAuthConsentPageProps) {
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string>();
	const query = new URLSearchParams(oauthQuery);
	const clientId = query.get("client_id") ?? "";
	const scopes = new Set(query.get("scope")?.split(" ") ?? []);
	const validRequest = !!clientId && query.has("sig");
	const {
		data: client,
		isPending,
		isError,
	} = useQuery({
		queryKey: ["oauth-client", clientId, oauthQuery],
		enabled: validRequest,
		retry: false,
		queryFn: async () => {
			const { data, error } = await authClient.oauth2.publicClient({ query: { client_id: clientId } });
			if (error || !data) throw new Error(t`This connection request is invalid or has expired.`);
			return data;
		},
	});

	async function submit(accept: boolean) {
		if (pending || !client || !validRequest) return;
		setPending(true);
		setError(undefined);
		try {
			// This is the only point that grants access: an explicit button press.
			// Better Auth validates the signed request, session, and request origin.
			const { data, error } = await authClient.oauth2.consent({ accept, oauth_query: oauthQuery });
			if (error || !isOAuthRedirect(data)) {
				setError(t`Could not complete this connection. Restart the connection from your client and try again.`);
				setPending(false);
			}
			// Better Auth's redirect plugin follows a successful provider response.
		} catch {
			setError(t`Could not complete this connection. Restart the connection from your client and try again.`);
			setPending(false);
		}
	}

	return (
		<>
			<div className="space-y-2 text-center">
				<h1 className="font-semibold text-2xl tracking-tight">
					<Trans>Connect an application</Trans>
				</h1>
				<p className="wrap-anywhere text-muted-foreground text-sm">
					<Trans>Signed in as {email}</Trans>
				</p>
			</div>
			{!validRequest || isError ? (
				<p role="alert">
					<Trans>This connection request is invalid or has expired.</Trans>
				</p>
			) : isPending ? (
				<p role="status">
					<Trans>Loading connection request...</Trans>
				</p>
			) : client ? (
				<div className="space-y-4">
					<div className="wrap-anywhere space-y-1">
						<p className="font-medium">{client.client_name || clientId}</p>
						<p className="text-muted-foreground text-xs">
							<Trans>Client ID</Trans>: {clientId}
						</p>
					</div>
					<p className="text-sm">
						<Trans>Only allow applications you trust. This application will be able to:</Trans>
					</p>
					<ul className="list-disc space-y-2 pl-5 text-sm">
						<li>
							<Trans>
								Access your account through the API, including reading and changing your resumes and job applications.
							</Trans>
						</li>
						{scopes.has("profile") && (
							<li>
								<Trans>Read your profile information.</Trans>
							</li>
						)}
						{scopes.has("email") && (
							<li>
								<Trans>Read your email address.</Trans>
							</li>
						)}
						{scopes.has("offline_access") && (
							<li>
								<Trans>Keep access when you are not using the application.</Trans>
							</li>
						)}
					</ul>
					{error && (
						<p role="alert" className="text-destructive text-sm">
							{error}
						</p>
					)}
					<div className="flex gap-2">
						<Button className="flex-1" variant="outline" disabled={pending} onClick={() => void submit(false)}>
							<Trans>Deny</Trans>
						</Button>
						<Button className="flex-1" disabled={pending} onClick={() => void submit(true)}>
							<Trans>Allow access</Trans>
						</Button>
					</div>
				</div>
			) : null}
		</>
	);
}
