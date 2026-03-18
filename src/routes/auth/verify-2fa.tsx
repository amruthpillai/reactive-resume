import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowLeftIcon, CheckIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { authClient } from "@/integrations/auth/client";

export const Route = createFileRoute("/auth/verify-2fa")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		if (context.session) throw redirect({ to: "/dashboard", replace: true });
	},
});

const formSchema = z.object({
	code: z.string().length(6, "Code must be 6 digits"),
});

type FormValues = z.infer<typeof formSchema>;

function RouteComponent() {
	const router = useRouter();
	const navigate = useNavigate();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			code: "",
		},
	});

	const onSubmit = async (data: FormValues) => {
		const toastId = toast.loading(t`Verifying code...`);

		const { error } = await authClient.twoFactor.verifyTotp({
			code: data.code,
		});

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.dismiss(toastId);
		await router.invalidate();
		void navigate({ to: "/dashboard", replace: true });
	};

	return (
		<>
			<div className="space-y-1 text-center">
				<h1 className="text-2xl font-bold tracking-tight">
					<Trans>Two-Factor Authentication</Trans>
				</h1>
				<div className="text-muted-foreground">
					<Trans>Enter the verification code from your authenticator app</Trans>
				</div>
			</div>

			<Form {...form}>
				<form className="grid gap-6" onSubmit={form.handleSubmit(onSubmit)}>
					<FormField
						control={form.control}
						name="code"
						render={({ field }) => (
							<FormItem className="justify-self-center">
								<FormControl
									render={
										<InputOTP
											maxLength={6}
											value={field.value}
											pattern={REGEXP_ONLY_DIGITS}
											onChange={field.onChange}
											onComplete={form.handleSubmit(onSubmit)}
											pasteTransformer={(pasted) => pasted.replaceAll("-", "")}
										>
											<InputOTPGroup>
												<InputOTPSlot index={0} className="size-12" />
												<InputOTPSlot index={1} className="size-12" />
												<InputOTPSlot index={2} className="size-12" />
											</InputOTPGroup>
											<InputOTPSeparator />
											<InputOTPGroup>
												<InputOTPSlot index={3} className="size-12" />
												<InputOTPSlot index={4} className="size-12" />
												<InputOTPSlot index={5} className="size-12" />
											</InputOTPGroup>
										</InputOTP>
									}
								/>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="flex gap-x-2">
						<Button
							variant="outline"
							className="flex-1"
							nativeButton={false}
							render={
								<Link to="/auth/login">
									<ArrowLeftIcon />
									<Trans>Back to Login</Trans>
								</Link>
							}
						/>

						<Button type="submit" className="flex-1">
							<CheckIcon />
							<Trans>Verify</Trans>
						</Button>
					</div>
				</form>

				<Button
					variant="link"
					nativeButton={false}
					className="h-auto justify-self-center p-0 text-sm"
					render={
						<Link to="/auth/verify-2fa-backup">
							<Trans>Lost access to your authenticator?</Trans>
						</Link>
					}
				/>
			</Form>
		</>
	);
}
