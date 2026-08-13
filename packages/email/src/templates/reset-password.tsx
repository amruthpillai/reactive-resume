import { ResetPasswordEmail } from "./auth";

export default Object.assign(ResetPasswordEmail, {
	PreviewProps: {
		url: "https://localhost:3000/auth/reset-password?token=example-token",
	} satisfies Parameters<typeof ResetPasswordEmail>[0],
});
