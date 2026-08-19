import { randomUUID } from "node:crypto";
import type {
  CreateSubscriptionInput,
  PaymentProvider,
  ProviderCustomer,
  ProviderSubscription,
  ProviderWebhookEvent,
  ReportUsageInput,
  UpdateSubscriptionInput,
} from "./types.js";

/**
 * Provider "manuel" / hors-ligne : aucun paiement réel n'est effectué.
 * Utilisé pour :
 *  - les plans partenaires gratuits ("partenaires sans paiement"),
 *  - les souscriptions personnalisées facturées hors-bande (virement, facture papier...),
 *  - les tests / environnements de démo.
 *
 * Il respecte la même interface que les providers réels, ce qui permet de
 * mélanger des souscriptions "manual" et des souscriptions Stripe/Paddle
 * dans le même système sans branche spéciale dans les services métier.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly key = "manual" as const;

  async createCustomer(input: { userId: string; email?: string }): Promise<ProviderCustomer> {
    return { externalCustomerId: `manual_cust_${input.userId}`, email: input.email };
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscription> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    return {
      externalSubscriptionId: `manual_sub_${randomUUID()}`,
      externalCustomerId: `manual_cust_${input.userId}`,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    };
  }

  async updateSubscription(input: UpdateSubscriptionInput): Promise<ProviderSubscription> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    return {
      externalSubscriptionId: input.externalSubscriptionId,
      externalCustomerId: `manual_cust_unknown`,
      status: input.cancelAtPeriodEnd ? "active" : "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    };
  }

  async cancelSubscription(): Promise<void> {
    // Rien à faire côté provider : le statut est géré localement par SubscriptionService.
  }

  async ensurePromoCode(): Promise<string | null> {
    // Les codes promo "manual" sont uniquement gérés en interne, jamais côté provider.
    return null;
  }

  async reportUsage(_input: ReportUsageInput): Promise<void> {
    // Pas de facturation à l'usage en mode manuel.
  }

  async verifyAndParseWebhook(): Promise<ProviderWebhookEvent> {
    return { type: "unknown", raw: null };
  }
}
