import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowLeftIcon, CheckIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { authClient } from "@/integrations/auth/client";

export const Route = createFileRoute("/auth/verify-2fa-backup")({
	component: RouteComponent,
	beforeLoad: async ({ context }) => {
		if (context.session) throw redirect({ to: "/dashboard", replace: true });
	},
});

const formSchema = z.object({
	code: z.string().trim(),
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
		const toastId = toast.loading(t`Verifying backup code...`);
		const formattedCode = `${data.code.slice(0, 5)}-${data.code.slice(5)}`;

		const { error } = await authClient.twoFactor.verifyBackupCode({ code: formattedCode });

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.dismiss(toastId);
		router.invalidate();
		navigate({ to: "/dashboard", replace: true });
	};

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

			<Form {...form}>
				<form className="grid gap-6" onSubmit={form.handleSubmit(onSubmit)}>
					<FormField
						control={form.control}
						name="code"
						render={({ field }) => (
							<FormItem className="justify-self-center">
								<FormControl>
									<InputOTP
										maxLength={10}
										value={field.value}
										pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
										onChange={field.onChange}
										onComplete={form.handleSubmit(onSubmit)}
										pasteTransformer={(pasted) => pasted.replaceAll("-", "")}
									>
										<InputOTPGroup>
											<InputOTPSlot index={0} className="size-12" />
											<InputOTPSlot index={1} className="size-12" />
											<InputOTPSlot index={2} className="size-12" />
											<InputOTPSlot index={3} className="size-12" />
											<InputOTPSlot index={4} className="size-12" />
										</InputOTPGroup>
										<InputOTPSeparator />
										<InputOTPGroup>
											<InputOTPSlot index={5} className="size-12" />
											<InputOTPSlot index={6} className="size-12" />
											<InputOTPSlot index={7} className="size-12" />
											<InputOTPSlot index={8} className="size-12" />
											<InputOTPSlot index={9} className="size-12" />
										</InputOTPGroup>
									</InputOTP>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="flex gap-x-2">
						<Button type="button" variant="outline" className="flex-1" asChild>
							<Link to="/auth/verify-2fa">
								<ArrowLeftIcon />
								<Trans>Go Back</Trans>
							</Link>
						</Button>
						<Button type="submit" className="flex-1">
							<CheckIcon />
							<Trans>Verify</Trans>
						</Button>
					</div>
				</form>
			</Form>
		</>
	);
}
