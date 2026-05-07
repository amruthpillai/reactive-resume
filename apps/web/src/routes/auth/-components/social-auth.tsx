import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { FingerprintIcon, GithubLogoIcon, GoogleLogoIcon, LinkedinLogoIcon, VaultIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@reactive-resume/ui/components/button";
import { Skeleton } from "@reactive-resume/ui/components/skeleton";
import { cn } from "@reactive-resume/utils/style";
import { authClient } from "@/libs/auth/client";
import { orpc } from "@/libs/orpc/client";

type SocialAuthProps = {
	requestSignUp?: boolean;
};

type SocialSignInOptions = {
	provider: string;
	callbackURL: string;
	requestSignUp?: true;
};

function getSocialSignInOptions(provider: string, requestSignUp: boolean): SocialSignInOptions {
	const options: SocialSignInOptions = { provider, callbackURL: "/dashboard" };
	if (requestSignUp) options.requestSignUp = true;
	return options;
}

export function SocialAuth({ requestSignUp = false }: SocialAuthProps) {
	const { data: providers = {}, isLoading } = useQuery(orpc.auth.providers.list.queryOptions());

	return (
		<>
			<div className="flex items-center gap-x-2">
				<hr className="flex-1" />
				<span className="font-medium text-xs tracking-wide">
					<Trans context="Choose to authenticate with a social provider (Google, GitHub, etc.) instead of email and password">
						or continue with
					</Trans>
				</span>
				<hr className="flex-1" />
			</div>

			{isLoading ? <SocialAuthSkeleton /> : <SocialAuthButtons providers={providers} requestSignUp={requestSignUp} />}
		</>
	);
}

function SocialAuthSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-4">
			<Skeleton className="h-9 w-full" />
			<Skeleton className="h-9 w-full" />
			<Skeleton className="h-9 w-full" />
			<Skeleton className="h-9 w-full" />
		</div>
	);
}

type SocialAuthButtonsProps = {
	providers: RouterOutput["auth"]["providers"]["list"];
	requestSignUp: boolean;
};

function SocialAuthButtons({ providers, requestSignUp }: SocialAuthButtonsProps) {
	const router = useRouter();

	const handleSocialLogin = async (provider: string) => {
		const toastId = toast.loading(t`Signing in...`);

		const { error } = await authClient.signIn.social(getSocialSignInOptions(provider, requestSignUp));

		if (error) {
			toast.error(
				error.message ||
					t({
						comment: "Fallback toast when social sign-in fails without a provider error message",
						message: "Failed to sign in. Please try again.",
					}),
				{ id: toastId },
			);
			return;
		}

		toast.dismiss(toastId);
		await router.invalidate();
	};

	const handleOAuthLogin = async () => {
		const toastId = toast.loading(t`Signing in...`);

		const { error } = await authClient.signIn.oauth2({
			providerId: "custom",
			callbackURL: "/dashboard",
		});

		if (error) {
			toast.error(
				error.message ||
					t({
						comment: "Fallback toast when custom OAuth sign-in fails without a provider error message",
						message: "Failed to sign in. Please try again.",
					}),
				{ id: toastId },
			);
			return;
		}

		toast.dismiss(toastId);
		await router.invalidate();
	};

	const handlePasskeyLogin = async () => {
		const toastId = toast.loading(t`Signing in...`);

		const { error } = await authClient.signIn.passkey({ autoFill: false });

		if (error) {
			toast.error(
				error.message ||
					t({
						comment: "Fallback toast when passkey sign-in fails without an error message",
						message: "Failed to sign in. Please try again.",
					}),
				{ id: toastId },
			);
			return;
		}

		toast.dismiss(toastId);
		await router.invalidate();
	};

	return (
		<div className="grid grid-cols-2 gap-4">
			<Button
				variant="secondary"
				onClick={handleOAuthLogin}
				className={cn("hidden", "custom" in providers && "inline-flex")}
			>
				<VaultIcon />
				{providers.custom}
			</Button>

			<Button
				variant="secondary"
				onClick={handlePasskeyLogin}
				className={cn("hidden", "passkey" in providers && "inline-flex")}
			>
				<FingerprintIcon />
				<Trans comment="Label for passkey sign-in button">Passkey</Trans>
			</Button>

			<Button
				onClick={() => handleSocialLogin("google")}
				className={cn(
					"hidden flex-1 bg-[#4285F4] text-white hover:bg-[#4285F4]/80",
					"google" in providers && "inline-flex",
				)}
			>
				<GoogleLogoIcon />
				<Trans comment="Brand name label for Google social sign-in button">Google</Trans>
			</Button>

			<Button
				onClick={() => handleSocialLogin("github")}
				className={cn(
					"hidden flex-1 bg-[#2b3137] text-white hover:bg-[#2b3137]/80",
					"github" in providers && "inline-flex",
				)}
			>
				<GithubLogoIcon />
				<Trans comment="Brand name label for GitHub social sign-in button">GitHub</Trans>
			</Button>

			<Button
				onClick={() => handleSocialLogin("linkedin")}
				className={cn(
					"hidden flex-1 bg-[#0A66C2] text-white hover:bg-[#0A66C2]/80",
					"linkedin" in providers && "inline-flex",
				)}
			>
				<LinkedinLogoIcon />
				<Trans comment="Brand name label for LinkedIn social sign-in button">LinkedIn</Trans>
			</Button>
		</div>
	);
}
