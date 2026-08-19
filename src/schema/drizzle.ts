/**
 * Schéma Drizzle (Postgres) intégré avec Better Auth.
 *
 * Ce fichier inclut :
 * 1. Tables de Better Auth (users, sessions, accounts, verification)
 * 2. Tables métier existantes (advantages, partners, plans, subscriptions, etc.)
 *
 * Les tables Better Auth sont gérées automatiquement par Better Auth.
 * Régénérez ce fichier après modification de config Better Auth :
 *   npx @better-auth/cli@latest generate --output src/schema/drizzle.ts
 */
import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

// ============================================================================
// BETTER AUTH TABLES
// ============================================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (t) => ({
  emailIdx: index("user_email_idx").on(t.email),
}));

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull(),
}, (t) => ({
  userIdIdx: index("session_user_id_idx").on(t.userId),
}));

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (t) => ({
  userIdIdx: index("account_user_id_idx").on(t.userId),
  pk: primaryKey({ columns: [t.providerId, t.accountId] }),
}));

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// ============================================================================
// TABLES MÉTIER (existantes + modifications pour Better Auth)
// ============================================================================

export const advantages = pgTable("advantages", {
  id: text("id").primaryKey(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  valueType: text("value_type").notNull(), // "boolean" | "quantity"
  unit: text("unit"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  keyIdx: uniqueIndex("advantages_key_idx").on(t.key),
}));

export const partners = pgTable("partners", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  billingMode: text("billing_mode").notNull(), // "free" | "paid"
  discountPercent: integer("discount_percent").notNull().default(0),
  revenueSharePercent: integer("revenue_share_percent"),
  contactEmail: text("contact_email"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex("partners_slug_idx").on(t.slug),
}));

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  kind: text("kind").notNull(), // "standard" | "custom" | "partner"
  isPublic: boolean("is_public").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  prices: jsonb("prices").notNull().default([]), // PlanPrice[]
  partnerId: text("partner_id").references(() => partners.id),
  originRequestId: text("origin_request_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex("plans_slug_idx").on(t.slug),
  kindIdx: index("plans_kind_idx").on(t.kind),
}));

export const planAdvantages = pgTable("plan_advantages", {
  planId: text("plan_id").notNull().references(() => plans.id),
  advantageId: text("advantage_id").notNull().references(() => advantages.id),
  value: jsonb("value"), // boolean | number | null
  overageAllowed: boolean("overage_allowed").notNull().default(false),
  overageUnitPriceCents: integer("overage_unit_price_cents"),
}, (t) => ({
  pk: uniqueIndex("plan_advantages_pk").on(t.planId, t.advantageId),
}));

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().references(() => plans.id),
  status: text("status").notNull(),
  provider: text("provider").notNull(),
  externalSubscriptionId: text("external_subscription_id"),
  externalCustomerId: text("external_customer_id"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  advantageOverrides: jsonb("advantage_overrides").notNull().default([]),
  appliedPromoCodeId: text("applied_promo_code_id"),
  partnerId: text("partner_id").references(() => partners.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index("subscriptions_user_idx").on(t.userId),
  statusIdx: index("subscriptions_status_idx").on(t.status),
}));

export const customSubscriptionRequests = pgTable("custom_subscription_requests", {
  id: text("id").primaryKey(),
  requestedByUserId: text("requested_by_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  requestedAdvantages: jsonb("requested_advantages").notNull().default([]),
  proposedPriceCents: integer("proposed_price_cents"),
  proposedCurrency: text("proposed_currency"),
  proposedInterval: text("proposed_interval"),
  justification: text("justification"),
  status: text("status").notNull().default("pending"),
  reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, { onDelete: "set null" }),
  reviewNotes: text("review_notes"),
  resultingPlanId: text("resulting_plan_id"),
  resultingSubscriptionId: text("resulting_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  requestedByIdx: index("custom_sub_req_requested_by_idx").on(t.requestedByUserId),
  reviewedByIdx: index("custom_sub_req_reviewed_by_idx").on(t.reviewedByUserId),
}));

export const promoCodes = pgTable("promo_codes", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  type: text("type").notNull(), // "percent" | "fixed" | "free_period" | "trial_extension"
  value: integer("value").notNull(),
  currency: text("currency"),
  description: text("description"),
  maxRedemptions: integer("max_redemptions"),
  redemptionCount: integer("redemption_count").notNull().default(0),
  perUserLimit: integer("per_user_limit"),
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  applicablePlanIds: jsonb("applicable_plan_ids").notNull().default([]),
  applicablePartnerIds: jsonb("applicable_partner_ids").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdByUserId: text("created_by_user_id").notNull(),
}, (t) => ({
  codeIdx: uniqueIndex("promo_codes_code_idx").on(t.code),
}));

export const promoRedemptions = pgTable("promo_redemptions", {
  id: text("id").primaryKey(),
  promoCodeId: text("promo_code_id").notNull().references(() => promoCodes.id),
  userId: text("user_id").notNull(),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usageRecords = pgTable("usage_records", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id),
  advantageKey: text("advantage_key").notNull(),
  quantity: integer("quantity").notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  subIdx: index("usage_records_sub_idx").on(t.subscriptionId, t.advantageKey),
}));

export const overageAuthorizations = pgTable("overage_authorizations", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id),
  advantageKey: text("advantage_key").notNull(),
  authorizedExtraLimit: integer("authorized_extra_limit"),
  reason: text("reason").notNull(),
  authorizedByUserId: text("authorized_by_user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  subIdx: index("overage_auth_sub_idx").on(t.subscriptionId, t.advantageKey),
}));

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull(),
  actorType: text("actor_type").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  metadata: jsonb("metadata"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  entityIdx: index("audit_logs_entity_idx").on(t.entityType, t.entityId),
  actorIdx: index("audit_logs_actor_idx").on(t.actorId),
  createdIdx: index("audit_logs_created_idx").on(t.createdAt),
}));
