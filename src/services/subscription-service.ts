import { newId } from "../repositories/memory/store.js";
import type { SubscriptionStore } from "../repositories/interfaces.js";
import type { PaymentProviderRegistry } from "../providers/registry.js";
import type { ProviderWebhookEvent } from "../providers/types.js";
import type {
  CustomSubscriptionRequest,
  Plan,
  PlanPrice,
  ProviderKey,
  Subscription,
} from "../types/domain.js";
import type { AuditContext, AuditService } from "./audit-service.js";
import type { PlanService } from "./plan-service.js";
import type { PromoService } from "./promo-service.js";

export interface SubscribeInput {
  userId: string;
  email?: string;
  planId: string;
  /** Provider à utiliser ; par défaut celui déclaré sur le prix du plan, sinon le provider par défaut du registre. */
  provider?: ProviderKey;
  promoCode?: string;
  quantity?: number;
}

export interface CustomSubscriptionRequestInput {
  requestedByUserId: string;
  requestedAdvantages: Array<{ advantageKey: string; value: boolean | number | null }>;
  proposedPriceCents?: number;
  proposedCurrency?: string;
  proposedInterval?: PlanPrice["interval"];
  justification?: string;
}

export interface ReviewCustomRequestInput {
  reviewedByUserId: string;
  reviewNotes?: string;
  /** Si fourni, le plan résultant utilisera ce prix/provider ; sinon souscription "manual" (facturation hors-ligne). */
  price?: PlanPrice;
  planSlug?: string; // slug personnalisé, sinon généré depuis l'id de la demande
}

/**
 * Gère le cycle de vie complet d'une souscription : création (avec choix
 * libre du provider de paiement), changement de plan, annulation, synchro
 * webhook, ET le flux de "souscription personnalisée à la demande"
 * (demande -> revue -> approbation -> provisionnement automatique du plan
 * et de la souscription correspondants).
 */
export class SubscriptionService {
  constructor(
    private readonly store: SubscriptionStore,
    private readonly audit: AuditService,
    private readonly providers: PaymentProviderRegistry,
    private readonly plans: PlanService,
    private readonly promos: PromoService,
  ) {}

  // ---- Souscription standard -------------------------------------------

  async subscribe(ctx: AuditContext, input: SubscribeInput): Promise<Subscription> {
    const plan = await this.plans.getPlan(input.planId);
    if (!plan) throw new Error(`Plan ${input.planId} introuvable`);
    if (!plan.isActive) throw new Error(`Le plan "${plan.name}" n'est plus actif`);

    return this.audit.wrap(
      ctx,
      { action: "subscription.create", entityType: "subscription", entityId: input.userId, metadata: { planId: plan.id } },
      async () => {
        const partner = plan.kind === "partner" && plan.partnerId ? await this.store.partners.findById(plan.partnerId) : null;
        const isPartnerFree = partner?.billingMode === "free";

        const providerKey: ProviderKey = isPartnerFree ? "manual" : input.provider ?? plan.prices[0]?.provider ?? this.providers.getDefault().key;
        const provider = this.providers.get(providerKey);
        const price = plan.prices.find((p) => p.provider === providerKey);
        if (!isPartnerFree && providerKey !== "manual" && !price) {
          throw new Error(`Le plan "${plan.name}" n'a pas de prix configuré pour le provider "${providerKey}"`);
        }

        let discountPercent = partner?.discountPercent ?? 0;
        let externalPromoCode: string | undefined;
        let promoValidation: Awaited<ReturnType<PromoService["validate"]>> | null = null;
        if (input.promoCode) {
          promoValidation = await this.promos.validate(input.promoCode, {
            userId: input.userId,
            planId: plan.id,
            partnerId: plan.partnerId,
          });
          if (promoValidation.promo.type === "percent") {
            discountPercent = Math.min(100, discountPercent + promoValidation.promo.value);
          }
          externalPromoCode = (await provider.ensurePromoCode({
            code: promoValidation.promo.code,
            type: promoValidation.promo.type === "fixed" ? "fixed" : "percent",
            value: promoValidation.promo.value,
            currency: promoValidation.promo.currency,
          })) ?? undefined;
        }

        const providerSub = isPartnerFree
          ? await provider.createSubscription({ userId: input.userId, email: input.email, externalPriceId: "manual", quantity: input.quantity })
          : await provider.createSubscription({
              userId: input.userId,
              email: input.email,
              externalPriceId: price?.externalPriceId ?? "manual",
              externalPromoCode,
              discountPercent: externalPromoCode ? undefined : discountPercent || undefined,
              quantity: input.quantity,
            });

        const now = new Date();
        const subscription: Subscription = {
          id: newId("sub"),
          userId: input.userId,
          planId: plan.id,
          status: providerSub.status === "active" ? "active" : "trialing",
          provider: providerKey,
          externalSubscriptionId: providerSub.externalSubscriptionId,
          externalCustomerId: providerSub.externalCustomerId,
          currentPeriodStart: providerSub.currentPeriodStart,
          currentPeriodEnd: providerSub.currentPeriodEnd,
          cancelAtPeriodEnd: false,
          advantageOverrides: [],
          partnerId: plan.partnerId,
          createdAt: now,
          updatedAt: now,
        };
        const created = await this.store.subscriptions.create(subscription);

        if (promoValidation) {
          await this.promos.redeem(ctx, { promoCodeId: promoValidation.promo.id, userId: input.userId, subscriptionId: created.id });
          await this.store.subscriptions.update(created.id, { appliedPromoCodeId: promoValidation.promo.id });
          created.appliedPromoCodeId = promoValidation.promo.id;
        }

        return created;
      },
    );
  }

  async changePlan(ctx: AuditContext, subscriptionId: string, newPlanId: string): Promise<Subscription> {
    const sub = await this.mustGetSubscription(subscriptionId);
    const newPlan = await this.plans.getPlan(newPlanId);
    if (!newPlan) throw new Error(`Plan ${newPlanId} introuvable`);
    return this.audit.wrap(
      ctx,
      { action: "subscription.change_plan", entityType: "subscription", entityId: subscriptionId, before: sub, metadata: { newPlanId } },
      async () => {
        if (sub.provider !== "manual" && sub.externalSubscriptionId) {
          const price = newPlan.prices.find((p) => p.provider === sub.provider);
          if (!price) throw new Error(`Le plan "${newPlan.name}" n'a pas de prix pour le provider "${sub.provider}"`);
          await this.providers.get(sub.provider).updateSubscription({
            externalSubscriptionId: sub.externalSubscriptionId,
            newExternalPriceId: price.externalPriceId,
          });
        }
        return this.store.subscriptions.update(subscriptionId, { planId: newPlanId });
      },
    );
  }

  async cancel(ctx: AuditContext, subscriptionId: string, opts?: { atPeriodEnd?: boolean }): Promise<Subscription> {
    const sub = await this.mustGetSubscription(subscriptionId);
    const atPeriodEnd = opts?.atPeriodEnd ?? true;
    return this.audit.wrap(
      ctx,
      { action: "subscription.cancel", entityType: "subscription", entityId: subscriptionId, before: sub, metadata: { atPeriodEnd } },
      async () => {
        if (sub.provider !== "manual" && sub.externalSubscriptionId) {
          await this.providers.get(sub.provider).cancelSubscription(sub.externalSubscriptionId, atPeriodEnd);
        }
        return this.store.subscriptions.update(subscriptionId, {
          cancelAtPeriodEnd: atPeriodEnd,
          status: atPeriodEnd ? sub.status : "canceled",
        });
      },
    );
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    return this.store.subscriptions.findById(subscriptionId);
  }

  async getActiveForUser(userId: string): Promise<Subscription | null> {
    return this.store.subscriptions.findActiveForUser(userId);
  }

  private async mustGetSubscription(id: string): Promise<Subscription> {
    const sub = await this.store.subscriptions.findById(id);
    if (!sub) throw new Error(`Souscription ${id} introuvable`);
    return sub;
  }

  // ---- Webhooks ----------------------------------------------------------

  async handleProviderWebhook(providerKey: ProviderKey, rawBody: string, headers: Record<string, string | undefined>): Promise<ProviderWebhookEvent> {
    const provider = this.providers.get(providerKey);
    const event = await provider.verifyAndParseWebhook(rawBody, headers);
    const systemCtx: AuditContext = { actorId: "system", actorType: "system" };

    switch (event.type) {
      case "subscription.updated": {
        const sub = await this.findByExternalId(event.externalSubscriptionId);
        if (sub) {
          await this.audit.wrap(
            systemCtx,
            { action: "subscription.webhook_updated", entityType: "subscription", entityId: sub.id, before: sub },
            () => this.store.subscriptions.update(sub.id, { status: this.mapProviderStatus(event.status), currentPeriodEnd: event.currentPeriodEnd }),
          );
        }
        break;
      }
      case "subscription.canceled": {
        const sub = await this.findByExternalId(event.externalSubscriptionId);
        if (sub) {
          await this.audit.wrap(
            systemCtx,
            { action: "subscription.webhook_canceled", entityType: "subscription", entityId: sub.id, before: sub },
            () => this.store.subscriptions.update(sub.id, { status: "canceled" }),
          );
        }
        break;
      }
      case "invoice.payment_failed": {
        const sub = await this.findByExternalId(event.externalSubscriptionId);
        if (sub) {
          await this.audit.wrap(
            systemCtx,
            { action: "subscription.webhook_payment_failed", entityType: "subscription", entityId: sub.id, before: sub },
            () => this.store.subscriptions.update(sub.id, { status: "past_due" }),
          );
        }
        break;
      }
      default:
        break;
    }
    return event;
  }

  private mapProviderStatus(status: string): Subscription["status"] {
    if (status === "active" || status === "trialing" || status === "past_due" || status === "canceled" || status === "paused") return status;
    return "active";
  }

  private async findByExternalId(externalSubscriptionId: string): Promise<Subscription | null> {
    return this.store.subscriptions.findByExternalId(externalSubscriptionId);
  }

  // ---- Souscriptions personnalisées à la demande --------------------------

  async requestCustomSubscription(ctx: AuditContext, input: CustomSubscriptionRequestInput): Promise<CustomSubscriptionRequest> {
    return this.audit.wrap(
      ctx,
      { action: "custom_request.create", entityType: "custom_subscription_request", entityId: input.requestedByUserId },
      async () => {
        const now = new Date();
        const request: CustomSubscriptionRequest = {
          id: newId("csr"),
          requestedByUserId: input.requestedByUserId,
          requestedAdvantages: input.requestedAdvantages,
          proposedPriceCents: input.proposedPriceCents,
          proposedCurrency: input.proposedCurrency,
          proposedInterval: input.proposedInterval,
          justification: input.justification,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        };
        return this.store.customRequests.create(request);
      },
    );
  }

  async listPendingCustomRequests(): Promise<CustomSubscriptionRequest[]> {
    return this.store.customRequests.listPending();
  }

  /**
   * Approuve une demande de souscription personnalisée : crée un plan
   * "custom" privé portant exactement les avantages demandés (ou négociés),
   * puis provisionne la souscription elle-même.
   */
  async approveCustomRequest(ctx: AuditContext, requestId: string, review: ReviewCustomRequestInput): Promise<Subscription> {
    const request = await this.store.customRequests.findById(requestId);
    if (!request) throw new Error(`Demande ${requestId} introuvable`);
    if (request.status !== "pending") throw new Error(`Demande ${requestId} déjà traitée (statut: ${request.status})`);

    return this.audit.wrap(
      ctx,
      { action: "custom_request.approve", entityType: "custom_subscription_request", entityId: requestId, before: request },
      async () => {
        const plan: Plan = await this.plans.createPlan(ctx, {
          slug: review.planSlug ?? `custom-${requestId}`,
          name: `Plan personnalisé (${request.requestedByUserId})`,
          kind: "custom",
          isPublic: false,
          prices: review.price ? [review.price] : [],
          originRequestId: requestId,
          advantages: request.requestedAdvantages.map((a) => ({ advantageKey: a.advantageKey, value: a.value })),
        });

        const subscription = await this.subscribe(ctx, {
          userId: request.requestedByUserId,
          planId: plan.id,
          provider: review.price?.provider ?? "manual",
        });

        await this.store.customRequests.update(requestId, {
          status: "approved",
          reviewedByUserId: review.reviewedByUserId,
          reviewNotes: review.reviewNotes,
          resultingPlanId: plan.id,
          resultingSubscriptionId: subscription.id,
        });

        return subscription;
      },
    );
  }

  async rejectCustomRequest(ctx: AuditContext, requestId: string, review: { reviewedByUserId: string; reviewNotes?: string }): Promise<CustomSubscriptionRequest> {
    const request = await this.store.customRequests.findById(requestId);
    if (!request) throw new Error(`Demande ${requestId} introuvable`);
    return this.audit.wrap(
      ctx,
      { action: "custom_request.reject", entityType: "custom_subscription_request", entityId: requestId, before: request },
      () =>
        this.store.customRequests.update(requestId, {
          status: "rejected",
          reviewedByUserId: review.reviewedByUserId,
          reviewNotes: review.reviewNotes,
        }),
    );
  }
}
