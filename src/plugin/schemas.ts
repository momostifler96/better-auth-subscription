import * as z from "zod/v4";

// ---- Input schemas (body) ----

export const planPriceSchema = z.object({
  provider: z.string().describe("Payment provider ID"),
  externalPriceId: z.string().describe("External price ID from provider"),
  currency: z.string().describe("ISO 4217 currency code"),
  amountCents: z.number().int().nonnegative().describe("Price in cents"),
  interval: z.enum(["month", "year", "one_time", "custom"]).describe("Billing interval"),
});

export const advantageSelectionSchema = z.object({
  advantageKey: z.string().describe("Advantage unique key"),
  value: z.union([z.boolean(), z.number(), z.null()]).describe("Advantage value"),
  overageAllowed: z.boolean().optional().describe("Allow overage for this advantage"),
  overageUnitPriceCents: z.number().int().nonnegative().optional().describe("Price per unit overused"),
});

// ---- Response schemas ----

export const advantageSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  valueType: z.enum(["boolean", "quantity"]),
  unit: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const planPriceResponseSchema = z.object({
  id: z.string(),
  planId: z.string(),
  provider: z.string(),
  externalPriceId: z.string(),
  currency: z.string(),
  amountCents: z.number(),
  interval: z.enum(["month", "year", "one_time", "custom"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const planAdvantageSchema = z.object({
  id: z.string(),
  planId: z.string(),
  advantageId: z.string(),
  advantage: advantageSchema,
  value: z.union([z.boolean(), z.number(), z.null()]),
  overageAllowed: z.boolean(),
  overageUnitPriceCents: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const planSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  kind: z.enum(["standard", "custom", "partner"]),
  isPublic: z.boolean(),
  partnerId: z.string().nullable(),
  prices: z.array(planPriceResponseSchema),
  advantages: z.array(planAdvantageSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const subscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  planId: z.string(),
  status: z.enum(["active", "canceled", "paused", "trialing", "past_due", "pending_approval"]),
  externalSubscriptionId: z.string().nullable(),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  canceledAt: z.date().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  quantity: z.number(),
  provider: z.string().nullable(),
  promoCodeUsed: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const planAdvantageWithDetailSchema = z.object({
  id: z.string(),
  planId: z.string(),
  advantage: advantageSchema,
  value: z.union([z.boolean(), z.number(), z.null()]),
  overageAllowed: z.boolean(),
  overageUnitPriceCents: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const subscriptionWithAdvantagesSchema = z.object({
  subscription: subscriptionSchema.nullable(),
  advantages: z.array(planAdvantageWithDetailSchema),
});

export const customSubscriptionRequestSchema = z.object({
  id: z.string(),
  requestedByUserId: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  requestedAdvantages: z.array(z.object({
    advantageKey: z.string(),
    value: z.union([z.boolean(), z.number(), z.null()]),
  })),
  proposedPriceCents: z.number().nullable(),
  proposedCurrency: z.string().nullable(),
  proposedInterval: z.enum(["month", "year", "one_time", "custom"]).nullable(),
  justification: z.string().nullable(),
  approvedByAdminId: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const promoCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: z.enum(["amount", "percent"]),
  value: z.number(),
  currency: z.string().nullable(),
  description: z.string().nullable(),
  maxRedemptions: z.number().nullable(),
  perUserLimit: z.number(),
  validFrom: z.date(),
  validUntil: z.date().nullable(),
  applicablePlanIds: z.array(z.string()),
  applicablePartnerIds: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const promoRedemptionSchema = z.object({
  id: z.string(),
  promoCodeId: z.string(),
  userId: z.string(),
  subscriptionId: z.string().nullable(),
  discountAppliedCents: z.number(),
  redeemedAt: z.date(),
});

export const partnerSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const usageRecordSchema = z.object({
  id: z.string(),
  subscriptionId: z.string(),
  advantageKey: z.string(),
  quantity: z.number(),
  periodStart: z.date(),
  periodEnd: z.date(),
  recordedAt: z.date(),
});

export const overageAuthorizationSchema = z.object({
  id: z.string(),
  subscriptionId: z.string(),
  advantageKey: z.string(),
  allowedQuantity: z.number(),
  isActive: z.boolean(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const auditLogSchema = z.object({
  id: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  actorId: z.string(),
  actorType: z.enum(["admin", "user", "system"]),
  changes: z.record(z.string(), z.any()),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date(),
});

// ---- Request body schemas ----

export const createAdvantageBodySchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9][a-z0-9_-]*$/, "key doit être un slug (a-z, 0-9, _, -)").describe("Unique advantage key"),
  name: z.string().describe("Human-readable name"),
  description: z.string().optional().describe("Optional description"),
  valueType: z.enum(["boolean", "quantity"]).describe("Type of advantage value"),
  unit: z.string().optional().describe("Unit for quantity type (e.g., 'emails', 'users')"),
});

export const updateAdvantageBodySchema = z.object({
  name: z.string().describe("Human-readable name"),
  description: z.string().optional().describe("Optional description"),
  valueType: z.enum(["boolean", "quantity"]).describe("Type of advantage value"),
  unit: z.string().optional().describe("Unit for quantity type"),
});
export  const updateAdvantageSucessResponseSchema = z.object({ advantage: advantageSchema })

export const createPlanBodySchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9][a-z0-9_-]*$/, "slug doit être un slug (a-z, 0-9, _, -)").describe("URL-friendly plan identifier"),
  name: z.string().describe("Human-readable plan name"),
  description: z.string().optional().describe("Plan description"),
  kind: z.enum(["standard", "custom", "partner"]).optional().describe("Plan type"),
  isPublic: z.boolean().optional().describe("Whether plan is publicly visible"),
  prices: z.array(planPriceSchema).optional().describe("Pricing for different providers/intervals"),
  partnerId: z.string().optional().describe("Partner ID if this is a partner plan"),
  advantages: z.array(advantageSelectionSchema).optional().describe("Advantages included in this plan"),
});

export const updatePlanBodySchema = z.object({
  name: z.string().describe("Human-readable plan name"),
  description: z.string().optional().describe("Plan description"),
  isPublic: z.boolean().optional().describe("Whether plan is publicly visible"),
  isActive: z.boolean().optional().describe("Whether the plan can be subscribed to"),
  prices: z.array(planPriceSchema).optional().describe("Pricing for different providers/intervals"),
  advantages: z.array(advantageSelectionSchema).optional().describe("Advantages included in this plan"),
});

const manualProofUrlSchema = z
  .string()
  .max(3_000_000)
  .refine(
    (value) =>
      value.startsWith("https://") ||
      /^data:(image\/(png|jpe?g|webp|gif)|application\/pdf);base64,/.test(value),
    { message: "manualProofUrl doit être une URL https ou un data URL image/PDF" },
  );

const manualMetadataSchema = z
  .record(z.string().min(1).max(64), z.string().max(1000))
  .refine(
    (value) =>
      Object.keys(value).length <= 20 &&
      !Object.keys(value).some((key) => ["__proto__", "constructor", "prototype"].includes(key)),
    { message: "manualMetadata doit contenir au plus 20 clés simples" },
  );

export const subscribeBodySchema = z.object({
  planId: z.string().describe("Plan ID to subscribe to"),
  provider: z.string().optional().describe("Payment provider (e.g., 'stripe', 'manual')"),
  promoCode: z.string().max(64).optional().describe("Promo code to apply"),
  quantity: z.number().int().positive().max(1_000_000).optional().describe("Quantity multiplier for the plan"),
  // Manual provider only: proof of payment (file as base64 or URL) and optional metadata
  manualProofUrl: manualProofUrlSchema.optional().describe("Proof of payment (base64 data URL or https URL) - required for 'manual' provider"),
  manualMetadata: manualMetadataSchema.optional().describe("Optional metadata for manual subscription (flat string map)"),
});

export const changePlanBodySchema = z.object({
  subscriptionId: z.string().describe("Subscription ID to change"),
  newPlanId: z.string().describe("New plan ID"),
});

export const cancelSubscriptionBodySchema = z.object({
  subscriptionId: z.string().describe("Subscription ID to cancel"),
  atPeriodEnd: z.boolean().optional().describe("If true, cancel at period end instead of immediately"),
});

export const requestCustomSubscriptionBodySchema = z.object({
  requestedAdvantages: z.array(z.object({
    advantageKey: z.string(),
    value: z.union([z.boolean(), z.number(), z.null()]),
  })).describe("Requested advantages configuration"),
  proposedPriceCents: z.number().int().nonnegative().optional().describe("Proposed price in cents"),
  proposedCurrency: z.string().optional().describe("ISO 4217 currency code"),
  proposedInterval: z.enum(["month", "year", "one_time", "custom"]).optional().describe("Proposed billing interval"),
  justification: z.string().optional().describe("Justification for custom request"),
});

export const approveCustomRequestBodySchema = z.object({
  customRequestId: z.string().describe("Custom request ID to approve"),
});

export const rejectCustomRequestBodySchema = z.object({
  customRequestId: z.string().describe("Custom request ID to reject"),
  reason: z.string().optional().describe("Reason for rejection"),
});

export const validatePromoCodeBodySchema = z.object({
  code: z.string().describe("Promo code to validate"),
  planId: z.string().optional().describe("Plan ID for plan-specific validation"),
  partnerId: z.string().optional().describe("Partner ID for partner-specific validation"),
});

export const createPromoCodeBodySchema = z.object({
  code: z.string().min(2).max(64).describe("Promo code (will be uppercase)"),
  type: z.enum(["percent", "fixed", "free_period", "trial_extension"]).describe("Discount type"),
  value: z.number().positive().describe("Discount value"),
  currency: z.string().optional().describe("Currency for amount discounts"),
  description: z.string().optional().describe("Promo code description"),
  maxRedemptions: z.number().int().positive().optional().describe("Max total redemptions"),
  perUserLimit: z.number().int().positive().optional().describe("Max redemptions per user"),
  validFrom: z.coerce.date().optional().describe("Validity start date"),
  validUntil: z.coerce.date().optional().describe("Validity end date"),
  applicablePlanIds: z.array(z.string()).optional().describe("Plan IDs this code applies to"),
  applicablePartnerIds: z.array(z.string()).optional().describe("Partner IDs this code applies to"),
});

export const createPartnerBodySchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9][a-z0-9_-]*$/, "slug doit être un slug (a-z, 0-9, _, -)").describe("URL-friendly partner identifier"),
  name: z.string().describe("Partner name"),
  billingMode: z.enum(["free", "paid"]).describe("Billing mode for partner"),
  discountPercent: z.number().min(0).max(100).optional().describe("Discount percentage"),
  revenueSharePercent: z.number().min(0).max(100).optional().describe("Revenue share percentage"),
  contactEmail: z.string().email().optional().describe("Partner contact email"),
  notes: z.string().optional().describe("Partner notes"),
});

export const recordUsageBodySchema = z.object({
  subscriptionId: z.string().describe("Subscription ID"),
  advantageKey: z.string().describe("Advantage key"),
  quantity: z.number().int().nonnegative().max(1_000_000_000).describe("Quantity used"),
});

export const authorizeOverageBodySchema = z.object({
  subscriptionId: z.string().describe("Subscription ID"),
  advantageKey: z.string().describe("Advantage key"),
  authorizedExtraLimit: z.number().max(1_000_000_000).nullable().describe("Authorized extra limit (null for unlimited)"),
  reason: z.string().min(3).max(1000).describe("Reason for authorization"),
  expiresAt: z.coerce.date().optional().describe("Expiration date for authorization"),
});

export const approveSubscriptionBodySchema = z
  .object({ reviewNotes: z.string().max(2000).optional() })
  .optional();

export const rejectSubscriptionBodySchema = z
  .object({ reason: z.string().max(2000).optional() })
  .optional();
