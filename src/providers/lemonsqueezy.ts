import { createHmac, timingSafeEqual } from "node:crypto";
import type { HttpClient } from "./http-client.js";
import type {
  CreateSubscriptionInput,
  PaymentProvider,
  ProviderCustomer,
  ProviderSubscription,
  ProviderWebhookEvent,
  UpdateSubscriptionInput,
} from "./types.js";

export interface LemonSqueezyProviderOptions {
  http: HttpClient; // baseUrl attendu: https://api.lemonsqueezy.com/v1
  storeId: string;
  webhookSecret: string;
}

/**
 * Adaptateur Lemon Squeezy : illustre qu'ajouter un 3ᵉ provider reste
 * une simple implémentation de PaymentProvider, sans changement ailleurs.
 * Lemon Squeezy n'a pas de "créer un client" séparé : le client est créé
 * implicitement à la création de la souscription (checkout).
 */
export class LemonSqueezyPaymentProvider implements PaymentProvider {
  readonly key = "lemonsqueezy" as const;

  constructor(private readonly opts: LemonSqueezyProviderOptions) {}

  async createCustomer(input: { userId: string; email?: string }): Promise<ProviderCustomer> {
    // Pas de ressource "customer" dédiée avant checkout chez LS : on retourne un id logique
    // qui sera résolu/rattaché lors de createSubscription.
    return { externalCustomerId: `pending:${input.userId}`, email: input.email };
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscription> {
    const res = await this.opts.http.request<{
      data: { id: string; attributes: { customer_id: number; status: string; renews_at: string; created_at: string } };
    }>({
      method: "POST",
      path: "/checkouts",
      body: {
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: { email: input.email, custom: { userId: input.userId } },
            discount_code: input.externalPromoCode,
          },
          relationships: {
            store: { data: { type: "stores", id: this.opts.storeId } },
            variant: { data: { type: "variants", id: input.externalPriceId } },
          },
        },
      },
    });
    return this.toProviderSubscription(res.data);
  }

  async updateSubscription(input: UpdateSubscriptionInput): Promise<ProviderSubscription> {
    const res = await this.opts.http.request<{
      data: { id: string; attributes: { customer_id: number; status: string; renews_at: string; created_at: string } };
    }>({
      method: "PATCH",
      path: `/subscriptions/${input.externalSubscriptionId}`,
      body: {
        data: {
          type: "subscriptions",
          id: input.externalSubscriptionId,
          attributes: {
            variant_id: input.newExternalPriceId,
            cancelled: input.cancelAtPeriodEnd,
          },
        },
      },
    });
    return this.toProviderSubscription(res.data);
  }

  async cancelSubscription(externalSubscriptionId: string): Promise<void> {
    await this.opts.http.request({ method: "DELETE", path: `/subscriptions/${externalSubscriptionId}` });
  }

  async ensurePromoCode(input: { code: string; type: "percent" | "fixed"; value: number }): Promise<string | null> {
    const res = await this.opts.http.request<{ data: { id: string } }>({
      method: "POST",
      path: "/discounts",
      body: {
        data: {
          type: "discounts",
          attributes: {
            name: input.code,
            code: input.code,
            amount: input.value,
            amount_type: input.type === "percent" ? "percent" : "fixed",
          },
          relationships: { store: { data: { type: "stores", id: this.opts.storeId } } },
        },
      },
    });
    return res.data.id;
  }

  async verifyAndParseWebhook(rawBody: string, headers: Record<string, string | undefined>): Promise<ProviderWebhookEvent> {
    const signature = headers["x-signature"];
    if (!signature) throw new Error("En-tête x-signature manquant");
    const expected = createHmac("sha256", this.opts.webhookSecret).update(rawBody).digest("hex");
    const provided = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (provided.length !== expectedBuf.length || !timingSafeEqual(provided, expectedBuf)) {
      throw new Error("Signature Lemon Squeezy invalide");
    }
    const event = JSON.parse(rawBody) as { meta: { event_name: string }; data: any };
    switch (event.meta.event_name) {
      case "subscription_updated":
        return {
          type: "subscription.updated",
          externalSubscriptionId: event.data.id,
          status: event.data.attributes.status,
          currentPeriodEnd: new Date(event.data.attributes.renews_at),
        };
      case "subscription_cancelled":
      case "subscription_expired":
        return { type: "subscription.canceled", externalSubscriptionId: event.data.id };
      case "subscription_payment_failed":
        return { type: "invoice.payment_failed", externalSubscriptionId: event.data.id };
      default:
        return { type: "unknown", raw: event };
    }
  }

  private toProviderSubscription(data: {
    id: string;
    attributes: { customer_id: number; status: string; renews_at: string; created_at: string };
  }): ProviderSubscription {
    return {
      externalSubscriptionId: data.id,
      externalCustomerId: String(data.attributes.customer_id),
      status: data.attributes.status,
      currentPeriodStart: new Date(data.attributes.created_at),
      currentPeriodEnd: new Date(data.attributes.renews_at),
    };
  }
}
