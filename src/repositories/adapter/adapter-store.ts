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
import { serialize, deserialize, serializeMany, deserializeMany } from "../serialization.js";
type BetterAuthWhereOperator =
| "eq"
| "ne"
| "in"
| "contains"
| "starts_with"
| "ends_with"
| "gt"
| "gte"
| "lt"
| "lte";

type BetterAuthWhere ={
  field:string;
  value:string|boolean|string[];
  operator:BetterAuthWhereOperator;
}
type BetterAuthAdapter = {
  create: <T = any>(payload:{model: string, data: Record<string, any>}) => Promise<T>;
  findOne: <T = any>(opts: { model: string; where: BetterAuthWhere[]; select?: Record<string, boolean>; sortBy?: Record<string, 'asc' | 'desc'> }) => Promise<T | null>;
  findMany: <T = any>(opts: { model: string; where?: Record<string, any>; limit?: number; select?: Record<string, boolean>; offset?: number; sortBy?: Record<string, 'asc' | 'desc'>; join?: Record<string, boolean> }) => Promise<T[]>;
  update: <T = any>(opts: { model: string; where: BetterAuthWhere[]; data: Partial<T> }) => Promise<T>;
  delete: (opts: { model: string; where: BetterAuthWhere[] }) => Promise<void>;
  count: (opts: { model: string; where?: Record<string, any> }) => Promise<number>;
  incrementOne: <T = any>(opts: { model: string; where: BetterAuthWhere[]; increment: number; set?: Record<string, any> }) => Promise<T | null>;
  deleteMany: (opts: { model: string; where: BetterAuthWhere[] }) => Promise<number>;
};

// Helper pour convertir un objet simple en BetterAuthWhere[]
function toWhere(obj: Record<string, any>): BetterAuthWhere[] {
  return Object.entries(obj).map(([field, value]) => ({
    field,
    value,
    operator: "eq" as const,
  }));
}

class AdapterAdvantageRepository implements AdvantageRepository {
  constructor(private adapter: BetterAuthAdapter) {}

  async create(a: Advantage): Promise<Advantage> {
    const { id, ...rest } = { ...a, createdAt: new Date() };
    const data = serialize("advantage", rest);
    const result = await this.adapter.create<Advantage>({ model: "advantage", data });
    return deserialize("advantage", result);
  }

  async update(key: string, patch: Partial<Advantage>): Promise<Advantage> {
    const current = await this.findByKey(key);
    if (!current) throw new Error(`Advantage with key ${key} not found`);
    const data = serialize("advantage", patch);
    const result = await this.adapter.update<Advantage>({
      model: "advantage",
      where: toWhere({ id: current.id }),
      data,
    });
    return deserialize("advantage", result);
  }

  async findById(id: string): Promise<Advantage | null> {
    const result = await this.adapter.findOne<Advantage>({
      model: "advantage",
      where: toWhere({ id }),
    });
    return result ? deserialize("advantage", result) : null;
  }

  async findByKey(key: string): Promise<Advantage | null> {
    const result = await this.adapter.findOne<Advantage>({
      model: "advantage",
      where: toWhere({ key }),
    });
    return result ? deserialize("advantage", result) : null;
  }

  async list(): Promise<Advantage[]> {
    const results = await this.adapter.findMany<Advantage>({
      model: "advantage",
    });
    return deserializeMany("advantage", results);
  }
}

class AdapterPartnerRepository implements PartnerRepository {
  constructor(private adapter: BetterAuthAdapter) {}

  async create(p: Partner): Promise<Partner> {
    const { id, ...rest } = { ...p, createdAt: new Date() };
    const data = serialize("partner", rest);
    const result = await this.adapter.create<Partner>({ model: "partner", data });
    return deserialize("partner", result);
  }

  async update(id: string, patch: Partial<Partner>): Promise<Partner> {
    const data = serialize("partner", patch);
    const result = await this.adapter.update<Partner>({
      model: "partner",
      where: toWhere({ id }),
      data,
    });
    return deserialize("partner", result);
  }

  async findById(id: string): Promise<Partner | null> {
    const result = await this.adapter.findOne<Partner>({
      model: "partner",
      where: toWhere({ id }),
    });
    return result ? deserialize("partner", result) : null;
  }

  async findBySlug(slug: string): Promise<Partner | null> {
    const result = await this.adapter.findOne<Partner>({
      model: "partner",
      where: toWhere({ slug }),
    });
    return result ? deserialize("partner", result) : null;
  }

  async list(): Promise<Partner[]> {
    const results = await this.adapter.findMany<Partner>({
      model: "partner",
    });
    return deserializeMany("partner", results);
  }
}

class AdapterPlanRepository implements PlanRepository {
  constructor(private adapter: BetterAuthAdapter) {}

  async create(p: Plan): Promise<Plan> {
    const { id, ...rest } = { ...p, createdAt: new Date(), updatedAt: new Date() };
    const data = serialize("plan", rest);
    const result = await this.adapter.create<Plan>({ model: "plan", data });
    return deserialize("plan", result);
  }

  async update(id: string, patch: Partial<Plan>): Promise<Plan> {
    const data = serialize("plan", { ...patch, updatedAt: new Date() });
    const result = await this.adapter.update<Plan>({
      model: "plan",
      where: toWhere({ id }),
      data,
    });
    return deserialize("plan", result);
  }

  async findById(id: string): Promise<Plan | null> {
    const result = await this.adapter.findOne<Plan>({
      model: "plan",
      where: toWhere({ id }),
    });
    return result ? deserialize("plan", result) : null;
  }

  async findBySlug(slug: string): Promise<Plan | null> {
    const result = await this.adapter.findOne<Plan>({
      model: "plan",
      where: toWhere({ slug }),
    });
    return result ? deserialize("plan", result) : null;
  }

  async list(filter?: { kind?: Plan["kind"]; partnerId?: string; isPublic?: boolean }): Promise<Plan[]> {
    const where: any = {};
    if (filter?.kind) where.kind = filter.kind;
    if (filter?.partnerId) where.partnerId = filter.partnerId;
    if (filter?.isPublic !== undefined) where.isPublic = filter.isPublic;

    const results = await this.adapter.findMany<Plan>({
      model: "plan",
      where: Object.keys(where).length > 0 ? where : undefined,
    });
    return deserializeMany("plan", results);
  }
}

class AdapterPlanAdvantageRepository implements PlanAdvantageRepository {
  constructor(private adapter: BetterAuthAdapter) {}

  async setForPlan(planId: string, advantages: PlanAdvantage[]): Promise<PlanAdvantage[]> {
    await this.adapter.delete({
      model: "planAdvantage",
      where: toWhere({ planId }),
    });

    const created = [];
    for (const a of advantages) {
      const result = await this.adapter.create<PlanAdvantage>({ model: "planAdvantage", data: a });
      created.push(result);
    }
    return created;
  }

  async listForPlan(planId: string): Promise<PlanAdvantage[]> {
    return await this.adapter.findMany<PlanAdvantage>({
      model: "planAdvantage",
      where: { planId },
    });
  }
}

class AdapterSubscriptionRepository implements SubscriptionRepository {
  constructor(private adapter: BetterAuthAdapter) {}

  async create(sub: Subscription): Promise<Subscription> {
    const { id, ...rest } = { ...sub, createdAt: new Date(), updatedAt: new Date() };
    const data = serialize("subscription", rest);
    const result = await this.adapter.create<Subscription>({ model: "subscription", data });
    return deserialize("subscription", result);
  }

  async update(id: string, patch: Partial<Subscription>): Promise<Subscription> {
    const data = serialize("subscription", { ...patch, updatedAt: new Date() });
    const result = await this.adapter.update<Subscription>({
      model: "subscription",
      where: toWhere({ id }),
      data,
    });
    return deserialize("subscription", result);
  }

  async findById(id: string): Promise<Subscription | null> {
    const result = await this.adapter.findOne<Subscription>({
      model: "subscription",
      where: toWhere({ id }),
    });
    return result ? deserialize("subscription", result) : null;
  }

  async findByExternalId(externalSubscriptionId: string): Promise<Subscription | null> {
    const result = await this.adapter.findOne<Subscription>({
      model: "subscription",
      where: toWhere({ externalSubscriptionId }),
    });
    return result ? deserialize("subscription", result) : null;
  }

  async findActiveForUser(userId: string): Promise<Subscription | null> {
    const subs = await this.adapter.findMany<Subscription>({
      model: "subscription",
      where: { userId, status: "active" },
    });
    return subs[0] ? deserialize("subscription", subs[0]) : null;
  }

  async listForUser(userId: string): Promise<Subscription[]> {
    const results = await this.adapter.findMany<Subscription>({
      model: "subscription",
      where: { userId },
    });
    return deserializeMany("subscription", results);
  }
}

class AdapterCustomSubscriptionRequestRepository implements CustomSubscriptionRequestRepository {
  constructor(private adapter: BetterAuthAdapter) {}

  async create(req: CustomSubscriptionRequest): Promise<CustomSubscriptionRequest> {
    const { id, ...rest } = { ...req, createdAt: new Date(), updatedAt: new Date() };
    const data = serialize("customSubscriptionRequest", rest);
    const result = await this.adapter.create<CustomSubscriptionRequest>({ model: "customSubscriptionRequest", data });
    return deserialize("customSubscriptionRequest", result);
  }

  async update(id: string, patch: Partial<CustomSubscriptionRequest>): Promise<CustomSubscriptionRequest> {
    const data = serialize("customSubscriptionRequest", { ...patch, updatedAt: new Date() });
    const result = await this.adapter.update<CustomSubscriptionRequest>({
      model: "customSubscriptionRequest",
      where: toWhere({ id }),
      data,
    });
    return deserialize("customSubscriptionRequest", result);
  }

  async findById(id: string): Promise<CustomSubscriptionRequest | null> {
    const result = await this.adapter.findOne<CustomSubscriptionRequest>({
      model: "customSubscriptionRequest",
      where: toWhere({ id }),
    });
    return result ? deserialize("customSubscriptionRequest", result) : null;
  }

  async listPending(): Promise<CustomSubscriptionRequest[]> {
    const results = await this.adapter.findMany<CustomSubscriptionRequest>({
      model: "customSubscriptionRequest",
      where: { status: "pending" },
    });
    return deserializeMany("customSubscriptionRequest", results);
  }
}

class AdapterPromoCodeRepository implements PromoCodeRepository {
  constructor(private adapter: BetterAuthAdapter) {}

  async create(promo: PromoCode): Promise<PromoCode> {
    const { id, ...rest } = { ...promo, createdAt: new Date() };
    const data = serialize("promoCode", rest);
    const result = await this.adapter.create<PromoCode>({ model: "promoCode", data });
    return deserialize("promoCode", result);
  }

  async update(id: string, patch: Partial<PromoCode>): Promise<PromoCode> {
    const data = serialize("promoCode", patch);
    const result = await this.adapter.update<PromoCode>({
      model: "promoCode",
      where: toWhere({ id }),
      data,
    });
    return deserialize("promoCode", result);
  }

  async findById(id: string): Promise<PromoCode | null> {
    const result = await this.adapter.findOne<PromoCode>({
      model: "promoCode",
      where: toWhere({ id }),
    });
    return result ? deserialize("promoCode", result) : null;
  }

  async findByCode(code: string): Promise<PromoCode | null> {
    const result = await this.adapter.findOne<PromoCode>({
      model: "promoCode",
      where: toWhere({ code }),
    });
    return result ? deserialize("promoCode", result) : null;
  }

  async list(): Promise<PromoCode[]> {
    const results = await this.adapter.findMany<PromoCode>({
      model: "promoCode",
    });
    return deserializeMany("promoCode", results);
  }

  async addRedemption(redemption: PromoRedemption): Promise<PromoRedemption> {
    const { id, ...rest } = { ...redemption, redeemedAt: new Date() };
    const data = serialize("promoRedemption", rest);
    const result = await this.adapter.create<PromoRedemption>({ model: "promoRedemption", data });
    return deserialize("promoRedemption", result);
  }

  async countRedemptionsForUser(promoCodeId: string, userId: string): Promise<number> {
    return await this.adapter.count({
      model: "promoRedemption",
      where: { promoCodeId, userId },
    });
  }
}

class AdapterUsageRepository implements UsageRepository {
  constructor(private adapter: BetterAuthAdapter) {}

  async record(usage: UsageRecord): Promise<UsageRecord> {
    const { id, ...rest } = { ...usage, recordedAt: new Date() };
    const data = serialize("usageRecord", rest);
    const result = await this.adapter.create<UsageRecord>({ model: "usageRecord", data });
    return deserialize("usageRecord", result);
  }

  async sumForPeriod(subscriptionId: string, advantageKey: string, periodStart: Date, periodEnd: Date): Promise<number> {
    const records: UsageRecord[] = await this.adapter.findMany<UsageRecord>({
      model: "usageRecord",
      where: { subscriptionId, advantageKey },
    });

    const deserialized = deserializeMany("usageRecord", records);
    return deserialized
      .filter((r) => r.periodStart >= periodStart && r.periodEnd <= periodEnd)
      .reduce((sum, r) => sum + r.quantity, 0);
  }
}

class AdapterOverageAuthorizationRepository implements OverageAuthorizationRepository {
  constructor(private adapter: BetterAuthAdapter) {}

  async create(auth: OverageAuthorization): Promise<OverageAuthorization> {
    const { id, ...rest } = { ...auth, createdAt: new Date() };
    const data = serialize("overageAuthorization", rest);
    const result = await this.adapter.create<OverageAuthorization>({ model: "overageAuthorization", data });
    return deserialize("overageAuthorization", result);
  }

  async revoke(id: string): Promise<void> {
    const data = serialize("overageAuthorization", { isActive: false });
    await this.adapter.update<OverageAuthorization>({
      model: "overageAuthorization",
      where: toWhere({ id }),
      data,
    });
  }

  async findActive(subscriptionId: string, advantageKey: string): Promise<OverageAuthorization | null> {
    const auths: OverageAuthorization[] = await this.adapter.findMany<OverageAuthorization>({
      model: "overageAuthorization",
      where: { subscriptionId, advantageKey, isActive: true },
    });

    const deserialized = deserializeMany("overageAuthorization", auths);
    for (const auth of deserialized) {
      if (!auth.expiresAt || auth.expiresAt > new Date()) {
        return auth;
      }
    }
    return null;
  }

  async listForSubscription(subscriptionId: string): Promise<OverageAuthorization[]> {
    const results = await this.adapter.findMany<OverageAuthorization>({
      model: "overageAuthorization",
      where: { subscriptionId },
    });
    return deserializeMany("overageAuthorization", results);
  }
}

class AdapterAuditLogRepository implements AuditLogRepository {
  constructor(private adapter: BetterAuthAdapter) {}

  async append(entry: AuditLogEntry): Promise<AuditLogEntry> {
    const { id, ...rest } = entry;
    const data = serialize("subscriptionAudit", { ...rest, createdAt: new Date().toISOString() });
    const result = await this.adapter.create<AuditLogEntry>({ model: "subscriptionAudit", data });
    return deserialize("subscriptionAudit", result);
  }

  async listForEntity(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    const results = await this.adapter.findMany<AuditLogEntry>({
      model: "subscriptionAudit",
      where: { entityType, entityId },
    });
    return deserializeMany("subscriptionAudit", results);
  }

  async listForActor(actorId: string): Promise<AuditLogEntry[]> {
    const results = await this.adapter.findMany<AuditLogEntry>({
      model: "subscriptionAudit",
      where: { actorId },
    });
    return deserializeMany("subscriptionAudit", results);
  }

  async query(filter: { action?: string; entityType?: string; from?: Date; to?: Date }): Promise<AuditLogEntry[]> {
    const where: any = {};
    if (filter.action) where.action = filter.action;
    if (filter.entityType) where.entityType = filter.entityType;

    const results = await this.adapter.findMany<AuditLogEntry>({
      model: "subscriptionAudit",
      where: Object.keys(where).length > 0 ? where : undefined,
    });
    return deserializeMany("subscriptionAudit", results);
  }
}

export function createAdapterStore(adapter: BetterAuthAdapter): SubscriptionStore {
  return {
    advantages: new AdapterAdvantageRepository(adapter),
    partners: new AdapterPartnerRepository(adapter),
    plans: new AdapterPlanRepository(adapter),
    planAdvantages: new AdapterPlanAdvantageRepository(adapter),
    subscriptions: new AdapterSubscriptionRepository(adapter),
    customRequests: new AdapterCustomSubscriptionRequestRepository(adapter),
    promoCodes: new AdapterPromoCodeRepository(adapter),
    usage: new AdapterUsageRepository(adapter),
    overageAuthorizations: new AdapterOverageAuthorizationRepository(adapter),
    auditLogs: new AdapterAuditLogRepository(adapter),
  };
}
