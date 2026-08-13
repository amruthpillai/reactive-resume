import { VerifyEmailChange } from "./auth";

export default Object.assign(VerifyEmailChange, {
	PreviewProps: {
		url: "https://localhost:3000/auth/verify-email-change?token=example-token",
		previousEmail: "old@example.com",
		newEmail: "new@example.com",
	} satisfies Parameters<typeof VerifyEmailChange>[0],
});
