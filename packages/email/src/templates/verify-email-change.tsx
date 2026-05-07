import { VerifyEmailChange } from "./auth";

interface VerifyEmailChangeTemplateProps {
	url: string;
	previousEmail: string;
	newEmail: string;
}

const VerifyEmailChangeTemplate = ({ url, previousEmail, newEmail }: VerifyEmailChangeTemplateProps) => {
	return <VerifyEmailChange url={url} previousEmail={previousEmail} newEmail={newEmail} />;
};

export default Object.assign(VerifyEmailChangeTemplate, {
	PreviewProps: {
		url: "https://localhost:3000/auth/verify-email-change?token=example-token",
		previousEmail: "old@example.com",
		newEmail: "new@example.com",
	} satisfies VerifyEmailChangeTemplateProps,
});
