/**
 * Plugin client Better Auth pour la gestion des abonnements.
 *
 * Expose les endpoints du plugin serveur côté client avec type-safety.
 * À utiliser avec `createAuthClient` et enregistrer dans les plugins.
 *
 * @example
 * ```ts
 * import { createAuthClient } from "better-auth/client";
 * import { subscriptionsPlugin } from "better-subscriptions/client";
 *
 * export const authClient = createAuthClient({
 *   plugins: [subscriptionsPlugin()],
 * });
 *
 * // Utilisation avec client direct
 * const plans = await authClient.subscriptions.listPlans();
 * const subscription = await authClient.subscriptions.getMySubscription();
 *
 * // Utilisation avec React hooks
 * import { usePlans, useMySubscription } from "better-subscriptions/client/react";
 *
 * function MyComponent() {
 *   const { data: plans } = usePlans(authClient);
 *   const { data: subscription } = useMySubscription(authClient);
 * }
 * ```
 */

import type { BetterAuthClientPlugin } from "better-auth/client";
import type {
  Plan,
  Subscription,
  SubscriptionWithAdvantages,
  PromoCode,
  CustomSubscriptionRequest,
} from "./types.js";

// Réexporter tous les types depuis le fichier de types
export type {
  Plan,
  PlanPrice,
  Advantage,
  AdvantageSelection,
  PlanAdvantage,
  Subscription,
  SubscriptionWithAdvantages,
  PlanAdvantageWithDetail,
  CustomSubscriptionRequest,
  PromoCode,
  PromoRedemption,
  Partner,
  UsageRecord,
  OverageAuthorization,
  AuditLog,
  // Response types
  ListPlansResponse,
  GetMySubscriptionResponse,
  SubscribeResponse,
  ChangePlanResponse,
  CancelSubscriptionResponse,
  ValidatePromoCodeResponse,
  PromoCodeValidation,
  CreatePromoCodeResponse,
  CreateAdvantageResponse,
  CreatePlanResponse,
  CreatePartnerResponse,
  CreatePartnerPlanResponse,
  RequestCustomSubscriptionResponse,
  ListPendingCustomRequestsResponse,
  ApproveCustomRequestResponse,
  RejectCustomRequestResponse,
  RecordUsageResponse,
  AuthorizeOverageResponse,
  ListAuditLogsResponse,
  // Payload types
  SubscribePayload,
  ChangePlanPayload,
  CancelSubscriptionPayload,
  ValidatePromoCodePayload,
  CreatePromoCodePayload,
  CreateAdvantagePayload,
  CreatePlanPayload,
  CreatePartnerPayload,
  CreatePartnerPlanPayload,
  RequestCustomSubscriptionPayload,
  ApproveCustomRequestPayload,
  RejectCustomRequestPayload,
  RecordUsagePayload,
  AuthorizeOveragePayload,
  // Utility types
  SubscriptionStatus,
  PromoCodeType,
  BillingMode,
  PlanKind,
  ActorType,
  CustomRequestStatus,
} from "./types.js";

/**
 * Plugin client pour Better Auth.
 * Enregistre les endpoints du serveur subscriptions.
 */
export function subscriptionsPlugin(): BetterAuthClientPlugin {
  return {
    id: "subscriptions",
  } as BetterAuthClientPlugin;
}

/**
 * Wrapper typé pour les appels au plugin subscriptions depuis le client.
 * À utiliser après avoir initialisé le client avec le plugin.
 *
 * @example
 * ```ts
 * const client = createAuthClient({ plugins: [subscriptionsPlugin()] });
 * const { listPlans, getMySubscription } = useSubscriptions(client);
 *
 * const plans = await listPlans();
 * const subscription = await getMySubscription();
 * ```
 */
export function useSubscriptions(client: any) {
  return {
    /**
     * Récupère tous les plans publics disponibles.
     */
    async listPlans(): Promise<{ plans: Plan[] }> {
      return client.$fetch(`/subscriptions/plans`, { method: "GET" });
    },

    /**
     * Récupère l'abonnement actif de l'utilisateur connecté.
     */
    async getMySubscription(): Promise<SubscriptionWithAdvantages> {
      return client.$fetch(`/subscriptions/me`, { method: "GET" });
    },

    /**
     * S'abonne à un plan.
     */
    async subscribe(params: {
      planId: string;
      provider?: string;
      promoCode?: string;
      quantity?: number;
    }): Promise<{ subscription: Subscription }> {
      return client.$fetch(`/subscriptions/subscribe`, { method: "POST", body: params });
    },

    /**
     * Change le plan de l'abonnement actif.
     */
    async changePlan(params: {
      subscriptionId: string;
      newPlanId: string;
    }): Promise<{ subscription: Subscription }> {
      return client.$fetch(`/subscriptions/change-plan`, { method: "POST", body: params });
    },

    /**
     * Annule l'abonnement.
     */
    async cancelSubscription(params: {
      subscriptionId: string;
      atPeriodEnd?: boolean;
    }): Promise<{ subscription: Subscription }> {
      return client.$fetch(`/subscriptions/cancel`, { method: "POST", body: params });
    },

    /**
     * Valide un code promo.
     */
    async validatePromoCode(params: {
      code: string;
      planId?: string;
      partnerId?: string;
    }): Promise<{ promo: PromoCode }> {
      return client.$fetch(`/subscriptions/promo-codes/validate`, { method: "POST", body: params });
    },

    /**
     * Demande un abonnement personnalisé.
     */
    async requestCustomSubscription(params: {
      requestedAdvantages: Array<{
        advantageKey: string;
        value: boolean | number | null;
      }>;
      proposedPriceCents?: number;
      proposedCurrency?: string;
      proposedInterval?: string;
      justification?: string;
    }): Promise<{ request: CustomSubscriptionRequest }> {
      return client.$fetch(`/subscriptions/custom-requests`, { method: "POST", body: params });
    },

    /**
     * Enregistre l'utilisation d'un avantage.
     */
    async recordUsage(params: {
      subscriptionId: string;
      advantageKey: string;
      quantity: number;
    }): Promise<any> {
      return client.$fetch(`/subscriptions/usage/record`, { method: "POST", body: params });
    },

    /**
     * Crée un code promo (admin uniquement).
     */
    async createPromoCode(params: {
      code: string;
      type: string;
      value: number;
      currency?: string;
      description?: string;
      maxRedemptions?: number;
      perUserLimit?: number;
      validFrom?: Date;
      validUntil?: Date;
      applicablePlanIds?: string[];
      applicablePartnerIds?: string[];
    }): Promise<{ promo: PromoCode }> {
      return client.$fetch(`/subscriptions/promo-codes`, { method: "POST", body: params });
    },
  };
}
