import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowLeftIcon, WarningIcon } from "@phosphor-icons/react";
import { Link, useRouteContext } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "@reactive-resume/ui/components/alert";
import { buttonVariants } from "@reactive-resume/ui/components/button";

function getErrorMessage(code: string | undefined): string {
	switch (code) {
		case "access_denied":
			return t`You cancelled the sign-in before it finished.`;
		case "no_code":
		case "state_not_found":
		case "invalid_callback_request":
			return t`This sign-in attempt expired or was already used. Please start again.`;
		case "invalid_code":
			return t`The provider rejected this sign-in attempt. Please start again.`;
		case "oauth_provider_not_found":
			return t`That sign-in provider is no longer available on this server.`;
		case "issuer_missing":
		case "issuer_mismatch":
		case "nonce_binding_missing":
			return t`The provider's response could not be verified. Please start again.`;
		case "unable_to_get_user_info":
			return t`We couldn't read your profile from the provider.`;
		case "email_not_found":
			return t`The provider didn't share an email address, which is required to sign in.`;
		case "email_not_verified":
			return t`Your email address isn't verified with the provider.`;
		case "email_does_not_match":
			return t`That provider account uses a different email address than your account.`;
		case "account_already_linked_to_different_user":
			return t`That provider account is already linked to a different user.`;
		case "unable_to_link_account":
			return t`We couldn't link that provider account. Please try again.`;
		case "signup_disabled":
			return t`New account sign-ups are currently disabled on this server.`;
		case "invalid_client":
		case "client_disabled":
		case "unauthorized_client":
		case "invalid_redirect":
		case "unsupported_response_type":
			return t`The application that sent you here made an invalid authorization request.`;
		default:
			return t`Something went wrong while signing you in. Please try again.`;
	}
}

type AuthErrorPageProps = {
	code: string | undefined;
	description: string | undefined;
};

export function AuthErrorPage({ code, description }: AuthErrorPageProps) {
	const context = useRouteContext({ strict: false });
	// Sign-in flows start signed out, so anyone who is already authenticated got here from the
	// "link a provider" flow in settings and should land back there rather than on a login form.
	const returnsToSettings = Boolean(context.session);

	return (
		<>
			<div className="space-y-1 text-center">
				<h1 className="font-semibold text-2xl tracking-tight">
					<Trans comment="Title on the page shown after a failed or cancelled OAuth sign-in">
						Sign-in didn't complete
					</Trans>
				</h1>
			</div>

			<Alert>
				<WarningIcon />
				<AlertTitle>{getErrorMessage(code)}</AlertTitle>
				{description && (
					<AlertDescription>
						<span className="mb-1 block text-xs">
							<Trans comment="Label above the raw error text forwarded by the identity provider">
								Details from the provider:
							</Trans>
						</span>
						<span className="block break-words font-mono text-xs">{description}</span>
					</AlertDescription>
				)}
			</Alert>

			{returnsToSettings ? (
				<Link to="/dashboard/settings/authentication" className={buttonVariants({ variant: "secondary" })}>
					<ArrowLeftIcon />
					<Trans comment="Action returning a signed-in user to the page where they manage linked providers">
						Back to authentication settings
					</Trans>
				</Link>
			) : (
				<Link to="/auth/login" className={buttonVariants({ variant: "secondary" })}>
					<ArrowLeftIcon />
					<Trans comment="Action returning the visitor to the sign-in page after a failed sign-in">
						Back to sign in
					</Trans>
				</Link>
			)}
		</>
	);
}
