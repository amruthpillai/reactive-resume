import z from "zod";
import { env } from "@reactive-resume/env/server";
import { publicProcedure } from "../../context";

export type FeatureFlags = {
	disableSignups: boolean;
	disableEmailAuth: boolean;
	showSponsors: boolean;
	smtpEnabled: boolean;
	semanticCssAuthoring: boolean;
	semanticCssDefault: boolean;
};

// Mirrors isSmtpEnabled() in packages/email/src/transport.ts (kept local to avoid an api -> email dependency).
const isSmtpEnabled = () => Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM);

export const flagsRouter = {
	get: publicProcedure
		.route({
			method: "GET",
			path: "/flags",
			tags: ["Feature Flags"],
			operationId: "getFeatureFlags",
			summary: "Get feature flags",
			description:
				"Returns the current feature flags for this Reactive Resume instance. Feature flags control instance-wide settings such as whether new user signups or email-based authentication are disabled. No authentication required.",
			successDescription: "The current feature flags for this instance.",
		})
		.output(
			z.object({
				disableSignups: z.boolean().describe("Whether new user signups are disabled on this instance."),
				disableEmailAuth: z.boolean().describe("Whether email-based authentication is disabled on this instance."),
				showSponsors: z.boolean().describe("Whether sponsor placements are shown on this instance."),
				smtpEnabled: z.boolean().describe("Whether outbound email (SMTP) is configured on this instance."),
				semanticCssAuthoring: z.boolean().describe("Whether Semantic CSS authoring is enabled on this instance."),
				semanticCssDefault: z.boolean().describe("Whether new resumes start in Semantic CSS mode."),
			}),
		)
		.handler(
			(): FeatureFlags => ({
				disableSignups: env.FLAG_DISABLE_SIGNUPS,
				disableEmailAuth: env.FLAG_DISABLE_EMAIL_AUTH,
				showSponsors: env.FLAG_SHOW_SPONSORS,
				smtpEnabled: isSmtpEnabled(),
				semanticCssAuthoring: env.FLAG_SEMANTIC_CSS_AUTHORING,
				semanticCssDefault: env.FLAG_SEMANTIC_CSS_DEFAULT,
			}),
		),
};
