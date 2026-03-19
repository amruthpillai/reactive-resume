import { Trans } from "@lingui/react/macro";
import { KeyIcon, LockOpenIcon, ToggleLeftIcon, ToggleRightIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useCallback, useMemo } from "react";
import { match } from "ts-pattern";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDialogStore } from "@/dialogs/store";
import { authClient } from "@/integrations/auth/client";

import { useAuthAccounts } from "./hooks";

export function TwoFactorSection() {
  const { openDialog } = useDialogStore();
  const { hasAccount } = useAuthAccounts();
  const { data: session } = authClient.useSession();

  const hasPassword = useMemo(() => hasAccount("credential"), [hasAccount]);
  const hasTwoFactor = useMemo(() => session?.user.twoFactorEnabled ?? false, [session]);

  const handleTwoFactorAction = useCallback(() => {
    if (hasTwoFactor) {
      openDialog("auth.two-factor.disable", undefined);
    } else {
      openDialog("auth.two-factor.enable", undefined);
    }
  }, [hasTwoFactor, openDialog]);

  if (!hasPassword) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.2, ease: "easeOut" }}
      style={{ willChange: "transform, opacity" }}
    >
      <Separator />

      <div className="mt-4 flex items-center justify-between gap-x-4">
        <h2 className="flex items-center gap-x-3 text-base font-medium">
          {hasTwoFactor ? <LockOpenIcon /> : <KeyIcon />}
          <Trans>Two-Factor Authentication</Trans>
        </h2>

        {match(hasTwoFactor)
          .with(true, () => (
            <motion.div
              whileHover={{ y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              style={{ willChange: "transform" }}
            >
              <Button variant="outline" onClick={handleTwoFactorAction}>
                <ToggleLeftIcon />
                <Trans>Disable 2FA</Trans>
              </Button>
            </motion.div>
          ))
          .with(false, () => (
            <motion.div
              whileHover={{ y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              style={{ willChange: "transform" }}
            >
              <Button variant="outline" onClick={handleTwoFactorAction}>
                <ToggleRightIcon />
                <Trans>Enable 2FA</Trans>
              </Button>
            </motion.div>
          ))
          .exhaustive()}
      </div>
    </motion.div>
  );
}
