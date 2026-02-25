import z from "zod";
import { protectedProcedure, publicProcedure } from "../context";
import { billingService } from "../services/billing";

const getStatus = protectedProcedure
	.route({
		method: "GET",
		path: "/billing/status",
		tags: ["Billing"],
		operationId: "getBillingStatus",
		summary: "Get billing status",
		description: "Returns the current plan and subscription info for the authenticated user.",
		successDescription: "The billing status was retrieved successfully.",
	})
	.output(
		z.object({
			plan: z.enum(["free", "pro"]),
			stripeCustomerId: z.string().nullable(),
			stripeSubscriptionId: z.string().nullable(),
			trialEndsAt: z.string().nullable(),
		}),
	)
	.handler(async ({ context }) => {
		return billingService.getStatus({ userId: context.user.id });
	});

const createCheckout = protectedProcedure
	.route({
		method: "POST",
		path: "/billing/checkout",
		tags: ["Billing"],
		operationId: "createCheckoutSession",
		summary: "Create Stripe checkout session",
		description: "Creates a Stripe Checkout session for upgrading to Pro.",
		successDescription: "The checkout session was created successfully.",
	})
	.input(
		z.object({
			successUrl: z.string(),
			cancelUrl: z.string(),
		}),
	)
	.output(z.object({ url: z.string().nullable() }))
	.handler(async ({ context, input }) => {
		return billingService.createCheckoutSession({
			userId: context.user.id,
			email: context.user.email,
			successUrl: input.successUrl,
			cancelUrl: input.cancelUrl,
		});
	});

const createPortal = protectedProcedure
	.route({
		method: "POST",
		path: "/billing/portal",
		tags: ["Billing"],
		operationId: "createPortalSession",
		summary: "Create Stripe portal session",
		description: "Creates a Stripe Customer Portal session for managing subscription.",
		successDescription: "The portal session was created successfully.",
	})
	.input(z.object({ returnUrl: z.string() }))
	.output(z.object({ url: z.string() }))
	.handler(async ({ context, input }) => {
		return billingService.createPortalSession({
			userId: context.user.id,
			returnUrl: input.returnUrl,
		});
	});

const webhook = publicProcedure
	.route({
		method: "POST",
		path: "/billing/webhook",
		tags: ["Billing"],
		operationId: "handleStripeWebhook",
		summary: "Handle Stripe webhook",
		description: "Handles incoming Stripe webhook events.",
		successDescription: "The webhook event was processed successfully.",
	})
	.input(
		z.object({
			payload: z.string(),
			signature: z.string(),
		}),
	)
	.output(z.object({ received: z.boolean() }))
	.handler(async ({ input }) => {
		return billingService.handleWebhookEvent(input);
	});

const getUsage = protectedProcedure
	.route({
		method: "GET",
		path: "/billing/usage/{type}",
		tags: ["Billing"],
		operationId: "getUsage",
		summary: "Get usage for current month",
		description: "Returns usage count for a specific type (pdf_download, ai_suggestion) for the current month.",
		successDescription: "The usage was retrieved successfully.",
	})
	.input(z.object({ type: z.enum(["pdf_download", "ai_suggestion"]) }))
	.output(z.object({ count: z.number(), month: z.string() }))
	.handler(async ({ context, input }) => {
		return billingService.getUsage({ userId: context.user.id, type: input.type });
	});

export const billingRouter = {
	getStatus,
	createCheckout,
	createPortal,
	webhook,
	getUsage,
};
