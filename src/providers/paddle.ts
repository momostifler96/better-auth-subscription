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

export interface PaddleProviderOptions {
  http: HttpClient; // baseUrl attendu: https://api.paddle.com (ou sandbox)
  webhookSecret: string;
}

/**
 * Adaptateur Paddle. Sert d'exemple pour brancher un 2ᵉ provider de paiement
 * sans toucher à la logique métier : seule cette classe connaît le format
 * d'API propre à Paddle.
 */
export class PaddlePaymentProvider implements PaymentProvider {
  readonly key = "paddle" as const;

  constructor(private readonly opts: PaddleProviderOptions) {}

  async createCustomer(input: { userId: string; email?: string }): Promise<ProviderCustomer> {
    const res = await this.opts.http.request<{ data: { id: string; email: string } }>({
      method: "POST",
      path: "/customers",
      body: { email: input.email, custom_data: { userId: input.userId } },
    });
    return { externalCustomerId: res.data.id, email: res.data.email };
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscription> {
    const customer = await this.createCustomer({ userId: input.userId, email: input.email });
    const res = await this.opts.http.request<{
      data: { id: string; customer_id: string; status: string; current_billing_period: { starts_at: string; ends_at: string } };
    }>({
      method: "POST",
      path: "/subscriptions",
      body: {
        customer_id: customer.externalCustomerId,
        items: [{ price_id: input.externalPriceId, quantity: input.quantity ?? 1 }],
        discount_id: input.externalPromoCode,
        custom_data: { userId: input.userId, ...input.metadata },
      },
    });
    return this.toProviderSubscription(res.data);
  }

  async updateSubscription(input: UpdateSubscriptionInput): Promise<ProviderSubscription> {
    const res = await this.opts.http.request<{
      data: { id: string; customer_id: string; status: string; current_billing_period: { starts_at: string; ends_at: string } };
    }>({
      method: "PATCH",
      path: `/subscriptions/${input.externalSubscriptionId}`,
      body: {
        items: input.newExternalPriceId ? [{ price_id: input.newExternalPriceId, quantity: input.quantity }] : undefined,
        scheduled_change: input.cancelAtPeriodEnd ? { action: "cancel" } : undefined,
      },
    });
    return this.toProviderSubscription(res.data);
  }

  async cancelSubscription(externalSubscriptionId: string, atPeriodEnd: boolean): Promise<void> {
    await this.opts.http.request({
      method: "POST",
      path: `/subscriptions/${externalSubscriptionId}/cancel`,
      body: { effective_from: atPeriodEnd ? "next_billing_period" : "immediately" },
    });
  }

  async ensurePromoCode(input: { code: string; type: "percent" | "fixed"; value: number; currency?: string }): Promise<string | null> {
    const res = await this.opts.http.request<{ data: { id: string } }>({
      method: "POST",
      path: "/discounts",
      body: {
        type: input.type === "percent" ? "percentage" : "flat",
        amount: String(input.value),
        currency_code: input.currency,
        code: input.code,
      },
    });
    return res.data.id;
  }

  async verifyAndParseWebhook(rawBody: string, headers: Record<string, string | undefined>): Promise<ProviderWebhookEvent> {
    const signatureHeader = headers["paddle-signature"];
    if (!signatureHeader) throw new Error("En-tête paddle-signature manquant");
    const parts = Object.fromEntries(signatureHeader.split(";").map((kv) => kv.split("=") as [string, string]));
    const expected = createHmac("sha256", this.opts.webhookSecret).update(`${parts.ts}:${rawBody}`).digest("hex");
    const provided = Buffer.from(parts.h1 ?? "", "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (provided.length !== expectedBuf.length || !timingSafeEqual(provided, expectedBuf)) {
      throw new Error("Signature Paddle invalide");
    }
    const event = JSON.parse(rawBody) as { event_type: string; data: any };
    switch (event.event_type) {
      case "subscription.updated":
        return {
          type: "subscription.updated",
          externalSubscriptionId: event.data.id,
          status: event.data.status,
          currentPeriodEnd: new Date(event.data.current_billing_period.ends_at),
        };
      case "subscription.canceled":
        return { type: "subscription.canceled", externalSubscriptionId: event.data.id };
      case "transaction.payment_failed":
        return { type: "invoice.payment_failed", externalSubscriptionId: event.data.subscription_id };
      default:
        return { type: "unknown", raw: event };
    }
  }

  private toProviderSubscription(data: {
    id: string;
    customer_id: string;
    status: string;
    current_billing_period: { starts_at: string; ends_at: string };
  }): ProviderSubscription {
    return {
      externalSubscriptionId: data.id,
      externalCustomerId: data.customer_id,
      status: data.status,
      currentPeriodStart: new Date(data.current_billing_period.starts_at),
      currentPeriodEnd: new Date(data.current_billing_period.ends_at),
    };
  }
}
