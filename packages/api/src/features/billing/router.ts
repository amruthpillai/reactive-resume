import { ORPCError } from "@orpc/client";
import z from "zod";
import { env } from "@reactive-resume/env/server";
import { protectedProcedure } from "../../context";

const billingConfigSchema = z.object({
	isConfigured: z.boolean(),
	checkoutAvailable: z.boolean(),
	publishableKey: z.string().nullable(),
	prices: z.object({
		pro: z.string().nullable(),
	}),
});

export const billingRouter = {
	config: protectedProcedure
		.route({
			method: "GET",
			path: "/billing/config",
			tags: ["Billing"],
			operationId: "getBillingConfig",
			summary: "Get billing configuration",
			description:
				"Returns public billing configuration for the authenticated user. Stripe is optional and reports unavailable until keys and price IDs are configured.",
			successDescription: "Billing configuration returned successfully.",
		})
		.output(billingConfigSchema)
		.handler(() => {
			const checkoutAvailable = Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRO_PRICE_ID);

			return {
				isConfigured: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PUBLISHABLE_KEY),
				checkoutAvailable,
				publishableKey: env.STRIPE_PUBLISHABLE_KEY ?? null,
				prices: {
					pro: env.STRIPE_PRO_PRICE_ID ?? null,
				},
			};
		}),

	createCheckoutSession: protectedProcedure
		.route({
			method: "POST",
			path: "/billing/checkout",
			tags: ["Billing"],
			operationId: "createBillingCheckoutSession",
			summary: "Create a Stripe checkout session",
			description:
				"Placeholder endpoint for Stripe checkout. It is intentionally disabled until Stripe keys and checkout session creation are configured.",
		})
		.input(z.object({ priceId: z.string().optional() }).optional().default({}))
		.output(z.object({ url: z.url({ protocol: /https?/ }) }))
		.errors({
			PRECONDITION_FAILED: { message: "Stripe billing is not configured.", status: 412 },
		})
		.handler(() => {
			throw new ORPCError("PRECONDITION_FAILED", {
				message: "Stripe billing is not configured yet. Add Stripe keys and wire checkout session creation.",
			});
		}),
};
