import type { ReactElement } from "react";

import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";
import { render } from "react-email";

import { env } from "@/utils/env";

type SendEmailOptions = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  react?: ReactElement;
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
      user: env.SMTP_USER!,
      pass: env.SMTP_PASS!,
    },
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
    text: options.text,
    html: options.html,
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
