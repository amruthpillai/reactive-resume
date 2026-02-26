import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { GithubLogoIcon, GoogleLogoIcon, VaultIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/integrations/auth/client";
import { orpc } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";

export function SocialAuth() {
	const router = useRouter();
	const { data: authProviders = {} } = useQuery(orpc.auth.providers.list.queryOptions());

	const handleSocialLogin = async (provider: string) => {
		const toastId = toast.loading(t`Signing in...`);

		const { error } = await authClient.signIn.social({
			provider,
			callbackURL: "/dashboard",
		});

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.dismiss(toastId);
		router.invalidate();
	};

	const handleOAuthLogin = async () => {
		const toastId = toast.loading(t`Signing in...`);

		const { error } = await authClient.signIn.oauth2({
			providerId: "custom",
			callbackURL: "/dashboard",
		});

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.dismiss(toastId);
		router.invalidate();
	};

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

			<div>
				<div className="grid grid-cols-2 gap-4">
					<Button
						variant="secondary"
						onClick={handleOAuthLogin}
						className={cn("hidden", "custom" in authProviders && "inline-flex")}
					>
						<VaultIcon />
						{authProviders.custom}
					</Button>

					<Button
						onClick={() => handleSocialLogin("google")}
						className={cn(
							"hidden flex-1 bg-[#4285F4] text-white hover:bg-[#4285F4]/80",
							"google" in authProviders && "inline-flex",
						)}
					>
						<GoogleLogoIcon />
						Google
					</Button>

					<Button
						onClick={() => handleSocialLogin("github")}
						className={cn(
							"hidden flex-1 bg-[#2b3137] text-white hover:bg-[#2b3137]/80",
							"github" in authProviders && "inline-flex",
						)}
					>
						<GithubLogoIcon />
						GitHub
					</Button>
				</div>
			</div>
		</>
	);
}
