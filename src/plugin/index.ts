import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import type { BetterAuthPlugin } from "better-auth/types";
import * as z from "zod/v4";
import type { AuditContext } from "../services/audit-service.js";
import { createSubscriptionServices, createSubscriptionServicesWithAdapter, type SubscriptionServices, type SubscriptionsPluginOptions } from "./services.js";
import { isAppError, type ErrorCode } from "../errors.js";
const unRepresentableOption = {unrepresentable: "any" as const}

function handleServiceError(ctx: any, error: unknown): never {
  if (isAppError(error)) {
    throw ctx.error(error.code as ErrorCode, {
      message: error.message,
      ...(error.details && { details: error.details })
    });
  }
  throw error;
}

function getAdapterServices(ctx: any, providers: any): SubscriptionServices {
  return createSubscriptionServicesWithAdapter(ctx.context.adapter, providers);
}
import {
    advantageSchema,
    authorizeOverageBodySchema,
    cancelSubscriptionBodySchema,
    changePlanBodySchema,
    createAdvantageBodySchema,
    createPartnerBodySchema,
    createPlanBodySchema,
    createPromoCodeBodySchema,
    customSubscriptionRequestSchema,
    partnerSchema,
    planPriceSchema,
    planSchema,
    promoCodeSchema,
    recordUsageBodySchema,
    requestCustomSubscriptionBodySchema,
    subscribeBodySchema,
    subscriptionSchema,
    subscriptionWithAdvantagesSchema,
    updateAdvantageBodySchema,
    updatePlanBodySchema,
    validatePromoCodeBodySchema,
    overageAuthorizationSchema,
    usageRecordSchema,
    auditLogSchema,
    updateAdvantageSucessResponseSchema,
} from "./schemas.js";

export type { SubscriptionServices, SubscriptionsPluginOptions } from "./services.js";
export { createSubscriptionServices, createSubscriptionServicesWithAdapter } from "./services.js";
type SessionUser = Record<string, unknown> & { id: string };

function toAuditContext(user: SessionUser, isAdmin: (u: SessionUser) => boolean, headers: {
    getHeader: (key: string) => string | null;
}): AuditContext {
    return {
        actorId: user.id,
        actorType: isAdmin(user) ? "admin" : "user",
        ip: headers.getHeader("x-forwarded-for") ?? headers.getHeader("cf-connecting-ip") ?? '0.0.0.0',
        userAgent: headers.getHeader("user-agent") ?? undefined,
    };
}

/**
 * Plugin Better Auth exposant la gestion complète des abonnements :
 * plans (standards, personnalisés, partenaires), provider de paiement au
 * choix, codes promo, souscriptions personnalisées à la demande, avantages
 * personnalisés par plan/souscription, dépassements autorisés et journal
 * d'audit.
 *
 * Les opérations sensibles (création de plan/promo/partenaire, revue des
 * demandes de souscription personnalisée, autorisation de dépassement,
 * consultation du journal d'audit) exigent `isAdmin(user) === true`.
 *
 * @example
 * ```ts
 * import { betterAuth } from "better-auth";
 * import { subscriptionsPlugin } from "better-subscriptions/plugin";
 * import { PaymentProviderRegistry } from "better-subscriptions/providers/registry";
 * import { ManualPaymentProvider } from "better-subscriptions/providers/manual";
 *
 * const providers = new PaymentProviderRegistry().register(new ManualPaymentProvider(), { asDefault: true });
 * const { plugin, services } = subscriptionsPlugin({
 *   providers,
 *   isAdmin: (user) => user.role === "admin",
 * });
 *
 * export const auth = betterAuth({ plugins: [plugin] });
 * export const subscriptionServices = services; // pour vos scripts d'admin / jobs
 * ```
 */
export function subscriptionsPlugin(options: SubscriptionsPluginOptions): { plugin: BetterAuthPlugin; services: SubscriptionServices } {
    const services = createSubscriptionServices(options);
    const isAdmin = options.isAdmin ?? ((user: SessionUser) => user.role === "admin");

    // ---- Catalogue --------------------------------------------------------

    const listPlans = createAuthEndpoint(
        "/subscriptions/plans",
        {
            method: "GET",
            response: z.object({ plans: z.array(planSchema) }),
            metadata: {
                openapi: {
                    description: "Retrieve all public subscription plans with their pricing and advantages",
                    responses: {
                        "200": {
                            description: "List of public subscription plans",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ plans: z.array(planSchema) }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const svc = getAdapterServices(ctx, options.providers);
            const plans = await svc.plans.listPlans({ isPublic: true });
            return ctx.json({ plans });
        },
    );

    const createAdvantage = createAuthEndpoint(
        "/subscriptions/advantages",
        {
            method: "POST",
            body: createAdvantageBodySchema,
            // response: z.object({ advantage: advantageSchema }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Create a new advantage (admin only)",
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(createAdvantageBodySchema,unRepresentableOption),
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Advantage created successfully",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ advantage: advantageSchema }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            if (!isAdmin(user)) throw ctx.error("FORBIDDEN", { message: "Droits administrateur requis" });
            try {
                const svc = getAdapterServices(ctx, options.providers);
                const advantage = await svc.plans.createAdvantage(toAuditContext(user, isAdmin, ctx), ctx.body);
                return ctx.json({ advantage });
            } catch (error) {
               throw ctx.context.logger.error('create advantage error',error);
                handleServiceError(ctx, error);
            }
        },
    );
    const updateAdvantage = createAuthEndpoint(
        "/subscriptions/advantages/:key",
        {
            method: "PATCH",
            body: updateAdvantageBodySchema,
            response: updateAdvantageSucessResponseSchema,
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Update an existing advantage by key (admin only)",
                    requestParams: {
                        path: z.object({ key: z.string().describe("Advantage key") }),
                    },
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(updateAdvantageBodySchema,unRepresentableOption),
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Advantage updated successfully",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(updateAdvantageSucessResponseSchema,{
                                        unrepresentable: 'any'}),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            const key = ctx.params.key;
            if (!key) throw ctx.error("BAD_REQUEST", { message: "Clé d'avantage requise" });
            if (!isAdmin(user)) throw ctx.error("FORBIDDEN", { message: "Droits administrateur requis" });
            try {
                const svc = getAdapterServices(ctx, options.providers);
                const advantage = await svc.plans.updateAdvantage(toAuditContext(user, isAdmin, ctx), key, ctx.body);
                return ctx.json({ advantage });
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );
    const listAdvantages = createAuthEndpoint(
        "/subscriptions/advantages",
        {
            method: "GET",
            response: z.object({ advantages: z.array(advantageSchema) }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Retrieve all available advantages (admin only)",
                    responses: {
                        "200": {
                            description: "List of advantages",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ advantages: z.array(advantageSchema) }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            if (!isAdmin(user)) throw ctx.error("FORBIDDEN", { message: "Droits administrateur requis" });
            const svc = getAdapterServices(ctx, options.providers);
            const advantages = await svc.plans.listAdvantages();
            return ctx.json({ advantages });
        },
    );


    const createPlan = createAuthEndpoint(
        "/subscriptions/plans",
        {
            method: "POST",
            body: createPlanBodySchema,
            response: z.object({ plan: planSchema }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Create a new subscription plan (admin only)",
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(createPlanBodySchema,unRepresentableOption),
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Plan created successfully",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ plan: planSchema }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            if (!isAdmin(user)) throw ctx.error("FORBIDDEN", { message: "Droits administrateur requis" });
            try {
                const svc = getAdapterServices(ctx, options.providers);
                const plan = await svc.plans.createPlan(toAuditContext(user, isAdmin, ctx), ctx.body);
                return ctx.json({ plan });
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );
    const updatePlan = createAuthEndpoint(
        "/subscriptions/plans/:slug",
        {
            method: "PATCH",
            body: updatePlanBodySchema,
            response: z.object({ plan: planSchema }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Update an existing subscription plan (admin only)",
                    requestParams: {
                        path: z.object({ slug: z.string().describe("Plan slug") }),
                    },
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(updatePlanBodySchema,unRepresentableOption),
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Plan updated successfully",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ plan: planSchema }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            const slug = ctx.params.slug;
            if (!slug) throw ctx.error("BAD_REQUEST", { message: "Slug de plan requis" });
            if (!isAdmin(user)) throw ctx.error("FORBIDDEN", { message: "Droits administrateur requis" });
            try {
                const svc = getAdapterServices(ctx, options.providers);
                const plan = await svc.plans.updatePlanBySlug(toAuditContext(user, isAdmin, ctx), slug, ctx.body);
                return ctx.json({ plan });
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );

    // ---- Souscription -------------------------------------------------------

    const getMySubscription = createAuthEndpoint(
        "/subscriptions/me",
        {
            method: "GET",
            response: subscriptionWithAdvantagesSchema,
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Retrieve the active subscription of the authenticated user",
                    responses: {
                        "200": {
                            description: "User subscription with advantages",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(subscriptionWithAdvantagesSchema, unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            const svc = getAdapterServices(ctx, options.providers);
            const subscription = await svc.subscriptions.getActiveForUser(user.id);
            if (!subscription) return ctx.json({ subscription: null, advantages: [] });
            const advantages = await svc.plans.getEffectiveAdvantages(subscription);
            return ctx.json({ subscription, advantages });
        },
    );

    const subscribe = createAuthEndpoint(
        "/subscriptions/subscribe",
        {
            method: "POST",
            body: subscribeBodySchema,
            response: z.object({ subscription: subscriptionSchema }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Subscribe to a plan with optional promo code",
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(subscribeBodySchema,unRepresentableOption),
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Subscription created successfully",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ subscription: subscriptionSchema }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            const provider = ctx.body.provider || "manual";

            if (provider === "manual" && !ctx.body.manualProofUrl) {
                throw ctx.error("BAD_REQUEST", { message: "Proof of payment (manualProofUrl) is required for manual provider" });
            }

            try {
                const svc = getAdapterServices(ctx, options.providers);
                const subscription = await svc.subscriptions.subscribe(toAuditContext(user, isAdmin, ctx), {
                    userId: user.id,
                    email: (user.email as string | undefined) ?? undefined,
                    planId: ctx.body.planId,
                    provider,
                    promoCode: ctx.body.promoCode,
                    quantity: ctx.body.quantity,
                    manualProofUrl: ctx.body.manualProofUrl,
                    manualMetadata: ctx.body.manualMetadata,
                });
                return ctx.json({ subscription });
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );

    const changePlan = createAuthEndpoint(
        "/subscriptions/change-plan",
        {
            method: "POST",
            body: changePlanBodySchema,
            response: z.object({ subscription: subscriptionSchema }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Switch to a different subscription plan",
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(changePlanBodySchema,unRepresentableOption),
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Plan changed successfully",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ subscription: subscriptionSchema }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            const svc = getAdapterServices(ctx, options.providers);
            const existing = await svc.subscriptions.getSubscription(ctx.body.subscriptionId);
            if (!existing) throw ctx.error("NOT_FOUND", { message: "Souscription introuvable" });
            if (existing.userId !== user.id && !isAdmin(user)) throw ctx.error("FORBIDDEN");
            try {
                const subscription = await svc.subscriptions.changePlan(toAuditContext(user, isAdmin, ctx), ctx.body.subscriptionId, ctx.body.newPlanId);
                return ctx.json({ subscription });
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );

    const cancelSubscription = createAuthEndpoint(
        "/subscriptions/cancel",
        {
            method: "POST",
            body: cancelSubscriptionBodySchema,
            response: z.object({ subscription: subscriptionSchema }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Cancel an active subscription",
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(cancelSubscriptionBodySchema,unRepresentableOption),
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Subscription cancelled successfully",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ subscription: subscriptionSchema }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            const svc = getAdapterServices(ctx, options.providers);
            const existing = await svc.subscriptions.getSubscription(ctx.body.subscriptionId);
            if (!existing) throw ctx.error("NOT_FOUND", { message: "Souscription introuvable" });
            if (existing.userId !== user.id && !isAdmin(user)) throw ctx.error("FORBIDDEN");
            try {
                const subscription = await svc.subscriptions.cancel(toAuditContext(user, isAdmin, ctx), ctx.body.subscriptionId, {
                    atPeriodEnd: ctx.body.atPeriodEnd,
                });
                return ctx.json({ subscription });
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );

    // ---- Souscriptions personnalisées à la demande ---------------------------

    const requestCustomSubscription = createAuthEndpoint(
        "/subscriptions/custom-requests",
        {
            method: "POST",
            body: requestCustomSubscriptionBodySchema,
            response: z.object({ request: customSubscriptionRequestSchema }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Request a custom subscription with specific advantages",
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(requestCustomSubscriptionBodySchema,unRepresentableOption),
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Custom subscription request created",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ request: customSubscriptionRequestSchema }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            try {
                const svc = getAdapterServices(ctx, options.providers);
                const request = await svc.subscriptions.requestCustomSubscription(toAuditContext(user, isAdmin, ctx), {
                    requestedByUserId: user.id,
                    ...ctx.body,
                });
                return ctx.json({ request });
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );

    const listPendingCustomRequests = createAuthEndpoint(
        "/subscriptions/custom-requests/pending",
        {
            method: "GET",
            response: z.object({ requests: z.array(customSubscriptionRequestSchema) }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "List all pending custom subscription requests (admin only)",
                    responses: {
                        "200": {
                            description: "List of pending custom requests",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ requests: z.array(customSubscriptionRequestSchema) }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            if (!isAdmin(user)) throw ctx.error("FORBIDDEN", { message: "Droits administrateur requis" });
            const svc = getAdapterServices(ctx, options.providers);
            const requests = await svc.subscriptions.listPendingCustomRequests();
            return ctx.json({ requests });
        },
    );

    const approveCustomRequest = createAuthEndpoint(
        "/subscriptions/custom-requests/:id/approve",
        {
            method: "POST",
            body: z
                .object({
                    reviewNotes: z.string().optional(),
                    planSlug: z.string().optional(),
                    price: planPriceSchema.optional(),
                })
                .optional(),
            response: z.object({ subscription: subscriptionSchema }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Approve a custom subscription request (admin only)",
                    requestParams: {
                        path: z.object({ id: z.string().describe("Request ID") }),
                    },
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(
                                    z
                                        .object({
                                            reviewNotes: z.string().optional(),
                                            planSlug: z.string().optional(),
                                            price: planPriceSchema.optional(),
                                        })
                                        .optional(),
                                ),
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Custom request approved and subscription created",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ subscription: subscriptionSchema }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            if (!isAdmin(user)) throw ctx.error("FORBIDDEN", { message: "Droits administrateur requis" });
            try {
                const svc = getAdapterServices(ctx, options.providers);
                const subscription = await svc.subscriptions.approveCustomRequest(toAuditContext(user, isAdmin, ctx), ctx.params.id, {
                    reviewedByUserId: user.id,
                    reviewNotes: ctx.body?.reviewNotes,
                    planSlug: ctx.body?.planSlug,
                    price: ctx.body?.price,
                });
                return ctx.json({ subscription });
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );

    const rejectCustomRequest = createAuthEndpoint(
        "/subscriptions/custom-requests/:id/reject",
        {
            method: "POST",
            body: z.object({ reviewNotes: z.string().optional() }).optional(),
            response: z.object({ request: customSubscriptionRequestSchema }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Reject a custom subscription request (admin only)",
                    requestParams: {
                        path: z.object({ id: z.string().describe("Request ID") }),
                    },
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(z.object({ reviewNotes: z.string().optional() }).optional()),
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Custom request rejected successfully",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ request: customSubscriptionRequestSchema }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            if (!isAdmin(user)) throw ctx.error("FORBIDDEN", { message: "Droits administrateur requis" });
            try {
                const svc = getAdapterServices(ctx, options.providers);
                const request = await svc.subscriptions.rejectCustomRequest(toAuditContext(user, isAdmin, ctx), ctx.params.id, {
                    reviewedByUserId: user.id,
                    reviewNotes: ctx.body?.reviewNotes,
                });
                return ctx.json({ request });
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );

    // ---- Codes promo ---------------------------------------------------------

    const createPromoCode = createAuthEndpoint(
        "/subscriptions/promo-codes",
        {
            method: "POST",
            body: createPromoCodeBodySchema,
            response: z.object({ promo: promoCodeSchema }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Create a new promo code (admin only)",
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(createPromoCodeBodySchema,unRepresentableOption),
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Promo code created successfully",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ promo: promoCodeSchema }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            if (!isAdmin(user)) throw ctx.error("FORBIDDEN", { message: "Droits administrateur requis" });
            try {
                const svc = getAdapterServices(ctx, options.providers);
                const promo = await svc.promos.createPromoCode(toAuditContext(user, isAdmin, ctx), ctx.body);
                return ctx.json({ promo });
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );

    const validatePromoCode = createAuthEndpoint(
        "/subscriptions/promo-codes/validate",
        {
            method: "POST",
            body: validatePromoCodeBodySchema,
            response: z.object({ promo: promoCodeSchema }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Validate a promo code for eligibility",
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(validatePromoCodeBodySchema,unRepresentableOption),
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Promo code validation result",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ promo: promoCodeSchema }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            try {
                const svc = getAdapterServices(ctx, options.providers);
                const result = await svc.promos.validate(ctx.body.code, {
                    userId: user.id,
                    planId: ctx.body.planId,
                    partnerId: ctx.body.partnerId,
                });
                return ctx.json({ promo: result.promo });
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );

    // ---- Partenaires ---------------------------------------------------------

    const createPartner = createAuthEndpoint(
        "/subscriptions/partners",
        {
            method: "POST",
            body: createPartnerBodySchema,
            response: z.object({ partner: partnerSchema }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Create a new partner (admin only)",
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(createPartnerBodySchema,unRepresentableOption),
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Partner created successfully",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ partner: partnerSchema }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            if (!isAdmin(user)) throw ctx.error("FORBIDDEN", { message: "Droits administrateur requis" });
            try {
                const svc = getAdapterServices(ctx, options.providers);
                const partner = await svc.partners.createPartner(toAuditContext(user, isAdmin, ctx), ctx.body);
                return ctx.json({ partner });
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );

    const createPartnerPlan = createAuthEndpoint(
        "/subscriptions/partners/:id/plans",
        {
            method: "POST",
            body: createPlanBodySchema.omit({ partnerId: true }),
            response: z.object({ plan: planSchema }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Create a subscription plan for a partner (admin only)",
                    requestParams: {
                        path: z.object({ id: z.string().describe("Partner ID") }),
                    },
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(createPlanBodySchema.omit({ partnerId: true })),
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: '200 OK',
                            content: {
                                'application/json': {
                                    schema: z.toJSONSchema(z.object({ plan: planSchema }), unRepresentableOption),
                                },
                            },
                        },
                    },

                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            if (!isAdmin(user)) throw ctx.error("FORBIDDEN", { message: "Droits administrateur requis" });
            try {
                const svc = getAdapterServices(ctx, options.providers);
                const plan = await svc.partners.createPartnerPlan(toAuditContext(user, isAdmin, ctx), ctx.params.id, ctx.body);
                return ctx.json({ plan });
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );

    // ---- Usage & dépassements autorisés ---------------------------------------

    const recordUsage = createAuthEndpoint(
        "/subscriptions/usage/record",
        {
            method: "POST",
            body: recordUsageBodySchema,
            response: z.object({ usage: usageRecordSchema }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Record usage of an advantage for a subscription",
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(recordUsageBodySchema,unRepresentableOption),
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Usage recorded successfully",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ usage: usageRecordSchema }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            const svc = getAdapterServices(ctx, options.providers);
            const subscription = await svc.subscriptions.getSubscription(ctx.body.subscriptionId);
            if (!subscription) throw ctx.error("NOT_FOUND", { message: "Souscription introuvable" });
            if (subscription.userId !== user.id && !isAdmin(user)) throw ctx.error("FORBIDDEN");
            try {
                const result = await svc.overage.recordUsage(toAuditContext(user, isAdmin, ctx), ctx.body);
                return ctx.json(result);
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );

    const authorizeOverage = createAuthEndpoint(
        "/subscriptions/overage/authorize",
        {
            method: "POST",
            body: authorizeOverageBodySchema,
            response: z.object({ authorization: overageAuthorizationSchema }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Authorize overage usage for a subscription advantage (admin only)",
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: z.toJSONSchema(authorizeOverageBodySchema,unRepresentableOption),
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Overage authorization created successfully",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ authorization: overageAuthorizationSchema }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            if (!isAdmin(user)) throw ctx.error("FORBIDDEN", { message: "Droits administrateur requis" });
            try {
                const svc = getAdapterServices(ctx, options.providers);
                const authorization = await svc.overage.authorizeOverage(toAuditContext(user, isAdmin, ctx), ctx.body);
                return ctx.json({ authorization });
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );

    // ---- Journal d'audit -------------------------------------------------------

    const listAuditLogs = createAuthEndpoint(
        "/subscriptions/audit-logs",
        {
            method: "GET",
            query: z.object({
                action: z.string().optional(),
                entityType: z.string().optional(),
            }).optional(),
            response: z.object({ logs: z.array(auditLogSchema) }),
            use: [sessionMiddleware],
            metadata: {
                openapi: {
                    description: "Retrieve audit logs for subscription operations (admin only)",
                    responses: {
                        "200": {
                            description: "List of audit logs",
                            content: {
                                "application/json": {
                                    schema: z.toJSONSchema(z.object({ logs: z.array(auditLogSchema) }), unRepresentableOption),
                                },
                            },
                        },
                    },
                },
            },
        } as any,
        async (ctx) => {
            const user = ctx.context.session!.user as SessionUser;
            if (!isAdmin(user)) throw ctx.error("FORBIDDEN", { message: "Droits administrateur requis" });
            const svc = getAdapterServices(ctx, options.providers);
            const logs = await svc.audit.query({ action: ctx.query?.action, entityType: ctx.query?.entityType });
            return ctx.json({ logs });
        },
    );

    // ---- Webhooks des providers de paiement -------------------------------------

    const providerWebhook = createAuthEndpoint(
        "/subscriptions/webhooks/:provider",
        { method: "POST", disableBody: true, requireRequest: true, requireHeaders: true },
        async (ctx) => {
            const rawBody = await ctx.request.text();
            const headers = Object.fromEntries(ctx.headers.entries());
            try {
                const svc = getAdapterServices(ctx, options.providers);
                const event = await svc.subscriptions.handleProviderWebhook(ctx.params.provider, rawBody, headers);
                return ctx.json({ received: true, type: event.type });
            } catch (error) {
                handleServiceError(ctx, error);
            }
        },
    );

    // Construire le schéma dynamiquement selon si les organisations sont activées
    const enableOrganizations = options.enableOrganizations ?? false;

    const schema: Record<string, any> = {
        advantage: {
            fields: {
                key: { type: "string", required: true, unique: true, fieldName: "key" },
                name: { type: "string", required: true },
                description: { type: "string" },
                valueType: { type: "string", required: true, fieldName: "value_type" },
                unit: { type: "string" },
                createdAt: { type: "date", required: true, fieldName: "created_at" },
            },
        },
        partner: {
            fields: {
                name: { type: "string", required: true },
                slug: { type: "string", required: true, unique: true },
                billingMode: { type: "string", required: true, fieldName: "billing_mode" },
                discountPercent: { type: "number", required: true, fieldName: "discount_percent" },
                revenueSharePercent: { type: "number", fieldName: "revenue_share_percent" },
                contactEmail: { type: "string", fieldName: "contact_email" },
                notes: { type: "string" },
                ...(enableOrganizations && {
                    organizationId: {
                        type: "string",
                        fieldName: "organization_id",
                        references: { model: "organization", field: "id", onDelete: "cascade" },
                    },
                }),
                isActive: { type: "boolean", required: true, fieldName: "is_active" },
                createdAt: { type: "date", required: true, fieldName: "created_at" },
            },
            ...(enableOrganizations && {
                indexes: [{ fields: ["organizationId"] }],
            }),
        },
        customSubscriptionRequest: {
            fields: {
                requestedByUserId: {
                    type: "string",
                    fieldName: "requested_by_user_id",
                    references: { model: "user", field: "id", onDelete: "cascade" },
                },
                ...(enableOrganizations && {
                    requestedByOrganizationId: {
                        type: "string",
                        fieldName: "requested_by_organization_id",
                        references: { model: "organization", field: "id", onDelete: "cascade" },
                    },
                }),
                requestedAdvantages: { type: "string", required: true, fieldName: "requested_advantages" },
                proposedPriceCents: { type: "number", fieldName: "proposed_price_cents" },
                proposedCurrency: { type: "string", fieldName: "proposed_currency" },
                proposedInterval: { type: "string", fieldName: "proposed_interval" },
                justification: { type: "string" },
                status: { type: "string", required: true },
                reviewedByUserId: {
                    type: "string",
                    fieldName: "reviewed_by_user_id",
                    references: { model: "user", field: "id", onDelete: "set null" },
                },
                reviewNotes: { type: "string", fieldName: "review_notes" },
                createdAt: { type: "date", required: true, fieldName: "created_at" },
                updatedAt: { type: "date", required: true, fieldName: "updated_at" },

            },
            indexes: [
                { fields: ["requestedByUserId"] },
                ...(enableOrganizations ? [{ fields: ["requestedByOrganizationId"] }] : []),
                { fields: ["reviewedByUserId"] },
            ],
        },
        plan: {
            fields: {
                slug: { type: "string", required: true, unique: true },
                name: { type: "string", required: true },
                description: { type: "string" },
                kind: { type: "string", required: true },
                isPublic: { type: "boolean", required: true, fieldName: "is_public" },
                isActive: { type: "boolean", required: true, fieldName: "is_active" },
                prices: { type: "string", required: true },
                partnerId: {
                    type: "string",
                    fieldName: "partner_id",
                    references: { model: "partner", field: "id", onDelete: "set null" },
                },
                ...(enableOrganizations && {
                    organizationId: {
                        type: "string",
                        fieldName: "organization_id",
                        references: { model: "organization", field: "id", onDelete: "cascade" },
                    },
                }),
                originRequestId: {
                    type: "string",
                    fieldName: "origin_request_id",
                    references: { model: "customSubscriptionRequest", field: "id", onDelete: "set null" },
                },
                createdAt: { type: "date", required: true, fieldName: "created_at" },
                updatedAt: { type: "date", required: true, fieldName: "updated_at" },
            },

        },
        planAdvantage: {
            fields: {
                planId: {
                    type: "string",
                    required: true,
                    fieldName: "plan_id",
                    references: { model: "plan", field: "id", onDelete: "cascade" },
                },
                advantageId: {
                    type: "string",
                    required: true,
                    fieldName: "advantage_id",
                    references: { model: "advantage", field: "id", onDelete: "cascade" },
                },
                value: { type: "string" },
                overageAllowed: { type: "boolean", required: true, fieldName: "overage_allowed" },
                overageUnitPriceCents: { type: "number", fieldName: "overage_unit_price_cents" },
                isActive: { type: "boolean", required: true, fieldName: "is_active" },
                createdAt: { type: "date", required: true, fieldName: "created_at" },
                updatedAt: { type: "date", required: true, fieldName: "updated_at" },
            },
            indexes: [
                { fields: ["planId", "advantageId"], unique: true },
                { fields: ["planId"] },
                { fields: ["advantageId"] },
            ],
        },
        subscription: {
            fields: {
                userId: {
                    type: "string",
                    fieldName: "user_id",
                    references: { model: "user", field: "id", onDelete: "cascade" },
                },
                ...(enableOrganizations && {
                    organizationId: {
                        type: "string",
                        fieldName: "organization_id",
                        references: { model: "organization", field: "id", onDelete: "cascade" },
                    },
                }),
                planId: {
                    type: "string",
                    required: true,
                    fieldName: "plan_id",
                    references: { model: "plan", field: "id", onDelete: "restrict" },
                },
                status: { type: "string", required: true },
                provider: { type: "string", required: true },
                externalSubscriptionId: { type: "string", fieldName: "external_subscription_id" },
                externalCustomerId: { type: "string", fieldName: "external_customer_id" },
                currentPeriodStart: { type: "date", required: true, fieldName: "current_period_start" },
                currentPeriodEnd: { type: "date", required: true, fieldName: "current_period_end" },
                cancelAtPeriodEnd: { type: "boolean", required: true, fieldName: "cancel_at_period_end" },
                advantageOverrides: { type: "string", required: true, fieldName: "advantage_overrides" },
                appliedPromoCodeId: {
                    type: "string",
                    fieldName: "applied_promo_code_id",
                    references: { model: "promoCode", field: "id", onDelete: "set null" },
                },
                partnerId: {
                    type: "string",
                    fieldName: "partner_id",
                    references: { model: "partner", field: "id", onDelete: "set null" },
                },
                metadata: { type: "string" },
                createdAt: { type: "date", required: true, fieldName: "created_at" },
                updatedAt: { type: "date", required: true, fieldName: "updated_at" },
            },
            indexes: [
                { fields: ["userId"] },
                ...(enableOrganizations ? [{ fields: ["organizationId"] }] : []),
                { fields: ["status"] },
            ],
        },
        subscriptionAdvantage: {
            fields: {
                subscriptionId: {
                    type: "string",
                    required: true,
                    fieldName: "subscription_id",
                    references: { model: "subscription", field: "id", onDelete: "cascade" },
                },
                advantageId: {
                    type: "string",
                    required: true,
                    fieldName: "advantage_id",
                    references: { model: "advantage", field: "id", onDelete: "cascade" },
                },
                value: { type: "string" },
                overageAllowed: { type: "boolean", required: true, fieldName: "overage_allowed" },
                overageUnitPriceCents: { type: "number", fieldName: "overage_unit_price_cents" },
                isActive: { type: "boolean", required: true, fieldName: "is_active" },
                createdAt: { type: "date", required: true, fieldName: "created_at" },
                updatedAt: { type: "date", required: true, fieldName: "updated_at" },
            },
            indexes: [
                { fields: ["subscriptionId", "advantageId"], unique: true },
                { fields: ["subscriptionId"] },
                { fields: ["advantageId"] },
            ],
        },

        promoCode: {
            fields: {
                code: { type: "string", required: true, unique: true },
                type: { type: "string", required: true },
                value: { type: "number", required: true },
                currency: { type: "string" },
                description: { type: "string" },
                maxRedemptions: { type: "number", fieldName: "max_redemptions" },
                redemptionCount: { type: "number", required: true, fieldName: "redemption_count" },
                perUserLimit: { type: "number", fieldName: "per_user_limit" },
                validFrom: { type: "date", required: true, fieldName: "valid_from" },
                validUntil: { type: "date", fieldName: "valid_until" },
                applicablePlanIds: { type: "string", required: true, fieldName: "applicable_plan_ids" },
                applicablePartnerIds: { type: "string", required: true, fieldName: "applicable_partner_ids" },
                isActive: { type: "boolean", required: true, fieldName: "is_active" },
                createdAt: { type: "date", required: true, fieldName: "created_at" },
                createdByUserId: {
                    type: "string",
                    required: true,
                    fieldName: "created_by_user_id",
                    references: { model: "user", field: "id", onDelete: "restrict" },
                },
            },
            indexes: [{ fields: ["createdByUserId"] }],
        },
        promoRedemption: {
            fields: {
                promoCodeId: {
                    type: "string",
                    required: true,
                    fieldName: "promo_code_id",
                    references: { model: "promoCode", field: "id", onDelete: "cascade" },
                },
                userId: {
                    type: "string",
                    required: true,
                    fieldName: "user_id",
                    references: { model: "user", field: "id", onDelete: "cascade" },
                },
                subscriptionId: {
                    type: "string",
                    required: true,
                    fieldName: "subscription_id",
                    references: { model: "subscription", field: "id", onDelete: "cascade" },
                },
                redeemedAt: { type: "date", required: true, fieldName: "redeemed_at" },
            },
        },
        usageRecord: {
            fields: {
                subscriptionId: {
                    type: "string",
                    required: true,
                    fieldName: "subscription_id",
                    references: { model: "subscription", field: "id", onDelete: "cascade" },
                },
                advantageKey: { type: "string", required: true, fieldName: "advantage_key" },
                quantity: { type: "number", required: true },
                periodStart: { type: "date", required: true, fieldName: "period_start" },
                periodEnd: { type: "date", required: true, fieldName: "period_end" },
                recordedAt: { type: "date", required: true, fieldName: "recorded_at" },
            },
            indexes: [{ fields: ["subscriptionId", "advantageKey"] }],
        },
        overageAuthorization: {
            fields: {
                subscriptionId: {
                    type: "string",
                    required: true,
                    fieldName: "subscription_id",
                    references: { model: "subscription", field: "id", onDelete: "cascade" },
                },
                advantageKey: { type: "string", required: true, fieldName: "advantage_key" },
                authorizedExtraLimit: { type: "number", fieldName: "authorized_extra_limit" },
                reason: { type: "string", required: true },
                authorizedByUserId: {
                    type: "string",
                    required: true,
                    fieldName: "authorized_by_user_id",
                    references: { model: "user", field: "id", onDelete: "restrict" },
                },
                expiresAt: { type: "date", fieldName: "expires_at" },
                isActive: { type: "boolean", required: true, fieldName: "is_active" },
                createdAt: { type: "date", required: true, fieldName: "created_at" },
            },
            indexes: [
                { fields: ["subscriptionId", "advantageKey"] },
                { fields: ["authorizedByUserId"] },
            ],
        },
        subscriptionAudit: {
            fields: {
                actorId: {
                    type: "string",
                    required: true,
                    fieldName: "actor_id",
                    references: { model: "user", field: "id", onDelete: "restrict" },
                },
                actorType: { type: "string", required: true, fieldName: "actor_type" },
                action: { type: "string", required: true },
                entityType: { type: "string", required: true, fieldName: "entity_type" },
                entityId: { type: "string", required: true, fieldName: "entity_id" },
                before: { type: "string", nullable: true },
                after: { type: "string", nullable: true },
                metadata: { type: "string", nullable: true },
                ip: { type: "string",default:"0.0.0.0" },
                userAgent: { type: "string", fieldName: "user_agent" },
                createdAt: { type: "date", required: true, fieldName: "created_at" },
            },
            indexes: [
                { fields: ["entityType", "entityId"] },
                { fields: ["actorId"] },
                { fields: ["createdAt"] },
            ],
        },
    };

    const plugin: BetterAuthPlugin = {
        id: "subscriptions",
        schema,
        endpoints: {
            listPlans,
            createAdvantage,
            updatePlan,
            updateAdvantage,
            listAdvantages,
            createPlan,
            getMySubscription,
            subscribe,
            changePlan,
            cancelSubscription,
            requestCustomSubscription,
            listPendingCustomRequests,
            approveCustomRequest,
            rejectCustomRequest,
            createPromoCode,
            validatePromoCode,
            createPartner,
            createPartnerPlan,
            recordUsage,
            authorizeOverage,
            listAuditLogs,
            providerWebhook,
        },
    };

    return { plugin, services };
}
