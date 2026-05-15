import { defineDialogRenderer, defineDialogRendererRegistry } from "../renderer-registry";
import { ChangePasswordDialog } from "./change-password";
import { DisableTwoFactorDialog } from "./disable-two-factor";
import { EnableTwoFactorDialog } from "./enable-two-factor";

export const authDialogRendererRegistry = defineDialogRendererRegistry("auth", [
	defineDialogRenderer("auth.change-password", () => <ChangePasswordDialog />),
	defineDialogRenderer("auth.two-factor.enable", () => <EnableTwoFactorDialog />),
	defineDialogRenderer("auth.two-factor.disable", () => <DisableTwoFactorDialog />),
]);
