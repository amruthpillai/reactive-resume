import { VerifyEmail } from "./auth";

export default Object.assign(VerifyEmail, {
	PreviewProps: {
		url: "https://localhost:3000/auth/verify-email?token=example-token",
	} satisfies Parameters<typeof VerifyEmail>[0],
});
