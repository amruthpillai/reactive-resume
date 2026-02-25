import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/integrations/drizzle/client";
import * as schema from "@/integrations/drizzle/schema";
import { env } from "@/utils/env";
import { type Plan, getCurrentMonth } from "@/utils/plan";

function getStripe(): Stripe {
	if (!env.STRIPE_SECRET_KEY) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Stripe is not configured" });
	}
	return new Stripe(env.STRIPE_SECRET_KEY);
}

export const billingService = {
	getStatus: async (input: { userId: string }) => {
		const [userRecord] = await db
			.select({
				plan: schema.user.plan,
				stripeCustomerId: schema.user.stripeCustomerId,
				stripeSubscriptionId: schema.user.stripeSubscriptionId,
				trialEndsAt: schema.user.trialEndsAt,
			})
			.from(schema.user)
			.where(eq(schema.user.id, input.userId))
			.limit(1);

		if (!userRecord) throw new ORPCError("NOT_FOUND", { message: "User not found" });

		return {
			plan: userRecord.plan as Plan,
			stripeCustomerId: userRecord.stripeCustomerId,
			stripeSubscriptionId: userRecord.stripeSubscriptionId,
			trialEndsAt: userRecord.trialEndsAt?.toISOString() ?? null,
		};
	},

	createCheckoutSession: async (input: { userId: string; email: string; successUrl: string; cancelUrl: string }) => {
		const stripe = getStripe();

		if (!env.STRIPE_PRO_PRICE_ID) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Stripe Pro price ID is not configured" });
		}

		// Get or create Stripe customer
		const [userRecord] = await db
			.select({ stripeCustomerId: schema.user.stripeCustomerId })
			.from(schema.user)
			.where(eq(schema.user.id, input.userId))
			.limit(1);

		let customerId = userRecord?.stripeCustomerId;

		if (!customerId) {
			const customer = await stripe.customers.create({ email: input.email, metadata: { userId: input.userId } });
			customerId = customer.id;

			await db.update(schema.user).set({ stripeCustomerId: customerId }).where(eq(schema.user.id, input.userId));
		}

		const session = await stripe.checkout.sessions.create({
			customer: customerId,
			mode: "subscription",
			line_items: [{ price: env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
			success_url: input.successUrl,
			cancel_url: input.cancelUrl,
		});

		return { url: session.url };
	},

	createPortalSession: async (input: { userId: string; returnUrl: string }) => {
		const stripe = getStripe();

		const [userRecord] = await db
			.select({ stripeCustomerId: schema.user.stripeCustomerId })
			.from(schema.user)
			.where(eq(schema.user.id, input.userId))
			.limit(1);

		if (!userRecord?.stripeCustomerId) {
			throw new ORPCError("BAD_REQUEST", { message: "No billing account found" });
		}

		const session = await stripe.billingPortal.sessions.create({
			customer: userRecord.stripeCustomerId,
			return_url: input.returnUrl,
		});

		return { url: session.url };
	},

	handleWebhookEvent: async (input: { payload: string; signature: string }) => {
		const stripe = getStripe();

		if (!env.STRIPE_WEBHOOK_SECRET) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Stripe webhook secret is not configured" });
		}

		const event = stripe.webhooks.constructEvent(input.payload, input.signature, env.STRIPE_WEBHOOK_SECRET);

		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object as Stripe.Checkout.Session;
				if (session.customer && session.subscription) {
					await db
						.update(schema.user)
						.set({
							plan: "pro",
							stripeSubscriptionId: session.subscription as string,
						})
						.where(eq(schema.user.stripeCustomerId, session.customer as string));
				}
				break;
			}

			case "customer.subscription.deleted": {
				const subscription = event.data.object as Stripe.Subscription;
				if (subscription.customer) {
					await db
						.update(schema.user)
						.set({
							plan: "free",
							stripeSubscriptionId: null,
						})
						.where(eq(schema.user.stripeCustomerId, subscription.customer as string));
				}
				break;
			}

			case "customer.subscription.updated": {
				const subscription = event.data.object as Stripe.Subscription;
				if (subscription.customer) {
					const plan = subscription.status === "active" ? "pro" : "free";
					await db
						.update(schema.user)
						.set({ plan })
						.where(eq(schema.user.stripeCustomerId, subscription.customer as string));
				}
				break;
			}
		}

		return { received: true };
	},

	getUsage: async (input: { userId: string; type: string }) => {
		const month = getCurrentMonth();

		const [record] = await db
			.select({ count: schema.usageLog.count })
			.from(schema.usageLog)
			.where(
				and(
					eq(schema.usageLog.userId, input.userId),
					eq(schema.usageLog.type, input.type),
					eq(schema.usageLog.month, month),
				),
			)
			.limit(1);

		return { count: record?.count ?? 0, month };
	},

	incrementUsage: async (input: { userId: string; type: string }) => {
		const month = getCurrentMonth();

		const [existing] = await db
			.select({ id: schema.usageLog.id, count: schema.usageLog.count })
			.from(schema.usageLog)
			.where(
				and(
					eq(schema.usageLog.userId, input.userId),
					eq(schema.usageLog.type, input.type),
					eq(schema.usageLog.month, month),
				),
			)
			.limit(1);

		if (existing) {
			await db
				.update(schema.usageLog)
				.set({ count: existing.count + 1 })
				.where(eq(schema.usageLog.id, existing.id));
			return { count: existing.count + 1 };
		}

		await db.insert(schema.usageLog).values({
			userId: input.userId,
			type: input.type,
			month,
			count: 1,
		});

		return { count: 1 };
	},
};
