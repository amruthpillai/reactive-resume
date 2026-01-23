import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { createFileRoute, redirect, SearchParamError, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useToggle } from "usehooks-ts";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/integrations/auth/client";

const searchSchema = z.object({ token: z.string().min(1) });

export const Route = createFileRoute("/auth/reset-password")({
	component: RouteComponent,
	validateSearch: zodValidator(searchSchema),
	beforeLoad: async ({ context }) => {
		if (context.flags.disableEmailAuth) throw redirect({ to: "/auth/login", replace: true });
	},
	onError: (error) => {
		if (error instanceof SearchParamError) {
			throw redirect({ to: "/auth/login" });
		}
	},
});

const formSchema = z.object({
	password: z.string().min(6).max(64),
});

type FormValues = z.infer<typeof formSchema>;

function RouteComponent() {
	const navigate = useNavigate();
	const { token } = Route.useSearch();
	const [showPassword, toggleShowPassword] = useToggle(false);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			password: "",
		},
	});

	const onSubmit = async (data: FormValues) => {
		const toastId = toast.loading(t`Resetting your password...`);

		const { error } = await authClient.resetPassword({ token, newPassword: data.password });

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.success(t`Your password has been reset successfully. You can now sign in with your new password.`, {
			id: toastId,
		});
		navigate({ to: "/auth/login" });
	};

	return (
		<>
			<div className="space-y-1 text-center">
				<h1 className="font-bold text-2xl tracking-tight">
					<Trans>Reset your password</Trans>
				</h1>

				<div className="text-muted-foreground">
					<Trans>Please enter a new password for your account</Trans>
				</div>
			</div>

			<Form {...form}>
				<form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
					<FormField
						control={form.control}
						name="password"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<Trans>New Password</Trans>
								</FormLabel>
								<div className="flex items-center gap-x-1.5">
									<FormControl>
										<Input
											min={6}
											max={64}
											type={showPassword ? "text" : "password"}
											autoComplete="new-password"
											{...field}
										/>
									</FormControl>

									<Button size="icon" variant="ghost" onClick={toggleShowPassword}>
										{showPassword ? <EyeIcon /> : <EyeSlashIcon />}
									</Button>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>

					<Button type="submit" className="w-full">
						<Trans>Reset Password</Trans>
					</Button>
				</form>
			</Form>
		</>
	);
}
