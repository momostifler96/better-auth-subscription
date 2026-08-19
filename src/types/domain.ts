/**
 * Types de domaine partagés par tous les services du plugin.
 * Ces interfaces sont indépendantes de la couche de stockage : le schéma
 * Drizzle (src/schema/drizzle.ts) et le store mémoire (src/repositories/memory)
 * les implémentent tous les deux.
 */

export type ID = string;

/** Statuts possibles d'une souscription. */
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "pending_approval" // souscription personnalisée en attente de validation
  | "paused"
  | "expired";

/** Type de plan. */
export type PlanKind = "standard" | "custom" | "partner";

/** Modèle de facturation d'un partenaire. */
export type PartnerBillingMode = "free" | "paid";

/** Identifiant de provider de paiement supporté nativement. */
export type ProviderKey = "stripe" | "paddle" | "lemonsqueezy" | "manual" | (string & {});

/**
 * Un "avantage" est une fonctionnalité ou une limite activable/quantifiable
 * sur un plan (ex: "export_pdf", "seats", "api_calls_per_month").
 * C'est la brique qui permet la sélection d'avantages personnalisée.
 */
export interface Advantage {
  id: ID;
  key: string; // slug stable utilisé par le code, ex: "api_calls_per_month"
  name: string;
  description?: string;
  /** "boolean" = simple toggle, "quantity" = limite numérique (ex: sièges, appels API) */
  valueType: "boolean" | "quantity";
  /** Unité d'affichage optionnelle ("appels/mois", "sièges", ...) */
  unit?: string;
  createdAt: Date;
}

/** Association d'un avantage à un plan, avec une valeur/limite propre à ce plan. */
export interface PlanAdvantage {
  planId: ID;
  advantageId: ID;
  /** true/false pour boolean, quantité (ou null = illimité) pour quantity */
  value: boolean | number | null;
  /** Autorise le dépassement de cette limite précise pour ce plan (voir OverageService) */
  overageAllowed: boolean;
  /** Prix unitaire du dépassement si overageAllowed=true (en plus petite unité monétaire, ex: centimes) */
  overageUnitPriceCents?: number;
}

/** Prix d'un plan chez un provider donné (un plan peut avoir un prix par provider). */
export interface PlanPrice {
  provider: ProviderKey;
  /** Identifiant du prix/produit côté provider (ex: price_xxx chez Stripe) */
  externalPriceId: string;
  currency: string; // ISO 4217, ex: "EUR"
  amountCents: number;
  interval: "month" | "year" | "one_time" | "custom";
}

export interface Plan {
  id: ID;
  slug: string;
  name: string;
  description?: string;
  kind: PlanKind;
  /** Plan visible au public dans le catalogue (false pour les plans custom/partner privés) */
  isPublic: boolean;
  isActive: boolean;
  /** Prix multi-provider ; vide pour un plan gratuit ou un plan "manual" (partenaire) */
  prices: PlanPrice[];
  /** Partenaire propriétaire, uniquement pour kind="partner" */
  partnerId?: ID;
  /** Demande d'origine, uniquement pour kind="custom" */
  originRequestId?: ID;
  createdAt: Date;
  updatedAt: Date;
}

export interface Partner {
  id: ID;
  name: string;
  slug: string;
  billingMode: PartnerBillingMode;
  /** Remise en % appliquée aux souscriptions de ce partenaire (0-100) */
  discountPercent: number;
  /** Partage de revenu en % reversé au partenaire (0-100), pertinent si billingMode="paid" */
  revenueSharePercent?: number;
  contactEmail?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Subscription {
  id: ID;
  userId: ID;
  planId: ID;
  status: SubscriptionStatus;
  provider: ProviderKey;
  externalSubscriptionId?: string; // id côté provider (absent pour "manual")
  externalCustomerId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  /** Surcharges d'avantages propres à CETTE souscription (au-delà de celles du plan) */
  advantageOverrides: PlanAdvantage[];
  appliedPromoCodeId?: ID;
  partnerId?: ID;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/** Demande de souscription personnalisée "à la demande" avant approbation. */
export interface CustomSubscriptionRequest {
  id: ID;
  requestedByUserId: ID;
  /** Avantages souhaités, exprimés directement (pas encore liés à un plan) */
  requestedAdvantages: Array<{ advantageKey: string; value: boolean | number | null }>;
  proposedPriceCents?: number;
  proposedCurrency?: string;
  proposedInterval?: PlanPrice["interval"];
  justification?: string;
  status: "pending" | "approved" | "rejected";
  reviewedByUserId?: ID;
  reviewNotes?: string;
  resultingPlanId?: ID;
  resultingSubscriptionId?: ID;
  createdAt: Date;
  updatedAt: Date;
}

export type PromoCodeType = "percent" | "fixed" | "free_period" | "trial_extension";

export interface PromoCode {
  id: ID;
  code: string; // normalisé en majuscules
  type: PromoCodeType;
  /** % pour "percent", centimes pour "fixed", nb de jours pour "free_period"/"trial_extension" */
  value: number;
  currency?: string; // requis si type="fixed"
  description?: string;
  maxRedemptions?: number; // illimité si absent
  redemptionCount: number;
  perUserLimit?: number; // combien de fois un même user peut l'utiliser
  validFrom: Date;
  validUntil?: Date;
  /** Restreint le code à certains plans/partenaires ; vide = applicable partout */
  applicablePlanIds: ID[];
  applicablePartnerIds: ID[];
  isActive: boolean;
  createdAt: Date;
  createdByUserId: ID;
}

export interface PromoRedemption {
  id: ID;
  promoCodeId: ID;
  userId: ID;
  subscriptionId: ID;
  redeemedAt: Date;
}

/** Enregistrement d'utilisation pour une métrique quantifiable (ex: api_calls_per_month). */
export interface UsageRecord {
  id: ID;
  subscriptionId: ID;
  advantageKey: string;
  quantity: number;
  periodStart: Date;
  periodEnd: Date;
  recordedAt: Date;
}

/**
 * Autorisation explicite de dépassement au-delà de la limite du plan
 * ("dépassement autorisé"). Sans cette entrée, l'usage est bloqué/refusé
 * une fois la limite du plan atteinte, même si techniquement facturable.
 */
export interface OverageAuthorization {
  id: ID;
  subscriptionId: ID;
  advantageKey: string;
  /** Limite additionnelle autorisée (ou null = illimité) au-delà de la limite du plan */
  authorizedExtraLimit: number | null;
  reason: string;
  authorizedByUserId: ID;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

export type AuditActorType = "user" | "admin" | "system" | "partner";

export interface AuditLogEntry {
  id: ID;
  actorId: ID;
  actorType: AuditActorType;
  action: string; // ex: "subscription.create", "promo_code.redeem", "overage.authorize"
  entityType: string;
  entityId: ID;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}
