import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { EyeIcon, EyeSlashIcon, LockOpenIcon } from "@phosphor-icons/react";
import { useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useToggle } from "usehooks-ts";
import z from "zod";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/integrations/auth/client";
import { type DialogProps, useDialogStore } from "../store";

const formSchema = z.object({
	password: z.string().min(6).max(64),
});

type FormValues = z.infer<typeof formSchema>;

export function DisableTwoFactorDialog(_: DialogProps<"auth.two-factor.disable">) {
	const router = useRouter();
	const [showPassword, toggleShowPassword] = useToggle(false);
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			password: "",
		},
	});

	const onSubmit = async (data: FormValues) => {
		const toastId = toast.loading(t`Disabling two-factor authentication...`);

		const { error } = await authClient.twoFactor.disable({ password: data.password });

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.success(t`Two-factor authentication has been disabled successfully.`, { id: toastId });
		router.invalidate();
		closeDialog();
		form.reset();
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<LockOpenIcon />
					<Trans>Disable Two-Factor Authentication</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>
						Enter your password to disable two-factor authentication. Your account will be less secure without 2FA
						enabled.
					</Trans>
				</DialogDescription>
			</DialogHeader>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<FormField
						control={form.control}
						name="password"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<Trans>Password</Trans>
								</FormLabel>
								<div className="flex items-center gap-x-1.5">
									<FormControl>
										<Input
											min={6}
											max={64}
											type={showPassword ? "text" : "password"}
											autoComplete="current-password"
											{...field}
										/>
									</FormControl>

									<Button size="icon" variant="ghost" type="button" onClick={toggleShowPassword}>
										{showPassword ? <EyeIcon /> : <EyeSlashIcon />}
									</Button>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>

					<DialogFooter>
						<Button type="submit" variant="destructive">
							<Trans>Disable 2FA</Trans>
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}
