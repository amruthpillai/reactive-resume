import type { SendMailOptions, Transporter } from "nodemailer";
import type { ReactElement } from "react";
import nodemailer from "nodemailer";
import { render } from "react-email";
import { env } from "@reactive-resume/env/server";

type SendEmailOptions = {
	to: string | string[];
	subject: string;
	text?: string;
	html?: string;
	react?: ReactElement;
	from?: string;
};

let cachedTransport: Transporter | undefined;

const getTransport = () => {
	const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass, SMTP_FROM: from } = env;
	if (!host || !user || !pass || !from) return;

	cachedTransport ??= nodemailer.createTransport({
		host,
		port: env.SMTP_PORT,
		secure: env.SMTP_SECURE,
		auth: { user, pass },
	});

	return cachedTransport;
};

export const sendEmail = async (options: SendEmailOptions) => {
	const transport = getTransport();
	const from = options.from ?? env.SMTP_FROM ?? "Reactive Resume <noreply@localhost>";
	const payload: SendMailOptions = {
		to: options.to,
		from,
		subject: options.subject,
		...(options.text === undefined ? {} : { text: options.text }),
		...(options.html === undefined ? {} : { html: options.html }),
	};

	if (options.react) {
		payload.html = await render(options.react);
		payload.text = options.text ?? (await render(options.react, { plainText: true }));
	}

	if (!payload.text && !payload.html) return;

	if (!transport) {
		console.info("SMTP not configured; skipping email send.", {
			to: payload.to,
			subject: payload.subject,
			text: payload.text,
			html: payload.html,
		});
		return;
	}

	try {
		await transport.sendMail(payload);
	} catch (error) {
		console.error("There was an error sending mail.", error);
	}
};
