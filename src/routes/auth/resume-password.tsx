import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ORPCError } from "@orpc/client";
import { EyeIcon, EyeSlashIcon, LockOpenIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, SearchParamError, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useToggle } from "usehooks-ts";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { orpc } from "@/integrations/orpc/client";

const searchSchema = z.object({
	redirect: z
		.string()
		.min(1)
		.regex(/^\/[^/]+\/[^/]+$/),
});

export const Route = createFileRoute("/auth/resume-password")({
	component: RouteComponent,
	validateSearch: zodValidator(searchSchema),
	onError: (error) => {
		if (error instanceof SearchParamError) {
			throw redirect({ to: "/" });
		}
	},
});

const formSchema = z.object({
	password: z.string().min(6).max(64),
});

type FormValues = z.infer<typeof formSchema>;

function RouteComponent() {
	const navigate = useNavigate();
	const { redirect } = Route.useSearch();
	const [showPassword, toggleShowPassword] = useToggle(false);

	const { mutate: verifyPassword } = useMutation(orpc.resume.verifyPassword.mutationOptions());

	const [username, slug] = useMemo(() => {
		const [username, slug] = redirect.split("/").slice(1) as [string, string];
		if (!username || !slug) throw navigate({ to: "/" });
		return [username, slug];
	}, [redirect, navigate]);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			password: "",
		},
	});

	const onSubmit = async (data: FormValues) => {
		const toastId = toast.loading(t`Verifying password...`);

		verifyPassword(
			{ username, slug, password: data.password },
			{
				onSuccess: () => {
					toast.dismiss(toastId);
					navigate({ to: redirect, replace: true });
				},
				onError: (error) => {
					if (error instanceof ORPCError && error.code === "INVALID_PASSWORD") {
						toast.dismiss(toastId);
						form.setError("password", { message: t`The password you entered is incorrect` });
					} else {
						toast.error(error.message, { id: toastId });
					}
				},
			},
		);
	};

	return (
		<>
			<div className="space-y-4 text-center">
				<h1 className="font-bold text-2xl tracking-tight">
					<Trans>The resume you are trying to access is password protected</Trans>
				</h1>

				<div className="text-muted-foreground leading-relaxed">
					<Trans>Please enter the password shared with you by the owner of the resume to continue.</Trans>
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
									<Trans>Password</Trans>
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
						<LockOpenIcon />
						<Trans>Unlock</Trans>
					</Button>
				</form>
			</Form>
		</>
	);
}
