import { randomUUID } from "node:crypto";
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
} from "../../types/domain.js";
import type {
  AdvantageRepository,
  AuditLogRepository,
  CustomSubscriptionRequestRepository,
  OverageAuthorizationRepository,
  PartnerRepository,
  PlanAdvantageRepository,
  PlanRepository,
  PromoCodeRepository,
  SubscriptionRepository,
  SubscriptionStore,
  UsageRepository,
} from "../interfaces.js";

function generateId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

class MemoryAdvantageRepository implements AdvantageRepository {
  private rows = new Map<string, Advantage>();
  async create(a: Omit<Advantage, "id">) {
    const id = generateId("adv");
    const row = { ...a, id } as Advantage;
    this.rows.set(id, row);
    return row;
  }
  async update(key: string, patch: Partial<Advantage>) {
    const current = await this.findByKey(key);
    if (!current) throw new Error(`Advantage with key ${key} not found`);
    const updated = { ...current, ...patch };
    this.rows.set(current.id, updated);
    return updated;
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findByKey(key: string) {
    return [...this.rows.values()].find((a) => a.key === key) ?? null;
  }
  async list() {
    return [...this.rows.values()];
  }
}

class MemoryPartnerRepository implements PartnerRepository {
  private rows = new Map<string, Partner>();
  async create(p: Omit<Partner, "id">) {
    const id = generateId("partner");
    const row = { ...p, id } as Partner;
    this.rows.set(id, row);
    return row;
  }
  async update(id: string, patch: Partial<Partner>) {
    const existing = this.rows.get(id);
    if (!existing) throw new Error(`Partner ${id} introuvable`);
    const updated = { ...existing, ...patch };
    this.rows.set(id, updated);
    return updated;
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findBySlug(slug: string) {
    return [...this.rows.values()].find((p) => p.slug === slug) ?? null;
  }
  async list() {
    return [...this.rows.values()];
  }
}

class MemoryPlanRepository implements PlanRepository {
  private rows = new Map<string, Plan>();
  async create(p: Omit<Plan, "id">) {
    const id = generateId("plan");
    const row = { ...p, id } as Plan;
    this.rows.set(id, row);
    return row;
  }
  async update(id: string, patch: Partial<Plan>) {
    const existing = this.rows.get(id);
    if (!existing) throw new Error(`Plan ${id} introuvable`);
    const updated = { ...existing, ...patch, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findBySlug(slug: string) {
    return [...this.rows.values()].find((p) => p.slug === slug) ?? null;
  }
  async list(filter?: { kind?: Plan["kind"]; partnerId?: string; isPublic?: boolean }) {
    return [...this.rows.values()].filter((p) => {
      if (filter?.kind && p.kind !== filter.kind) return false;
      if (filter?.partnerId && p.partnerId !== filter.partnerId) return false;
      if (filter?.isPublic !== undefined && p.isPublic !== filter.isPublic) return false;
      return true;
    });
  }
}

class MemoryPlanAdvantageRepository implements PlanAdvantageRepository {
  private byPlan = new Map<string, PlanAdvantage[]>();
  async setForPlan(planId: string, advantages: PlanAdvantage[]) {
    this.byPlan.set(planId, advantages);
    return advantages;
  }
  async listForPlan(planId: string) {
    return this.byPlan.get(planId) ?? [];
  }
}

class MemorySubscriptionRepository implements SubscriptionRepository {
  private rows = new Map<string, Subscription>();
  async create(s: Omit<Subscription, "id">) {
    const id = generateId("sub");
    const row = { ...s, id } as Subscription;
    this.rows.set(id, row);
    return row;
  }
  async update(id: string, patch: Partial<Subscription>) {
    const existing = this.rows.get(id);
    if (!existing) throw new Error(`Subscription ${id} introuvable`);
    const updated = { ...existing, ...patch, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findByExternalId(externalSubscriptionId: string) {
    return [...this.rows.values()].find((s) => s.externalSubscriptionId === externalSubscriptionId) ?? null;
  }
  async findActiveForUser(userId: string) {
    return (
      [...this.rows.values()]
        .filter((s) => s.userId === userId && (s.status === "active" || s.status === "trialing"))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
    );
  }
  async listForUser(userId: string) {
    return [...this.rows.values()].filter((s) => s.userId === userId);
  }
}

class MemoryCustomRequestRepository implements CustomSubscriptionRequestRepository {
  private rows = new Map<string, CustomSubscriptionRequest>();
  async create(r: Omit<CustomSubscriptionRequest, "id">) {
    const id = generateId("csr");
    const row = { ...r, id } as CustomSubscriptionRequest;
    this.rows.set(id, row);
    return row;
  }
  async update(id: string, patch: Partial<CustomSubscriptionRequest>) {
    const existing = this.rows.get(id);
    if (!existing) throw new Error(`CustomSubscriptionRequest ${id} introuvable`);
    const updated = { ...existing, ...patch, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async listPending() {
    return [...this.rows.values()].filter((r) => r.status === "pending");
  }
}

class MemoryPromoCodeRepository implements PromoCodeRepository {
  private rows = new Map<string, PromoCode>();
  private redemptions: PromoRedemption[] = [];
  async create(p: Omit<PromoCode, "id">) {
    const id = generateId("promo");
    const row = { ...p, id } as PromoCode;
    this.rows.set(id, row);
    return row;
  }
  async update(id: string, patch: Partial<PromoCode>) {
    const existing = this.rows.get(id);
    if (!existing) throw new Error(`PromoCode ${id} introuvable`);
    const updated = { ...existing, ...patch };
    this.rows.set(id, updated);
    return updated;
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findByCode(code: string) {
    const normalized = code.trim().toUpperCase();
    return [...this.rows.values()].find((p) => p.code === normalized) ?? null;
  }
  async list() {
    return [...this.rows.values()];
  }
  async addRedemption(r: Omit<PromoRedemption, "id">) {
    const id = generateId("redeem");
    const row = { ...r, id } as PromoRedemption;
    this.redemptions.push(row);
    return row;
  }
  async countRedemptionsForUser(promoCodeId: string, userId: string) {
    return this.redemptions.filter((r) => r.promoCodeId === promoCodeId && r.userId === userId).length;
  }
}

class MemoryUsageRepository implements UsageRepository {
  private rows: UsageRecord[] = [];
  async record(u: Omit<UsageRecord, "id">) {
    const id = generateId("usage");
    const row = { ...u, id } as UsageRecord;
    this.rows.push(row);
    return row;
  }
  async sumForPeriod(subscriptionId: string, advantageKey: string, periodStart: Date, periodEnd: Date) {
    return this.rows
      .filter(
        (r) =>
          r.subscriptionId === subscriptionId &&
          r.advantageKey === advantageKey &&
          r.periodStart.getTime() >= periodStart.getTime() &&
          r.periodEnd.getTime() <= periodEnd.getTime(),
      )
      .reduce((sum, r) => sum + r.quantity, 0);
  }
}

class MemoryOverageAuthorizationRepository implements OverageAuthorizationRepository {
  private rows = new Map<string, OverageAuthorization>();
  async create(a: Omit<OverageAuthorization, "id">) {
    const id = generateId("overage_auth");
    const row = { ...a, id } as OverageAuthorization;
    this.rows.set(id, row);
    return row;
  }
  async revoke(id: string) {
    const existing = this.rows.get(id);
    if (existing) this.rows.set(id, { ...existing, isActive: false });
  }
  async findActive(subscriptionId: string, advantageKey: string) {
    const now = Date.now();
    return (
      [...this.rows.values()]
        .filter(
          (a) =>
            a.subscriptionId === subscriptionId &&
            a.advantageKey === advantageKey &&
            a.isActive &&
            (!a.expiresAt || a.expiresAt.getTime() > now),
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
    );
  }
  async listForSubscription(subscriptionId: string) {
    return [...this.rows.values()].filter((a) => a.subscriptionId === subscriptionId);
  }
}

class MemoryAuditLogRepository implements AuditLogRepository {
  private rows: AuditLogEntry[] = [];
  async append(entry: Omit<AuditLogEntry, "id">) {
    const id = generateId("audit");
    const row = { ...entry, id } as AuditLogEntry;
    this.rows.push(row);
    return row;
  }
  async listForEntity(entityType: string, entityId: string) {
    return this.rows.filter((r) => r.entityType === entityType && r.entityId === entityId);
  }
  async listForActor(actorId: string) {
    return this.rows.filter((r) => r.actorId === actorId);
  }
  async query(filter: { action?: string; entityType?: string; from?: Date; to?: Date }) {
    return this.rows.filter((r) => {
      if (filter.action && r.action !== filter.action) return false;
      if (filter.entityType && r.entityType !== filter.entityType) return false;
      const createdDate = new Date(r.createdAt);
      if (filter.from && createdDate < filter.from) return false;
      if (filter.to && createdDate > filter.to) return false;
      return true;
    });
  }
}

/** Store 100% mémoire : pratique pour le dev, les démos et les tests unitaires. */
export function createMemoryStore(): SubscriptionStore {
  return {
    advantages: new MemoryAdvantageRepository(),
    partners: new MemoryPartnerRepository(),
    plans: new MemoryPlanRepository(),
    planAdvantages: new MemoryPlanAdvantageRepository(),
    subscriptions: new MemorySubscriptionRepository(),
    customRequests: new MemoryCustomRequestRepository(),
    promoCodes: new MemoryPromoCodeRepository(),
    usage: new MemoryUsageRepository(),
    overageAuthorizations: new MemoryOverageAuthorizationRepository(),
    auditLogs: new MemoryAuditLogRepository(),
  };
}
