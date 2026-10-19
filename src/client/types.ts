/**
 * Types TypeScript complets pour le plugin subscriptions.
 * Générés à partir du schéma Better Auth.
 */

// ============================================================================
// Types de base
// ============================================================================

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description?: string;
  kind: "standard" | "custom" | "partner";
  isPublic: boolean;
  isActive: boolean;
  prices: PlanPrice[];
  partnerId?: string;
  organizationId?: string;
  originRequestId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanPrice {
  provider: string;
  externalPriceId: string;
  currency: string;
  amountCents: number;
  interval: "month" | "year" | "one_time" | "custom";
}

export interface Advantage {
  id: string;
  key: string;
  name: string;
  description?: string;
  valueType: "boolean" | "quantity";
  unit?: string;
  createdAt: Date;
}

export interface AdvantageSelection {
  advantageKey: string;
  value: boolean | number | null;
  overageAllowed?: boolean;
  overageUnitPriceCents?: number;
}

export interface PlanAdvantage {
  id: string;
  planId: string;
  advantageId: string;
  value: boolean | number | null;
  overageAllowed: boolean;
  overageUnitPriceCents?: number;
  advantage?: Advantage;
}

// ============================================================================
// Types d'abonnement
// ============================================================================

export interface Subscription {
  id: string;
  userId?: string;
  organizationId?: string;
  planId: string;
  status:
    | "active"
    | "paused"
    | "canceled"
    | "trialing"
    | "expired"
    | "past_due"
    | "pending_approval";
  provider: string;
  externalSubscriptionId?: string;
  externalCustomerId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  advantageOverrides: Record<string, AdvantageValue>;
  appliedPromoCodeId?: string;
  partnerId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  plan?: Plan;
  promoCode?: PromoCode;
  partner?: Partner;
}

export type AdvantageValue = boolean | number | null;

export interface SubscriptionWithAdvantages {
  subscription: Subscription | null;
  advantages: PlanAdvantageWithDetail[];
}

export interface PlanAdvantageWithDetail {
  advantage: Advantage;
  value: AdvantageValue;
  overageAllowed: boolean;
  overageUnitPriceCents?: number;
}

// ============================================================================
// Types de demandes personnalisées
// ============================================================================

export interface CustomSubscriptionRequest {
  id: string;
  requestedByUserId?: string;
  requestedByOrganizationId?: string;
  requestedAdvantages: AdvantageSelection[];
  proposedPriceCents?: number;
  proposedCurrency?: string;
  proposedInterval?: "month" | "year" | "one_time" | "custom";
  justification?: string;
  status: "pending" | "approved" | "rejected";
  reviewedByUserId?: string;
  reviewNotes?: string;
  resultingPlanId?: string;
  resultingSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
  requestedBy?: { id: string; name: string; email: string };
  reviewedBy?: { id: string; name: string; email: string };
}

// ============================================================================
// Types de codes promo
// ============================================================================

export interface PromoCode {
  id: string;
  code: string;
  type: "percent" | "fixed" | "free_period" | "trial_extension";
  value: number;
  currency?: string;
  description?: string;
  maxRedemptions?: number;
  redemptionCount: number;
  perUserLimit?: number;
  validFrom: Date;
  validUntil?: Date;
  applicablePlanIds: string[];
  applicablePartnerIds: string[];
  isActive: boolean;
  createdAt: Date;
  createdByUserId: string;
  createdBy?: { id: string; name: string; email: string };
}

export interface PromoRedemption {
  id: string;
  promoCodeId: string;
  userId: string;
  subscriptionId: string;
  redeemedAt: Date;
  promoCode?: PromoCode;
  user?: { id: string; name: string; email: string };
  subscription?: Subscription;
}

// ============================================================================
// Types de partenaires
// ============================================================================

export interface Partner {
  id: string;
  name: string;
  slug: string;
  billingMode: "free" | "paid";
  discountPercent: number;
  revenueSharePercent?: number;
  contactEmail?: string;
  notes?: string;
  organizationId?: string;
  isActive: boolean;
  createdAt: Date;
}

// ============================================================================
// Types d'utilisation et dépassements
// ============================================================================

export interface UsageRecord {
  id: string;
  subscriptionId: string;
  advantageKey: string;
  quantity: number;
  periodStart: Date;
  periodEnd: Date;
  recordedAt: Date;
  subscription?: Subscription;
  advantage?: Advantage;
}

export interface OverageAuthorization {
  id: string;
  subscriptionId: string;
  advantageKey: string;
  authorizedExtraLimit?: number;
  reason: string;
  authorizedByUserId: string;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  subscription?: Subscription;
  advantage?: Advantage;
  authorizedBy?: { id: string; name: string; email: string };
}

// ============================================================================
// Types d'audit
// ============================================================================

export interface AuditLog {
  id: string;
  actorId: string;
  actorType: "user" | "admin" | "system";
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
  actor?: { id: string; name: string; email: string };
}

// ============================================================================
// Types de réponses API
// ============================================================================

export interface ListPlansResponse {
  plans: Plan[];
}

export interface GetMySubscriptionResponse extends SubscriptionWithAdvantages {}

export interface SubscribeResponse {
  subscription: Subscription;
}

export interface ChangePlanResponse {
  subscription: Subscription;
}

export interface CancelSubscriptionResponse {
  subscription: Subscription;
}

export interface ValidatePromoCodeResponse {
  promo: PromoCodeValidation;
}

export interface PromoCodeValidation {
  id: string;
  code: string;
  type: PromoCode["type"];
  value: number;
  currency?: string;
  isValid: boolean;
  errorMessage?: string;
}

export interface CreatePromoCodeResponse {
  promo: PromoCode;
}

export interface CreateAdvantageResponse {
  advantage: Advantage;
}

export interface CreatePlanResponse {
  plan: Plan;
}

export interface CreatePartnerResponse {
  partner: Partner;
}

export interface CreatePartnerPlanResponse {
  plan: Plan;
}

export interface RequestCustomSubscriptionResponse {
  request: CustomSubscriptionRequest;
}

export interface ListPendingCustomRequestsResponse {
  requests: CustomSubscriptionRequest[];
}

export interface ApproveCustomRequestResponse {
  subscription: Subscription;
}

export interface RejectCustomRequestResponse {
  request: CustomSubscriptionRequest;
}

export interface RecordUsageResponse {
  usage: UsageRecord;
  authorized: boolean;
  message?: string;
}

export interface AuthorizeOverageResponse {
  authorization: OverageAuthorization;
}

export interface ListAuditLogsResponse {
  logs: AuditLog[];
  total: number;
}

// ============================================================================
// Types de requêtes (payloads)
// ============================================================================

export interface SubscribePayload {
  planId: string;
  provider?: string;
  promoCode?: string;
  quantity?: number;
  manualProofUrl?: string;
  manualMetadata?: Record<string, string>;
}

export interface UsageCheckResult {
  allowed: boolean;
  used: number;
  planLimit: number | null;
  authorizedExtraLimit: number | null;
  remaining: number | null;
  usedOverage: boolean;
}

export interface ChangePlanPayload {
  subscriptionId: string;
  newPlanId: string;
}

export interface CancelSubscriptionPayload {
  subscriptionId: string;
  atPeriodEnd?: boolean;
}

export interface ValidatePromoCodePayload {
  code: string;
  planId?: string;
  partnerId?: string;
}

export interface CreatePromoCodePayload {
  code: string;
  type: PromoCode["type"];
  value: number;
  currency?: string;
  description?: string;
  maxRedemptions?: number;
  perUserLimit?: number;
  validFrom?: Date;
  validUntil?: Date;
  applicablePlanIds?: string[];
  applicablePartnerIds?: string[];
}

export interface CreateAdvantagePayload {
  key: string;
  name: string;
  description?: string;
  valueType: "boolean" | "quantity";
  unit?: string;
}

export interface CreatePlanPayload {
  slug: string;
  name: string;
  description?: string;
  kind?: "standard" | "custom" | "partner";
  isPublic?: boolean;
  prices?: PlanPrice[];
  partnerId?: string;
  advantages?: AdvantageSelection[];
}

export interface CreatePartnerPayload {
  name: string;
  slug: string;
  billingMode: "free" | "paid";
  discountPercent?: number;
  revenueSharePercent?: number;
  contactEmail?: string;
  notes?: string;
}

export interface CreatePartnerPlanPayload {
  slug: string;
  name: string;
  description?: string;
  prices?: PlanPrice[];
  advantages?: AdvantageSelection[];
}

export interface RequestCustomSubscriptionPayload {
  requestedAdvantages: AdvantageSelection[];
  proposedPriceCents?: number;
  proposedCurrency?: string;
  proposedInterval?: string;
  justification?: string;
}

export interface ApproveCustomRequestPayload {
  reviewNotes?: string;
  planSlug?: string;
  price?: PlanPrice;
}

export interface RejectCustomRequestPayload {
  reviewNotes?: string;
}

export interface RecordUsagePayload {
  subscriptionId: string;
  advantageKey: string;
  quantity: number;
}

export interface AuthorizeOveragePayload {
  subscriptionId: string;
  advantageKey: string;
  authorizedExtraLimit: number | null;
  reason: string;
  expiresAt?: Date;
}

// ============================================================================
// Types utilitaires
// ============================================================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface ListAuditLogsParams extends PaginationParams {
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export type SubscriptionStatus = Subscription["status"];
export type PromoCodeType = PromoCode["type"];
export type BillingMode = Partner["billingMode"];
export type PlanKind = Plan["kind"];
export type ActorType = AuditLog["actorType"];
export type CustomRequestStatus = CustomSubscriptionRequest["status"];

// ============================================================================
// Types pour les filtres et requêtes
// ============================================================================

export interface FilterPlans {
  isPublic?: boolean;
  isActive?: boolean;
  kind?: PlanKind;
  partnerId?: string;
  organizationId?: string;
}

export interface FilterSubscriptions {
  userId?: string;
  organizationId?: string;
  status?: SubscriptionStatus;
  planId?: string;
  provider?: string;
}

export interface FilterPromoCodes {
  isActive?: boolean;
  code?: string;
  type?: PromoCodeType;
}

export interface FilterAuditLogs {
  action?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
}
