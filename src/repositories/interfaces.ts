import type {
  Advantage,
  AuditLogEntry,
  CustomSubscriptionRequest,
  OverageAuthorization,
  Partner,
  Plan,
  PlanAdvantage,
  PromoCode,
  PromoRedemption,
  Subscription,
  UsageRecord,
} from "../types/domain.js";

/**
 * Ports (interfaces) de persistance. Implémentez-les avec Drizzle
 * (schéma de référence dans src/schema/drizzle.ts), Prisma, ou tout
 * autre store. Un store mémoire est fourni pour le dev/les tests.
 */

export interface AdvantageRepository {
  create(advantage: Advantage): Promise<Advantage>;
  update(key: string, patch: Partial<Advantage>): Promise<Advantage>;
  findById(id: string): Promise<Advantage | null>;
  findByKey(key: string): Promise<Advantage | null>;
  list(): Promise<Advantage[]>;
}

export interface PartnerRepository {
  create(partner: Partner): Promise<Partner>;
  update(id: string, patch: Partial<Partner>): Promise<Partner>;
  findById(id: string): Promise<Partner | null>;
  findBySlug(slug: string): Promise<Partner | null>;
  list(): Promise<Partner[]>;
}

export interface PlanRepository {
  create(plan: Plan): Promise<Plan>;
  update(id: string, patch: Partial<Plan>): Promise<Plan>;
  findById(id: string): Promise<Plan | null>;
  findBySlug(slug: string): Promise<Plan | null>;
  list(filter?: { kind?: Plan["kind"]; partnerId?: string; isPublic?: boolean }): Promise<Plan[]>;
}

export interface PlanAdvantageRepository {
  /** Remplace intégralement la sélection d'avantages d'un plan. */
  setForPlan(planId: string, advantages: PlanAdvantage[]): Promise<PlanAdvantage[]>;
  listForPlan(planId: string): Promise<PlanAdvantage[]>;
}

export interface SubscriptionRepository {
  create(sub: Subscription): Promise<Subscription>;
  update(id: string, patch: Partial<Subscription>): Promise<Subscription>;
  findById(id: string): Promise<Subscription | null>;
  findByExternalId(externalSubscriptionId: string): Promise<Subscription | null>;
  findActiveForUser(userId: string): Promise<Subscription | null>;
  listForUser(userId: string): Promise<Subscription[]>;
}

export interface CustomSubscriptionRequestRepository {
  create(req: CustomSubscriptionRequest): Promise<CustomSubscriptionRequest>;
  update(id: string, patch: Partial<CustomSubscriptionRequest>): Promise<CustomSubscriptionRequest>;
  findById(id: string): Promise<CustomSubscriptionRequest | null>;
  listPending(): Promise<CustomSubscriptionRequest[]>;
}

export interface PromoCodeRepository {
  create(promo: PromoCode): Promise<PromoCode>;
  update(id: string, patch: Partial<PromoCode>): Promise<PromoCode>;
  findById(id: string): Promise<PromoCode | null>;
  findByCode(code: string): Promise<PromoCode | null>;
  list(): Promise<PromoCode[]>;
  addRedemption(redemption: PromoRedemption): Promise<PromoRedemption>;
  countRedemptionsForUser(promoCodeId: string, userId: string): Promise<number>;
}

export interface UsageRepository {
  record(usage: UsageRecord): Promise<UsageRecord>;
  sumForPeriod(subscriptionId: string, advantageKey: string, periodStart: Date, periodEnd: Date): Promise<number>;
}

export interface OverageAuthorizationRepository {
  create(auth: OverageAuthorization): Promise<OverageAuthorization>;
  revoke(id: string): Promise<void>;
  findActive(subscriptionId: string, advantageKey: string): Promise<OverageAuthorization | null>;
  listForSubscription(subscriptionId: string): Promise<OverageAuthorization[]>;
}

export interface AuditLogRepository {
  append(entry: AuditLogEntry): Promise<AuditLogEntry>;
  listForEntity(entityType: string, entityId: string): Promise<AuditLogEntry[]>;
  listForActor(actorId: string): Promise<AuditLogEntry[]>;
  query(filter: { action?: string; entityType?: string; from?: Date; to?: Date }): Promise<AuditLogEntry[]>;
}

/** Agrégat pratique regroupant tous les repositories dont les services ont besoin. */
export interface SubscriptionStore {
  advantages: AdvantageRepository;
  partners: PartnerRepository;
  plans: PlanRepository;
  planAdvantages: PlanAdvantageRepository;
  subscriptions: SubscriptionRepository;
  customRequests: CustomSubscriptionRequestRepository;
  promoCodes: PromoCodeRepository;
  usage: UsageRepository;
  overageAuthorizations: OverageAuthorizationRepository;
  auditLogs: AuditLogRepository;
}
