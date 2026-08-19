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
 * Sous-ensemble structurel du SDK `stripe` officiel réellement utilisé ici.
 * On ne dépend PAS du package `stripe` directement (pas d'import de type
 * nominal) afin que ce fichier compile sans l'installer : en production,
 * passez simplement `new Stripe(secretKey)` — son type satisfait déjà
 * cette interface structurellement.
 */
export interface StripeClientLike {
  customers: {
    create(params: { email?: string; metadata?: Record<string, string> }): Promise<{ id: string; email?: string | null }>;
  };
  subscriptions: {
    create(params: {
      customer: string;
      items: Array<{ price: string; quantity?: number }>;
      coupon?: string;
      metadata?: Record<string, string>;
    }): Promise<{ id: string; customer: string; status: string; current_period_start: number; current_period_end: number }>;
    update(
      id: string,
      params: { items?: Array<{ price: string; quantity?: number }>; cancel_at_period_end?: boolean },
    ): Promise<{ id: string; customer: string; status: string; current_period_start: number; current_period_end: number }>;
    cancel(id: string): Promise<unknown>;
  };
  coupons: {
    create(params: { percent_off?: number; amount_off?: number; currency?: string; id?: string }): Promise<{ id: string }>;
  };
  subscriptionItems: {
    createUsageRecord(
      subscriptionItemId: string,
      params: { quantity: number; timestamp?: number; action?: "increment" | "set" },
    ): Promise<unknown>;
  };
  webhooks: {
    constructEvent(rawBody: string, signature: string, secret: string): { type: string; data: { object: any } };
  };
}

export interface StripeProviderOptions {
  client: StripeClientLike;
  webhookSecret: string;
  /** Nécessaire pour reportUsage : mapping advantageKey -> subscriptionItemId Stripe (usage-based). */
  usageSubscriptionItemId?: (advantageKey: string, externalSubscriptionId: string) => string | undefined;
}

export class StripePaymentProvider implements PaymentProvider {
  readonly key = "stripe" as const;

  constructor(private readonly opts: StripeProviderOptions) {}

  async createCustomer(input: { userId: string; email?: string }): Promise<ProviderCustomer> {
    const customer = await this.opts.client.customers.create({
      email: input.email,
      metadata: { userId: input.userId },
    });
    return { externalCustomerId: customer.id, email: customer.email ?? undefined };
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscription> {
    const customer = await this.createCustomer({ userId: input.userId, email: input.email });
    let coupon: string | undefined;
    if (input.externalPromoCode) {
      coupon = input.externalPromoCode;
    } else if (input.discountPercent) {
      const created = await this.opts.client.coupons.create({ percent_off: input.discountPercent });
      coupon = created.id;
    }
    const sub = await this.opts.client.subscriptions.create({
      customer: customer.externalCustomerId,
      items: [{ price: input.externalPriceId, quantity: input.quantity ?? 1 }],
      coupon,
      metadata: { userId: input.userId, ...input.metadata },
    });
    return this.toProviderSubscription(sub);
  }

  async updateSubscription(input: UpdateSubscriptionInput): Promise<ProviderSubscription> {
    const sub = await this.opts.client.subscriptions.update(input.externalSubscriptionId, {
      items: input.newExternalPriceId ? [{ price: input.newExternalPriceId, quantity: input.quantity }] : undefined,
      cancel_at_period_end: input.cancelAtPeriodEnd,
    });
    return this.toProviderSubscription(sub);
  }

  async cancelSubscription(externalSubscriptionId: string, atPeriodEnd: boolean): Promise<void> {
    if (atPeriodEnd) {
      await this.opts.client.subscriptions.update(externalSubscriptionId, { cancel_at_period_end: true });
    } else {
      await this.opts.client.subscriptions.cancel(externalSubscriptionId);
    }
  }

  async ensurePromoCode(input: { code: string; type: "percent" | "fixed"; value: number; currency?: string }): Promise<string | null> {
    const created = await this.opts.client.coupons.create({
      id: input.code,
      percent_off: input.type === "percent" ? input.value : undefined,
      amount_off: input.type === "fixed" ? input.value : undefined,
      currency: input.type === "fixed" ? input.currency : undefined,
    });
    return created.id;
  }

  async reportUsage(input: ReportUsageInput): Promise<void> {
    const itemId = this.opts.usageSubscriptionItemId?.(input.advantageKey, input.externalSubscriptionId);
    if (!itemId) return; // pas d'item metered configuré pour cet avantage
    await this.opts.client.subscriptionItems.createUsageRecord(itemId, {
      quantity: input.quantity,
      timestamp: Math.floor((input.timestamp ?? new Date()).getTime() / 1000),
      action: "increment",
    });
  }

  async verifyAndParseWebhook(rawBody: string, headers: Record<string, string | undefined>): Promise<ProviderWebhookEvent> {
    const signature = headers["stripe-signature"];
    if (!signature) throw new Error("En-tête stripe-signature manquant");
    const event = this.opts.client.webhooks.constructEvent(rawBody, signature, this.opts.webhookSecret);
    const obj = event.data.object;
    switch (event.type) {
      case "customer.subscription.updated":
        return {
          type: "subscription.updated",
          externalSubscriptionId: obj.id,
          status: obj.status,
          currentPeriodEnd: new Date(obj.current_period_end * 1000),
        };
      case "customer.subscription.deleted":
        return { type: "subscription.canceled", externalSubscriptionId: obj.id };
      case "invoice.payment_failed":
        return { type: "invoice.payment_failed", externalSubscriptionId: obj.subscription };
      default:
        return { type: "unknown", raw: event };
    }
  }

  private toProviderSubscription(sub: {
    id: string;
    customer: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
  }): ProviderSubscription {
    return {
      externalSubscriptionId: sub.id,
      externalCustomerId: sub.customer,
      status: sub.status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    };
  }
}
