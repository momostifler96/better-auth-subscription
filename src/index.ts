// Types de domaine
export * from "./types/domain.js";

// Ports de persistance + implémentation mémoire (dev/tests)
export * from "./repositories/interfaces.js";
export { createMemoryStore } from "./repositories/memory/store.js";

// Schéma Drizzle de référence (Postgres)
export * as drizzleSchema from "./schema/drizzle.js";

// Providers de paiement
export * from "./providers/types.js";
export { PaymentProviderRegistry } from "./providers/registry.js";
export { ManualPaymentProvider } from "./providers/manual.js";
export { StripePaymentProvider, type StripeClientLike, type StripeProviderOptions } from "./providers/stripe.js";
export { PaddlePaymentProvider, type PaddleProviderOptions } from "./providers/paddle.js";
export { LemonSqueezyPaymentProvider, type LemonSqueezyProviderOptions } from "./providers/lemonsqueezy.js";
export { createFetchHttpClient, type HttpClient } from "./providers/http-client.js";

// Services métier
export { AuditService, type AuditContext, type RecordAuditInput } from "./services/audit-service.js";
export { PlanService, type CreateAdvantageInput, type CreatePlanInput } from "./services/plan-service.js";
export { PromoService, type CreatePromoCodeInput, type ValidatePromoContext } from "./services/promo-service.js";
export { PartnerService, type CreatePartnerInput, type CreatePartnerPlanInput } from "./services/partner-service.js";
export {
  SubscriptionService,
  type SubscribeInput,
  type CustomSubscriptionRequestInput,
  type ReviewCustomRequestInput,
} from "./services/subscription-service.js";
export { OverageService, type RecordUsageInput, type AuthorizeOverageInput, type UsageCheckResult } from "./services/overage-service.js";

// Plugin Better Auth
export { subscriptionsPlugin, createSubscriptionServices, type SubscriptionServices, type SubscriptionsPluginOptions } from "./plugin/index.js";
