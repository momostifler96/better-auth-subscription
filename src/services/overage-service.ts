import type { SubscriptionStore } from "../repositories/interfaces.js";
import type { OverageAuthorization, Subscription } from "../types/domain.js";
import type { AuditContext, AuditService } from "./audit-service.js";
import type { PaymentProviderRegistry } from "../providers/registry.js";
import type { PlanService } from "./plan-service.js";
import { NotFoundError, ValidationError, BadRequestError } from "../errors.js";

export interface RecordUsageInput {
  subscriptionId: string;
  advantageKey: string;
  quantity: number;
}

export interface UsageCheckResult {
  allowed: boolean;
  used: number;
  planLimit: number | null; // null = illimité
  authorizedExtraLimit: number | null; // null = illimité si une autorisation active existe
  remaining: number | null; // null = illimité
  usedOverage: boolean;
}

export interface AuthorizeOverageInput {
  subscriptionId: string;
  advantageKey: string;
  /** null = dépassement illimité autorisé pour cette métrique. */
  authorizedExtraLimit: number | null;
  reason: string;
  expiresAt?: Date;
}

/**
 * Suit la consommation des avantages quantifiables (ex: appels API/mois,
 * sièges) et n'autorise un dépassement de la limite du plan que si une
 * autorisation explicite ("dépassement autorisé") a été enregistrée au
 * préalable par un administrateur — toute tentative, autorisée ou non, est
 * journalisée dans le log d'audit.
 */
export class OverageService {
  constructor(
    private readonly store: SubscriptionStore,
    private readonly audit: AuditService,
    private readonly plans: PlanService,
    private readonly providers: PaymentProviderRegistry,
  ) {}

  async authorizeOverage(ctx: AuditContext, input: AuthorizeOverageInput): Promise<OverageAuthorization> {
    if (!input.reason?.trim()) throw new BadRequestError("Reason is required to authorize overage");
    const subscription = await this.mustGetSubscription(input.subscriptionId);
    await this.assertQuantityAdvantage(input.advantageKey);

    return this.audit.wrap(
      ctx,
      {
        action: "overage.authorize",
        entityType: "subscription",
        entityId: subscription.id,
        metadata: { advantageKey: input.advantageKey, authorizedExtraLimit: input.authorizedExtraLimit, reason: input.reason },
      },
      async () => {
        const auth: Omit<OverageAuthorization, "id"> = {
          subscriptionId: input.subscriptionId,
          advantageKey: input.advantageKey,
          authorizedExtraLimit: input.authorizedExtraLimit,
          reason: input.reason,
          authorizedByUserId: ctx.actorId,
          expiresAt: input.expiresAt,
          isActive: true,
          createdAt: new Date(),
        };
        return this.store.overageAuthorizations.create(auth);
      },
    );
  }

  async revokeOverageAuthorization(ctx: AuditContext, authorizationId: string): Promise<void> {
    await this.audit.wrap(
      ctx,
      { action: "overage.revoke", entityType: "overage_authorization", entityId: authorizationId },
      async () => {
        await this.store.overageAuthorizations.revoke(authorizationId);
        return true;
      },
    );
  }

  async listAuthorizations(subscriptionId: string): Promise<OverageAuthorization[]> {
    return this.store.overageAuthorizations.listForSubscription(subscriptionId);
  }

  /**
   * Enregistre une consommation. Bloque (lève une erreur, journalisée) si la
   * limite du plan est dépassée sans autorisation active couvrant l'excédent.
   */
  async recordUsage(ctx: AuditContext, input: RecordUsageInput): Promise<UsageCheckResult> {
    const subscription = await this.mustGetSubscription(input.subscriptionId);
    const advantage = await this.assertQuantityAdvantage(input.advantageKey);

    return this.audit.wrap(
      ctx,
      { action: "usage.record", entityType: "subscription", entityId: subscription.id, metadata: { advantageKey: input.advantageKey, quantity: input.quantity } },
      async () => {
        const effective = await this.plans.getEffectiveAdvantages(subscription);
        const planAdvantage = effective.find((a) => a.advantageId === advantage.id);
        const planLimit: number | null = planAdvantage && typeof planAdvantage.value === "number" ? planAdvantage.value : planAdvantage?.value === null ? null : 0;

        const alreadyUsed = await this.store.usage.sumForPeriod(
          subscription.id,
          input.advantageKey,
          subscription.currentPeriodStart,
          subscription.currentPeriodEnd,
        );
        const projected = alreadyUsed + input.quantity;

        const withinPlan = planLimit === null || projected <= planLimit;
        let usedOverage = false;
        let authorizedExtraLimit: number | null = null;

        if (!withinPlan) {
          const overageAllowedOnPlan = planAdvantage?.overageAllowed ?? false;
          const activeAuth = await this.store.overageAuthorizations.findActive(subscription.id, input.advantageKey);
          if (!overageAllowedOnPlan || !activeAuth) {
            throw new ValidationError(
              `Limite atteinte pour "${input.advantageKey}" (limite: ${planLimit}, déjà utilisé: ${alreadyUsed}, demandé: ${input.quantity}) et aucun dépassement autorisé.`,
              { advantageKey: input.advantageKey, planLimit, used: alreadyUsed, requested: input.quantity },
            );
          }
          authorizedExtraLimit = activeAuth.authorizedExtraLimit;
          const maxAllowed = authorizedExtraLimit === null ? null : (planLimit ?? 0) + authorizedExtraLimit;
          if (maxAllowed !== null && projected > maxAllowed) {
            throw new ValidationError(
              `Dépassement autorisé insuffisant pour "${input.advantageKey}" (plafond autorisé: ${maxAllowed}, demandé au total: ${projected}).`,
              { advantageKey: input.advantageKey, authorizedLimit: maxAllowed, requested: projected },
            );
          }
          usedOverage = true;
        }

        await this.store.usage.record({
          subscriptionId: subscription.id,
          advantageKey: input.advantageKey,
          quantity: input.quantity,
          periodStart: subscription.currentPeriodStart,
          periodEnd: subscription.currentPeriodEnd,
          recordedAt: new Date(),
        });

        if (usedOverage && subscription.provider !== "manual" && subscription.externalSubscriptionId) {
          const provider = this.providers.get(subscription.provider);
          await provider.reportUsage?.({
            externalSubscriptionId: subscription.externalSubscriptionId,
            advantageKey: input.advantageKey,
            quantity: input.quantity,
          });
        }

        const remaining =
          planLimit === null && authorizedExtraLimit === null
            ? null
            : Math.max(0, (planLimit === null ? 0 : planLimit) + (authorizedExtraLimit ?? 0) - projected);

        return {
          allowed: true,
          used: projected,
          planLimit,
          authorizedExtraLimit,
          remaining,
          usedOverage,
        } satisfies UsageCheckResult;
      },
    );
  }

  private async assertQuantityAdvantage(advantageKey: string) {
    const advantage = await this.plans.findAdvantageByKey(advantageKey);
    if (!advantage) throw new NotFoundError("Advantage", advantageKey);
    if (advantage.valueType !== "quantity") {
      throw new ValidationError(
        `L'avantage "${advantageKey}" est de type "boolean" : la notion de dépassement ne s'applique pas.`,
        { advantageKey, expectedType: "quantity", actualType: advantage.valueType },
      );
    }
    return advantage;
  }

  private async mustGetSubscription(id: string): Promise<Subscription> {
    const sub = await this.store.subscriptions.findById(id);
    if (!sub) throw new NotFoundError("Subscription", id);
    return sub;
  }
}
