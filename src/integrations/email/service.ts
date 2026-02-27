import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/utils/env";
import { logger } from "@/utils/logger";

type SendEmailOptions = {
	to: string | string[];
	subject: string;
	text: string;
	from?: string;
};

const isSmtpEnabled = () => {
	return !!env.SMTP_HOST && !!env.SMTP_USER && !!env.SMTP_PASS && !!env.SMTP_FROM;
};

let cachedTransport: Transporter | undefined;

const getTransport = () => {
	if (!isSmtpEnabled()) return;
	if (cachedTransport) return cachedTransport;

	cachedTransport = nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: env.SMTP_PORT,
		secure: env.SMTP_SECURE,
		auth: {
			// biome-ignore lint/style/noNonNullAssertion: enabled check ensures these are not null
			user: env.SMTP_USER!,
			// biome-ignore lint/style/noNonNullAssertion: enabled check ensures these are not null
			pass: env.SMTP_PASS!,
		},
	});

	return cachedTransport;
};

export const sendEmail = async (options: SendEmailOptions) => {
	const transport = getTransport();

	const from = options.from ?? env.SMTP_FROM ?? "Reactive Resume <noreply@localhost>";
	const payload: nodemailer.SendMailOptions = {
		to: options.to,
		from,
		subject: options.subject,
		text: options.text,
	};

	if (!transport) {
		logger.info("SMTP not configured; skipping email send", {
			to: payload.to,
			subject: payload.subject,
		});
		return;
	}

	try {
		await transport.sendMail({ ...options, from });
	} catch (error) {
		logger.error("SMTP send failed", {
			smtpHost: env.SMTP_HOST,
			smtpPort: env.SMTP_PORT,
			smtpSecure: env.SMTP_SECURE,
			to: payload.to,
			subject: payload.subject,
			error,
		});
	}
};
