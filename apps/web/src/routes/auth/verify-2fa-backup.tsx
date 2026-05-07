import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowLeftIcon, CheckIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@reactive-resume/ui/components/button";
import { FormControl, FormItem, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import { authClient } from "@/libs/auth/client";
import { useAppForm } from "@/libs/tanstack-form";

export const Route = createFileRoute("/auth/verify-2fa-backup")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		if (context.session) throw redirect({ to: "/dashboard", replace: true });
	},
});

const formSchema = z.object({
	code: z.string().trim(),
});

function RouteComponent() {
	const router = useRouter();
	const navigate = useNavigate();

	const form = useAppForm({
		defaultValues: { code: "" },
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			const toastId = toast.loading(t`Verifying backup code...`);
			const formattedCode = `${value.code.slice(0, 5)}-${value.code.slice(5)}`;

			const { error } = await authClient.twoFactor.verifyBackupCode({ code: formattedCode });

			if (error) {
				toast.error(
					error.message ||
						t({
							comment: "Fallback toast when verifying a backup two-factor authentication code fails",
							message: "Failed to verify your backup code. Please try again.",
						}),
					{ id: toastId },
				);
				return;
			}

			toast.dismiss(toastId);
			await router.invalidate();
			void navigate({ to: "/dashboard", replace: true });
		},
	});

	return (
		<>
			<div className="space-y-1 text-center">
				<h1 className="font-bold text-2xl tracking-tight">
					<Trans>Verify with a Backup Code</Trans>
				</h1>
				<div className="text-muted-foreground">
					<Trans>Enter one of your saved backup codes to access your account</Trans>
				</div>
			</div>

			<form
				className="grid gap-6"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<form.Field name="code">
					{(field) => (
						<FormItem
							className="justify-self-center"
							hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
						>
							<FormControl
								render={
									<Input
										maxLength={10}
										className="max-w-xs"
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
									/>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<div className="flex gap-x-2">
					<Button
						variant="outline"
						className="flex-1"
						nativeButton={false}
						render={
							<Link to="/auth/verify-2fa">
								<ArrowLeftIcon />
								<Trans comment="Secondary navigation button on backup-code verification screen">Go Back</Trans>
							</Link>
						}
					/>

					<Button type="submit" className="flex-1">
						<CheckIcon />
						<Trans comment="Primary action button to submit backup code">Verify</Trans>
					</Button>
				</div>
			</form>
		</>
	);
}
