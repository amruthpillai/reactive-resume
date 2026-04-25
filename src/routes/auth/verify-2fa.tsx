import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowLeftIcon, CheckIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
      toast.error(
        error.message ||
          t({
            comment: "Fallback toast when verifying a two-factor authentication code fails",
            message: "Failed to verify your code. Please try again.",
          }),
        { id: toastId },
      );
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
                    <Input
                      type="number"
                      maxLength={6}
                      value={field.value}
                      onChange={field.onChange}
                      className="max-w-xs"
                    />
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
                  <Trans comment="Secondary navigation button on 2FA verification screen">Back to Login</Trans>
                </Link>
              }
            />

            <Button type="submit" className="flex-1">
              <CheckIcon />
              <Trans comment="Primary action button to submit 2FA code">Verify</Trans>
            </Button>
          </div>
        </form>

        <Button
          variant="link"
          nativeButton={false}
          className="h-auto justify-self-center p-0 text-sm"
          render={
            <Link to="/auth/verify-2fa-backup">
              <Trans comment="Link to backup-code verification flow when authenticator app is unavailable">
                Lost access to your authenticator?
              </Trans>
            </Link>
          }
        />
      </Form>
    </>
  );
}
