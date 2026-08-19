import type { ProviderKey } from "../types/domain.js";

export interface ProviderCustomer {
  externalCustomerId: string;
  email?: string;
}

export interface ProviderSubscription {
  externalSubscriptionId: string;
  externalCustomerId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export interface CreateSubscriptionInput {
  userId: string;
  email?: string;
  /** Identifiant du prix côté provider (ex: price_xxx chez Stripe) */
  externalPriceId: string;
  /** Code promo natif provider à appliquer, s'il existe côté provider */
  externalPromoCode?: string;
  /** Remise en % à appliquer manuellement si le provider ne gère pas nativement le code */
  discountPercent?: number;
  quantity?: number;
  metadata?: Record<string, string>;
}

export interface UpdateSubscriptionInput {
  externalSubscriptionId: string;
  newExternalPriceId?: string;
  cancelAtPeriodEnd?: boolean;
  quantity?: number;
}

export interface ReportUsageInput {
  externalSubscriptionId: string;
  advantageKey: string;
  quantity: number;
  timestamp?: Date;
}

/**
 * Interface commune à tous les providers de paiement. Chaque service métier
 * (SubscriptionService, PromoService, OverageService) ne parle qu'à cette
 * interface : changer de provider (ou en supporter plusieurs simultanément,
 * par pays ou par plan) ne nécessite aucune modification de la logique métier.
 */
export interface PaymentProvider {
  readonly key: ProviderKey;

  createCustomer(input: { userId: string; email?: string }): Promise<ProviderCustomer>;

  createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscription>;

  updateSubscription(input: UpdateSubscriptionInput): Promise<ProviderSubscription>;

  cancelSubscription(externalSubscriptionId: string, atPeriodEnd: boolean): Promise<void>;

  /** Retourne l'ID promo natif du provider si un code équivalent existe côté provider, sinon null. */
  ensurePromoCode(input: {
    code: string;
    type: "percent" | "fixed";
    value: number;
    currency?: string;
  }): Promise<string | null>;

  /** Facultatif : reporting d'usage metered (ex: Stripe usage records) pour facturer les dépassements. */
  reportUsage?(input: ReportUsageInput): Promise<void>;

  /** Vérifie la signature et normalise un événement webhook brut du provider. */
  verifyAndParseWebhook(rawBody: string, headers: Record<string, string | undefined>): Promise<ProviderWebhookEvent>;
}

export type ProviderWebhookEvent =
  | { type: "subscription.updated"; externalSubscriptionId: string; status: string; currentPeriodEnd: Date }
  | { type: "subscription.canceled"; externalSubscriptionId: string }
  | { type: "invoice.payment_failed"; externalSubscriptionId: string }
  | { type: "unknown"; raw: unknown };
